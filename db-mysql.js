import mysql from 'mysql2/promise';
import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S1_RULES } from './s1-rules.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const name of ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
  if (!process.env[name]) throw new Error(`Konfigurasi MySQL ${name} belum diisi.`);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  dateStrings: true,
  decimalNumbers: true,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});
const context = new AsyncLocalStorage();

function mysqlSql(original, values) {
  let sql = original
    .replaceAll("c.code || '.%'", "CONCAT(c.code, '.%')")
    .replaceAll('COLLATE NOCASE', 'COLLATE utf8mb4_unicode_ci')
    .replace(/^INSERT OR IGNORE/i, 'INSERT IGNORE')
    .replace(/ON CONFLICT\(key\) DO UPDATE SET value=excluded\.value/i,
      'ON DUPLICATE KEY UPDATE value=VALUES(value)')
    .replace(/ON CONFLICT\(key\) DO UPDATE SET value='1'/i,
      "ON DUPLICATE KEY UPDATE value='1'")
    .replace(/ON CONFLICT\(indicator_id,evidence_id\) DO UPDATE SET mapping_note=excluded\.mapping_note/i,
      'ON DUPLICATE KEY UPDATE mapping_note=VALUES(mapping_note)')
    .replace(/ON CONFLICT\(indicator_id\) DO UPDATE SET body=excluded\.body,source_url=excluded\.source_url,updated_by=excluded\.updated_by,\s*version=narratives\.version\+1,updated_at=CURRENT_TIMESTAMP/i,
      'ON DUPLICATE KEY UPDATE body=VALUES(body),source_url=VALUES(source_url),updated_by=VALUES(updated_by),version=version+1,updated_at=CURRENT_TIMESTAMP')
    .replace(/settings\(key,/gi, 'settings(`key`,')
    .replace(/WHERE key=/gi, 'WHERE `key`=');
  if (/^SELECT id FROM evidence_links WHERE url=\?$/i.test(sql)) {
    sql = 'SELECT id FROM evidence_links WHERE url_hash=?';
    values = [crypto.createHash('sha256').update(values[0]).digest('hex')];
  }
  if (/^INSERT INTO evidence_links\(url,title,created_by\)/i.test(sql)) {
    sql = sql.replace('evidence_links(url,title,created_by) VALUES(?,?,?)',
      'evidence_links(url,url_hash,title,created_by) VALUES(?,?,?,?)');
    values = [values[0], crypto.createHash('sha256').update(values[0]).digest('hex'), ...values.slice(1)];
  }
  return [sql, values.map(value => value === undefined ? null : value)];
}

async function query(sql, values = []) {
  const [translated, params] = mysqlSql(sql, values);
  const connection = context.getStore()?.connection || pool;
  const [result] = await connection.query(translated, params);
  return result;
}

export const db = {
  prepare(sql) {
    return {
      async get(...values) { return (await query(sql, values))[0]; },
      async all(...values) { return await query(sql, values); },
      async run(...values) {
        const result = await query(sql, values);
        return { changes: result.affectedRows, lastInsertRowid: result.insertId };
      },
    };
  },
  async exec(sql) {
    const store = context.getStore();
    if (/^BEGIN(?: IMMEDIATE)?$/i.test(sql)) {
      if (!store || store.connection) throw new Error('Transaksi MySQL tidak memiliki konteks tersendiri.');
      store.connection = await pool.getConnection();
      try { await store.connection.beginTransaction(); }
      catch (error) { store.connection.release(); store.connection = null; throw error; }
      return;
    }
    if (/^(COMMIT|ROLLBACK)$/i.test(sql)) {
      if (!store?.connection) throw new Error('Transaksi MySQL tidak aktif.');
      const connection = store.connection;
      try {
        if (sql.toUpperCase() === 'COMMIT') await connection.commit();
        else await connection.rollback();
      } finally {
        store.connection = null;
        connection.release();
      }
      return;
    }
    await query(sql);
  },
  withContext(next, res) {
    context.run({ connection: null }, () => {
      const store = context.getStore();
      res.once('finish', () => {
        if (store.connection) {
          const connection = store.connection;
          store.connection = null;
          void connection.rollback().catch(error => console.error('Rollback MySQL gagal:', error))
            .finally(() => connection.release());
        }
      });
      next();
    });
  },
};

const criteria = [
  ['K1', 'Orientasi Strategis', ['Misi', 'Visi', 'Tujuan dan Sasaran', 'Strategi']],
  ['K2', 'Tata Pamong dan Tata Kelola', ['Tata Kelola', 'Tata Pamong']],
  ['K3', 'Pengelolaan Mahasiswa', ['Penerimaan Mahasiswa', 'Layanan Akademik Mahasiswa', 'Kinerja Akademik Mahasiswa', 'Kesejahteraan Mahasiswa', 'Pengembangan Karir Mahasiswa']],
  ['K4', 'Dosen dan Tenaga Kependidikan', ['Kecukupan dan Kualifikasi Dosen', 'Pengelolaan Dosen', 'Kecukupan dan Kualifikasi Tenaga Kependidikan', 'Pengelolaan Tenaga Kependidikan']],
  ['K5', 'Keuangan dan Sarana Prasarana', ['Keuangan', 'Sarana Prasarana']],
  ['K6', 'Pendidikan dan Pengajaran', ['Kurikulum', 'Jaminan Pembelajaran']],
  ['K7', 'Penelitian dan Pengabdian kepada Masyarakat', ['Penelitian', 'Pengabdian kepada Masyarakat']],
];

async function initialize() {
  const connection = await pool.getConnection();
  let locked = false;
  try {
    const [[lock]] = await connection.query("SELECT GET_LOCK('sisakprod-schema-init', 30) AS acquired");
    if (lock.acquired !== 1) throw new Error('Tidak dapat mengunci inisialisasi database.');
    locked = true;
    const schema = fs.readFileSync(path.join(here, 'mysql-schema.sql'), 'utf8')
      .replaceAll('ENGINE=InnoDB;', 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;');
    for (const statement of schema.split(';').map(x => x.trim()).filter(Boolean))
      await connection.query(statement);

    await connection.beginTransaction();
    try {
      const [[ruleCount]] = await connection.query('SELECT COUNT(*) AS n FROM eligibility_rules');
      if (ruleCount.n === 0) {
        for (const rule of S1_RULES) await connection.query(`INSERT INTO eligibility_rules
          (code,label,operator,threshold,unit,source_ref,category,metric,period_years)
          VALUES(?,?,?,?,?,?,?,?,?)`, [rule.code, rule.label, rule.operator, rule.threshold,
          rule.unit, rule.sourceRef, rule.category, rule.metric, rule.periodYears]);
      }
      const [[criterionCount]] = await connection.query('SELECT COUNT(*) AS n FROM criteria');
      if (criterionCount.n === 0) {
        await connection.query('INSERT INTO instrument_versions(name,source_url,expected_indicators,status) VALUES(?,?,?,?)',
          ['IAU LAMEMBA - Peraturan Nomor 2 Tahun 2025, DL-09 27 November 2025',
            'https://drive.google.com/file/d/1AFxMWSIRfPM_xw3UTtmWu4cYS9mI21es/view', 58, 'draft']);
        for (const [index, [code, title, dimensions]] of criteria.entries()) {
          const [result] = await connection.query('INSERT INTO criteria(code,title,sort_order) VALUES(?,?,?)',
            [code, title, index + 1]);
          for (const [dimensionIndex, dimension] of dimensions.entries())
            await connection.query('INSERT INTO dimensions(criterion_id,code,title,sort_order) VALUES(?,?,?,?)',
              [result.insertId, `${code}.D${dimensionIndex + 1}`, dimension, dimensionIndex + 1]);
        }
        const seed = JSON.parse(fs.readFileSync(path.join(here, 'data', 'seed-evidence.json'), 'utf8'));
        for (const item of seed) await connection.query(`INSERT INTO evidence_requests
          (code,title,source_unit,pic_label,validator_label,source_sheet) VALUES(?,?,?,?,?,?)`,
          [item.code, item.title, item.source_unit, item.pic_label, item.validator_label, item.source_sheet]);
      }
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
  } finally {
    if (locked) {
      try { await connection.query("SELECT RELEASE_LOCK('sisakprod-schema-init')"); }
      catch (error) { console.error('Pelepasan kunci inisialisasi MySQL gagal:', error); }
    }
    connection.release();
  }
}

export async function initializeDb() {
  await initialize();
}

export async function audit(actorId, action, entity, entityId, details = '') {
  await db.prepare('INSERT INTO audit_logs(actor_id,action,entity,entity_id,details) VALUES(?,?,?,?,?)')
    .run(actorId ?? null, action, entity, entityId ?? null, String(details).slice(0, 1000));
}
