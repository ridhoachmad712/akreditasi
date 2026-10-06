import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readIndicatorMaster, validateIndicatorMaster, importIndicatorMaster, validateImportedMapping } from '../instrument-master.js';

test('master DL-09 lengkap dan impor tidak menimpa pemetaan pengguna', async () => {
  const master = readIndicatorMaster();
  const summary = validateIndicatorMaster(master);
  assert.equal(summary.count, 58);
  assert.equal(summary.required, 8);
  assert.equal(Object.keys(summary.counts).length, 21);
  const wrong = structuredClone(master);
  wrong.indicators.find(x => x.code === 'K1.D1.01').isRequiredUnggul = false;
  assert.throws(() => validateIndicatorMaster(wrong), /Penanda syarat perlu/);

  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sisakprod-master-'));
  const previous = process.env.SISAKPROD_DATA_DIR;
  process.env.SISAKPROD_DATA_DIR = temp;
  try {
    const { db } = await import('../db.js');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM indicators').get().n, 0);
    const result = await importIndicatorMaster(db);
    assert.equal(result.count, 58);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM indicators WHERE is_required_unggul=1').get().n, 8);
    assert.equal(db.prepare('SELECT status FROM instrument_versions ORDER BY id DESC LIMIT 1').get().status, 'draft');
    assert.equal(db.prepare('SELECT source_sha256 FROM instrument_versions ORDER BY id DESC LIMIT 1').get().source_sha256, master.sourceSha256);
    assert.equal(await validateImportedMapping(db), true);
    db.prepare("UPDATE indicators SET is_required_unggul=0 WHERE code='K1.D1.01'").run();
    await assert.rejects(() => validateImportedMapping(db), /syarat perlu/);
    db.prepare("UPDATE indicators SET is_required_unggul=1 WHERE code='K1.D1.01'").run();
    await assert.rejects(() => importIndicatorMaster(db), /belum memiliki indikator/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM indicators').get().n, 58);
    db.close();
  } finally {
    if (previous === undefined) delete process.env.SISAKPROD_DATA_DIR;
    else process.env.SISAKPROD_DATA_DIR = previous;
    fs.rmSync(temp, { recursive:true, force:true, maxRetries:5, retryDelay:100 });
  }
});
