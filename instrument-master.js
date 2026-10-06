import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const masterPath = path.join(here, 'data', 'iau-indicators-2025.json');
const expectedByDimension = {
  'K1.D1':4,'K1.D2':5,'K1.D3':3,'K1.D4':3,
  'K2.D1':3,'K2.D2':2,
  'K3.D1':2,'K3.D2':2,'K3.D3':1,'K3.D4':3,'K3.D5':1,
  'K4.D1':3,'K4.D2':3,'K4.D3':2,'K4.D4':2,
  'K5.D1':2,'K5.D2':2,
  'K6.D1':4,'K6.D2':3,
  'K7.D1':4,'K7.D2':4,
};
const requiredCodes = new Set([
  'K1.D1.01','K1.D2.01','K1.D3.01','K1.D3.02',
  'K2.D1.03','K6.D1.01','K7.D1.03','K7.D2.03',
]);

export function readIndicatorMaster() {
  return JSON.parse(fs.readFileSync(masterPath, 'utf8'));
}

export function validateIndicatorMaster(master) {
  if (!master || master.expectedIndicators !== 58 || !Array.isArray(master.indicators) || master.indicators.length !== 58)
    throw new Error('Master harus berisi tepat 58 indikator.');
  if (!master.name || !/^https:\/\//.test(master.sourceUrl) || !/^[a-f0-9]{64}$/.test(master.sourceSha256))
    throw new Error('Identitas sumber instrumen tidak lengkap.');
  const codes = new Set();
  const counts = Object.fromEntries(Object.keys(expectedByDimension).map(code => [code, 0]));
  let required = 0;
  for (const item of master.indicators) {
    if (!item || !Object.hasOwn(counts, item.dimensionCode) ||
      !new RegExp(`^${item.dimensionCode.replace('.', '\\.')}\\.\\d{2}$`).test(item.code) ||
      codes.has(item.code) || typeof item.text !== 'string' || item.text.trim().length < 25 ||
      typeof item.sourceRef !== 'string' || !item.sourceRef.includes('DL-09') ||
      typeof item.isRequiredUnggul !== 'boolean')
      throw new Error(`Data indikator tidak valid: ${item?.code ?? '(tanpa kode)'}.`);
    codes.add(item.code);
    counts[item.dimensionCode]++;
    if (item.isRequiredUnggul !== requiredCodes.has(item.code))
      throw new Error(`Penanda syarat perlu tidak sesuai Tabel 7: ${item.code}.`);
    if (item.isRequiredUnggul) required++;
  }
  if (required !== 8 || Object.entries(counts).some(([code, count]) => count !== expectedByDimension[code]))
    throw new Error('Jumlah per dimensi atau 8 syarat perlu tidak sesuai DL-09.');
  return { count: master.indicators.length, required, counts };
}

export async function importIndicatorMaster(db, actorId = null) {
  const master = readIndicatorMaster();
  const summary = validateIndicatorMaster(master);
  await db.exec('BEGIN IMMEDIATE');
  try {
    const instrument = await db.prepare('SELECT * FROM instrument_versions ORDER BY id DESC LIMIT 1').get();
    if (!instrument || instrument.status !== 'draft' || instrument.expected_indicators !== 58 ||
      (await db.prepare('SELECT COUNT(*) AS n FROM indicators').get()).n !== 0)
      throw new Error('Impor hanya tersedia untuk instrumen draft yang belum memiliki indikator.');
    const dimensions = new Map((await db.prepare('SELECT code,id FROM dimensions').all()).map(x => [x.code,x.id]));
    if (dimensions.size !== 21 || Object.keys(expectedByDimension).some(code => !dimensions.has(code)))
      throw new Error('Struktur 21 dimensi tidak sesuai dengan master.');
    const insert = db.prepare(`INSERT INTO indicators
      (dimension_id,code,text,standard_type,source_ref,is_required_unggul)
      VALUES(?,?,?,?,?,?)`);
    for (const item of master.indicators) await insert.run(dimensions.get(item.dimensionCode),item.code,item.text,
      'Pelampauan SN-Dikti',item.sourceRef,item.isRequiredUnggul ? 1 : 0);
    await db.prepare('UPDATE instrument_versions SET name=?,source_url=?,source_sha256=? WHERE id=?')
      .run(master.name,master.sourceUrl,master.sourceSha256,instrument.id);
    await db.prepare('INSERT INTO audit_logs(actor_id,action,entity,entity_id,details) VALUES(?,?,?,?,?)')
      .run(actorId,'import','instrument',instrument.id,`DL-09 master: ${summary.count} indikator; sha256 ${master.sourceSha256}`);
    await db.exec('COMMIT');
    return summary;
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  }
}

export async function validateImportedMapping(db) {
  const master = readIndicatorMaster();
  validateIndicatorMaster(master);
  const dimensions = new Map((await db.prepare('SELECT id,code FROM dimensions').all()).map(x => [x.id,x.code]));
  const mapped = await db.prepare('SELECT code,dimension_id,text,source_ref,is_required_unggul FROM indicators').all();
  if (mapped.length !== 58) throw new Error('Pemetaan harus berisi tepat 58 indikator.');
  const expected = new Map(master.indicators.map(x => [x.code,x]));
  for (const row of mapped) {
    const item = expected.get(row.code);
    if (!item || dimensions.get(row.dimension_id) !== item.dimensionCode ||
      row.is_required_unggul !== (item.isRequiredUnggul ? 1 : 0) ||
      !row.text.trim() || !row.source_ref.trim())
      throw new Error(`Pemetaan ${row.code} tidak sesuai struktur atau syarat perlu DL-09.`);
    expected.delete(row.code);
  }
  if (expected.size) throw new Error('Ada indikator DL-09 yang belum dipetakan.');
  return true;
}
