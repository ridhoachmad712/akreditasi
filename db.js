import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S1_RULES } from './s1-rules.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.SISAKPROD_DATA_DIR || path.join(here, 'data');
fs.mkdirSync(dataDir, { recursive: true });
export const db = new DatabaseSync(path.join(dataDir, 'sisakprod.sqlite'), { timeout: 5000 });
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, username TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','team','validator','kaprodi','asesor')),
  active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS user_criteria (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  criterion_id INTEGER NOT NULL REFERENCES criteria(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id,criterion_id)
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS instrument_versions (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, source_url TEXT NOT NULL,
  source_sha256 TEXT NOT NULL DEFAULT '',
  expected_indicators INTEGER NOT NULL DEFAULT 58, status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS criteria (
  id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL, sort_order INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS dimensions (
  id INTEGER PRIMARY KEY, criterion_id INTEGER NOT NULL REFERENCES criteria(id),
  code TEXT NOT NULL UNIQUE, title TEXT NOT NULL, sort_order INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS indicators (
  id INTEGER PRIMARY KEY, dimension_id INTEGER NOT NULL REFERENCES dimensions(id),
  code TEXT NOT NULL UNIQUE, text TEXT NOT NULL, standard_type TEXT NOT NULL DEFAULT 'LAM',
  source_ref TEXT NOT NULL DEFAULT '', owner_user_id INTEGER REFERENCES users(id),
  is_required_unggul INTEGER NOT NULL DEFAULT 0 CHECK(is_required_unggul IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS evidence_requests (
  id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
  source_unit TEXT NOT NULL DEFAULT '', pic_label TEXT NOT NULL DEFAULT '',
  validator_label TEXT NOT NULL DEFAULT '', source_sheet TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'needed' CHECK(status IN ('needed','collecting','uploaded','verified','revision')),
  due_date TEXT, notes TEXT NOT NULL DEFAULT '', owner_user_id INTEGER REFERENCES users(id),
  validator_user_id INTEGER REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS evidence_files (
  id INTEGER PRIMARY KEY, evidence_id INTEGER NOT NULL REFERENCES evidence_requests(id) ON DELETE CASCADE,
  stored_name TEXT NOT NULL, original_name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL,
  version INTEGER NOT NULL, uploaded_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS evidence_links (
  id INTEGER PRIMARY KEY, url TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','verified','revision')),
  review_note TEXT NOT NULL DEFAULT '', created_by INTEGER NOT NULL REFERENCES users(id),
  reviewed_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
);
CREATE TABLE IF NOT EXISTS evidence_link_usage (
  evidence_id INTEGER NOT NULL REFERENCES evidence_requests(id) ON DELETE CASCADE,
  link_id INTEGER NOT NULL REFERENCES evidence_links(id) ON DELETE CASCADE,
  PRIMARY KEY(evidence_id,link_id)
);
CREATE TABLE IF NOT EXISTS indicator_evidence (
  indicator_id INTEGER NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  evidence_id INTEGER NOT NULL REFERENCES evidence_requests(id) ON DELETE CASCADE,
  mapping_note TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(indicator_id,evidence_id)
);
CREATE TABLE IF NOT EXISTS narratives (
  indicator_id INTEGER PRIMARY KEY REFERENCES indicators(id) ON DELETE CASCADE,
  body TEXT NOT NULL DEFAULT '', source_url TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1,
  updated_by INTEGER NOT NULL REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY, indicator_id INTEGER NOT NULL REFERENCES indicators(id) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK(result IN ('met','not_met')),
  rationale TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'submitted'
    CHECK(status IN ('submitted','revision','reviewed','approved')),
  proposed_by INTEGER NOT NULL REFERENCES users(id), reviewed_by INTEGER REFERENCES users(id),
  review_note TEXT NOT NULL DEFAULT '', approved_by INTEGER REFERENCES users(id),
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, reviewed_at TEXT, approved_at TEXT
);
CREATE TABLE IF NOT EXISTS assessment_drafts (
  indicator_id INTEGER PRIMARY KEY REFERENCES indicators(id) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK(result IN ('met','not_met')),
  rationale TEXT NOT NULL,
  saved_by INTEGER NOT NULL REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS eligibility_rules (
  id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, label TEXT NOT NULL,
  operator TEXT NOT NULL CHECK(operator IN ('>=','>','<=','<','=')),
  threshold REAL NOT NULL, value REAL, unit TEXT NOT NULL DEFAULT '',
  source_ref TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'eligibility'
    CHECK(category IN ('eligibility','qualification','publication')),
  metric TEXT NOT NULL DEFAULT 'count', period_years INTEGER NOT NULL DEFAULT 0,
  numerator INTEGER, denominator INTEGER, period_start TEXT, period_end TEXT,
  data_source TEXT NOT NULL DEFAULT '',
  evidence_id INTEGER REFERENCES evidence_requests(id),
  submitted_by INTEGER REFERENCES users(id), approved_by INTEGER REFERENCES users(id), approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY, actor_id INTEGER REFERENCES users(id), action TEXT NOT NULL,
  entity TEXT NOT NULL, entity_id INTEGER, details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_evidence_status ON evidence_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_criteria_criterion ON user_criteria(criterion_id);
CREATE INDEX IF NOT EXISTS idx_evidence_link_usage_link ON evidence_link_usage(link_id);
CREATE INDEX IF NOT EXISTS idx_assessments_indicator ON assessments(indicator_id,id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
`);

// Existing local databases are migrated in place without touching user data.
const userColumns = db.prepare('PRAGMA table_info(users)').all().map(x => x.name);
if (!userColumns.includes('username')) {
  const used = new Set();
  db.exec('BEGIN');
  try {
    db.exec('ALTER TABLE users ADD COLUMN username TEXT');
    const update = db.prepare('UPDATE users SET username=? WHERE id=?');
    for (const user of db.prepare('SELECT id,email FROM users ORDER BY id').all()) {
      const local = String(user.email).split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/^[^a-z0-9]+/, '');
      const base = (local.length >= 2 ? local : `user${user.id}`).slice(0, 32);
      let username = base;
      for (let suffix = 2; used.has(username); suffix++) {
        const end = `-${suffix}`;
        username = base.slice(0, 32 - end.length) + end;
      }
      update.run(username, user.id);
      used.add(username);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_nocase ON users(username COLLATE NOCASE)');
const indicatorColumns = db.prepare('PRAGMA table_info(indicators)').all().map(x => x.name);
if (!indicatorColumns.includes('is_required_unggul'))
  db.exec('ALTER TABLE indicators ADD COLUMN is_required_unggul INTEGER NOT NULL DEFAULT 0');
const mappingColumns = db.prepare('PRAGMA table_info(indicator_evidence)').all().map(x => x.name);
if (!mappingColumns.includes('mapping_note'))
  db.exec("ALTER TABLE indicator_evidence ADD COLUMN mapping_note TEXT NOT NULL DEFAULT ''");
const narrativeColumns = db.prepare('PRAGMA table_info(narratives)').all().map(x => x.name);
if (!narrativeColumns.includes('source_url'))
  db.exec("ALTER TABLE narratives ADD COLUMN source_url TEXT NOT NULL DEFAULT ''");
const ruleColumns = db.prepare('PRAGMA table_info(eligibility_rules)').all().map(x => x.name);
if (!ruleColumns.includes('category'))
  db.exec("ALTER TABLE eligibility_rules ADD COLUMN category TEXT NOT NULL DEFAULT 'eligibility'");
if (!ruleColumns.includes('submitted_by'))
  db.exec('ALTER TABLE eligibility_rules ADD COLUMN submitted_by INTEGER REFERENCES users(id)');
for (const [column, definition] of [
  ['metric',"TEXT NOT NULL DEFAULT 'count'"],['period_years','INTEGER NOT NULL DEFAULT 0'],
  ['numerator','INTEGER'],['denominator','INTEGER'],['period_start','TEXT'],['period_end','TEXT'],
  ['data_source',"TEXT NOT NULL DEFAULT ''"],
]) if (!ruleColumns.includes(column)) db.exec(`ALTER TABLE eligibility_rules ADD COLUMN ${column} ${definition}`);
const instrumentColumns = db.prepare('PRAGMA table_info(instrument_versions)').all().map(x => x.name);
if (!instrumentColumns.includes('source_sha256'))
  db.exec("ALTER TABLE instrument_versions ADD COLUMN source_sha256 TEXT NOT NULL DEFAULT ''");

if (db.prepare('SELECT COUNT(*) AS n FROM eligibility_rules').get().n === 0) {
  const insertRule = db.prepare(`INSERT INTO eligibility_rules
    (code,label,operator,threshold,unit,source_ref,category,metric,period_years)
    VALUES(?,?,?,?,?,?,?,?,?)`);
  db.exec('BEGIN');
  try {
    for (const rule of S1_RULES) insertRule.run(rule.code,rule.label,rule.operator,rule.threshold,
      rule.unit,rule.sourceRef,rule.category,rule.metric,rule.periodYears);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

const criteria = [
  ['K1', 'Orientasi Strategis', ['Misi', 'Visi', 'Tujuan dan Sasaran', 'Strategi']],
  ['K2', 'Tata Pamong dan Tata Kelola', ['Tata Kelola', 'Tata Pamong']],
  ['K3', 'Pengelolaan Mahasiswa', ['Penerimaan Mahasiswa', 'Layanan Akademik Mahasiswa', 'Kinerja Akademik Mahasiswa', 'Kesejahteraan Mahasiswa', 'Pengembangan Karir Mahasiswa']],
  ['K4', 'Dosen dan Tenaga Kependidikan', ['Kecukupan dan Kualifikasi Dosen', 'Pengelolaan Dosen', 'Kecukupan dan Kualifikasi Tenaga Kependidikan', 'Pengelolaan Tenaga Kependidikan']],
  ['K5', 'Keuangan dan Sarana Prasarana', ['Keuangan', 'Sarana Prasarana']],
  ['K6', 'Pendidikan dan Pengajaran', ['Kurikulum', 'Jaminan Pembelajaran']],
  ['K7', 'Penelitian dan Pengabdian kepada Masyarakat', ['Penelitian', 'Pengabdian kepada Masyarakat']],
];

if (db.prepare('SELECT COUNT(*) AS n FROM criteria').get().n === 0) {
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO instrument_versions(name,source_url,expected_indicators,status) VALUES(?,?,?,?)')
      .run('IAU LAMEMBA - Peraturan Nomor 2 Tahun 2025, DL-09 27 November 2025',
        'https://drive.google.com/file/d/1AFxMWSIRfPM_xw3UTtmWu4cYS9mI21es/view',
        58, 'draft');
    const addCriterion = db.prepare('INSERT INTO criteria(code,title,sort_order) VALUES(?,?,?)');
    const addDimension = db.prepare('INSERT INTO dimensions(criterion_id,code,title,sort_order) VALUES(?,?,?,?)');
    criteria.forEach(([code, title, dims], ci) => {
      const criterionId = Number(addCriterion.run(code, title, ci + 1).lastInsertRowid);
      dims.forEach((dim, di) => addDimension.run(criterionId, `${code}.D${di + 1}`, dim, di + 1));
    });
    const seed = JSON.parse(fs.readFileSync(path.join(here, 'data', 'seed-evidence.json'), 'utf8'));
    const addEvidence = db.prepare(`INSERT INTO evidence_requests
      (code,title,source_unit,pic_label,validator_label,source_sheet)
      VALUES(?,?,?,?,?,?)`);
    seed.forEach(e => addEvidence.run(e.code, e.title, e.source_unit, e.pic_label, e.validator_label, e.source_sheet));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// This seed was a draft. Upgrade only untouched draft instruments; confirmed
// mappings and user-created versions keep their original provenance.
db.prepare(`UPDATE instrument_versions SET name=?,source_url=? WHERE status='draft'
  AND name='IAU LAMEMBA 2025 - pemetaan awal'
  AND (SELECT COUNT(*) FROM indicators)=0`).run(
  'IAU LAMEMBA - Peraturan Nomor 2 Tahun 2025, DL-09 27 November 2025',
  'https://drive.google.com/file/d/1AFxMWSIRfPM_xw3UTtmWu4cYS9mI21es/view');

export function audit(actorId, action, entity, entityId, details = '') {
  db.prepare('INSERT INTO audit_logs(actor_id,action,entity,entity_id,details) VALUES(?,?,?,?,?)')
    .run(actorId ?? null, action, entity, entityId ?? null, String(details).slice(0, 1000));
}
