import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectUnggul } from './simulation.js';
import { importIndicatorMaster, validateImportedMapping } from './instrument-master.js';
import { S1_RULES, periodFromEnd } from './s1-rules.js';
import { buildAssessorPackage, streamAssessorZip } from './assessor-package.js';

async function start() {
const dbDriver = process.env.DB_DRIVER || (process.env.NODE_ENV === 'production' ? '' : 'sqlite');
if (!['sqlite', 'mysql'].includes(dbDriver)) throw new Error('Atur DB_DRIVER=mysql untuk produksi atau sqlite untuk pengembangan.');
const database = await import(dbDriver === 'mysql' ? './db-mysql.js' : './db.js');
if (dbDriver === 'mysql') await database.initializeDb();
const { db, audit } = database;

const here = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(process.env.SISAKPROD_UPLOAD_DIR || path.join(here, 'uploads'));
if (process.env.NODE_ENV === 'production' && dbDriver === 'mysql' &&
    (!process.env.SISAKPROD_UPLOAD_DIR || !path.isAbsolute(process.env.SISAKPROD_UPLOAD_DIR) ||
      uploadDir === here || uploadDir.startsWith(here + path.sep)))
  throw new Error('SISAKPROD_UPLOAD_DIR harus berupa folder tetap di luar folder aplikasi saat memakai MySQL di produksi.');
fs.mkdirSync(uploadDir, { recursive: true });
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
if (db.withContext) app.use((req, res, next) => db.withContext(next, res));
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    const host = req.get('host');
    if (origin && host && new URL(origin).host !== host) return res.status(403).json({ error: 'Asal permintaan tidak diizinkan.' });
  }
  next();
});

const fail = (res, code, message) => res.status(code).json({ error: message });
const get = (sql, ...args) => db.prepare(sql).get(...args);
const all = (sql, ...args) => db.prepare(sql).all(...args);
const run = (sql, ...args) => db.prepare(sql).run(...args);
const id = value => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const usernameValue = value => String(value ?? '').trim().toLowerCase();
const validUsername = value => /^[a-z0-9][a-z0-9._-]{1,31}$/.test(value);
const defaultAppearance = Object.freeze({
  appName: 'SISAKPROD', subtitle: 'S1 Manajemen · FEB UNM',
  footerText: 'Program Studi S1 Manajemen · FEB UNM',
  loginTitle: 'Login ke aplikasi', loginHeadline: 'Ruang kerja Akreditasi Unggul',
  loginDescription: 'Dokumen, narasi, dan bukti terhubung dalam satu ruang kerja.',
  loginIntro: '', loginUsernameLabel: 'Username', loginPasswordLabel: 'Kata sandi',
  loginButtonText: 'Masuk', loginBackgroundPosition: 'center',
  accentColor: '#2563eb', font: 'inter', logoFile: '', loginBackgroundFile: '', updatedAt: ''
});
const allowedFonts = new Set(['inter','open-sans','system','segoe','arial']);
async function appearance() {
  const saved = (await get("SELECT value FROM settings WHERE key='app_appearance'"))?.value || '{}';
  try {
    const value = { ...defaultAppearance, ...JSON.parse(saved) };
    if (value.loginTitle === 'Dokumen akreditasi, tertata dalam satu ruang kerja.') value.loginTitle = defaultAppearance.loginTitle;
    if (value.loginDescription === 'Susun narasi, hubungkan bukti, dan ikuti proses pemeriksaan untuk persiapan Akreditasi Unggul.') value.loginDescription = defaultAppearance.loginDescription;
    return value;
  }
  catch { return { ...defaultAppearance }; }
}
async function saveAppearance(value) {
  await run("INSERT INTO settings(key,value) VALUES('app_appearance',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", JSON.stringify(value));
}
async function publicAppearance() {
  const value = await appearance();
  const { logoFile, loginBackgroundFile, ...publicValue } = value;
  return { ...publicValue,
    logoUrl: logoFile ? `/api/appearance/logo?v=${encodeURIComponent(value.updatedAt)}` : '',
    loginBackgroundUrl: loginBackgroundFile ? `/api/appearance/login-background?v=${encodeURIComponent(value.updatedAt)}` : '' };
}
const nowPlusDays = days => new Date(Date.now() + days * 86400000).toISOString();
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');
const hashPassword = password => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
};
const verifyPassword = (password, stored) => {
  const [salt, expected] = stored.split(':');
  const actual = crypto.scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
};
const userPublic = user => user && ({ id: user.id, name: user.name, username: user.username, role: user.role });

async function sessionUser(req) {
  const cookie = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('sid='));
  if (!cookie) return null;
  const token = cookie.slice(4);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return await get(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`, hashToken(token), new Date().toISOString());
}
async function loginSession(res, user) {
  const token = crypto.randomBytes(32).toString('hex');
  await run('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)', hashToken(token), user.id, nowPlusDays(7));
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 7 * 86400000 });
}
async function auth(req, res, next) {
  req.user = await sessionUser(req);
  if (!req.user) return fail(res, 401, 'Silakan masuk terlebih dahulu.');
  if (req.user.role === 'asesor' && (await get("SELECT value FROM settings WHERE key='assessor_access'"))?.value !== '1')
    return fail(res, 403, 'Akses asesor belum dibuka.');
  next();
}
function roles(...allowed) {
  return (req, res, next) => allowed.includes(req.user.role) ? next() : fail(res, 403, 'Anda tidak memiliki izin untuk tindakan ini.');
}
async function assignedCriterionIds(userId) {
  return new Set((await all('SELECT criterion_id FROM user_criteria WHERE user_id=?',userId)).map(row=>row.criterion_id));
}
async function teamCanAccessIndicator(req, indicatorId) {
  return req.user.role !== 'team' || !!(await get(`SELECT 1 FROM indicators i JOIN dimensions d ON d.id=i.dimension_id
    JOIN user_criteria uc ON uc.criterion_id=d.criterion_id WHERE i.id=? AND uc.user_id=?`,indicatorId,req.user.id));
}
async function teamCanAccessEvidence(req, evidenceId) {
  return req.user.role !== 'team' || !!(await get(`SELECT 1 FROM evidence_requests e JOIN criteria c ON e.code LIKE c.code || '.%'
    JOIN user_criteria uc ON uc.criterion_id=c.id WHERE e.id=? AND uc.user_id=?`,evidenceId,req.user.id));
}
async function teamCanCreateEvidence(req, code) {
  return req.user.role !== 'team' || !!(await get(`SELECT 1 FROM criteria c JOIN user_criteria uc ON uc.criterion_id=c.id
    WHERE ? LIKE c.code || '.%' AND uc.user_id=?`,code,req.user.id));
}
async function teamEvidenceWrite(req, res, next) {
  return (await teamCanAccessEvidence(req,id(req.params.id))) ? next() : fail(res,403,'Bukti ini di luar kriteria tugas Anda.');
}
async function latestAssessment(indicatorId) {
  return await get(`SELECT a.*, p.name AS proposer_name, r.name AS reviewer_name, k.name AS approver_name
    FROM assessments a JOIN users p ON p.id=a.proposed_by
    LEFT JOIN users r ON r.id=a.reviewed_by LEFT JOIN users k ON k.id=a.approved_by
    WHERE a.indicator_id=? ORDER BY a.id DESC LIMIT 1`, indicatorId);
}
async function assessorIndicatorIds() {
  return (await all(`SELECT i.id FROM indicators i WHERE
    (SELECT status FROM assessments WHERE indicator_id=i.id ORDER BY id DESC LIMIT 1)='approved'`)).map(x => x.id);
}
async function assessorCanSeeEvidence(evidenceId) {
  return !!(await get(`SELECT 1 FROM indicator_evidence ie WHERE ie.evidence_id=? AND
    (SELECT status FROM assessments WHERE indicator_id=ie.indicator_id ORDER BY id DESC LIMIT 1)='approved' LIMIT 1`, evidenceId));
}
async function invalidateIndicator(indicatorId, actorId, reason) {
  const changed = await run("UPDATE assessments SET status='revision' WHERE id=(SELECT id FROM assessments WHERE indicator_id=? ORDER BY id DESC LIMIT 1) AND status IN ('submitted','reviewed','approved')", indicatorId);
  if (changed.changes) await audit(actorId, 'approval_invalidated', 'indicator', indicatorId, reason);
}
async function invalidateEligibilityForEvidence(evidenceId, actorId) {
  const changed = await run('UPDATE eligibility_rules SET approved_by=NULL,approved_at=NULL WHERE evidence_id=? AND approved_by IS NOT NULL', evidenceId);
  if (changed.changes) await audit(actorId, 'approval_invalidated', 'eligibility', evidenceId, 'bukti berubah');
}
async function sourceChanged(evidenceId, actorId, reason) {
  await run("UPDATE evidence_requests SET status='revision',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='verified'", evidenceId);
  for (const row of await all('SELECT indicator_id FROM indicator_evidence WHERE evidence_id=?', evidenceId))
    await invalidateIndicator(row.indicator_id, actorId, reason);
  await invalidateEligibilityForEvidence(evidenceId, actorId);
}
function httpsUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.href.length > 2000) return null;
    return url.href;
  } catch { return null; }
}
async function attachEvidenceLink(evidenceId, url, title, actorId) {
  let link = await get('SELECT id FROM evidence_links WHERE url=?', url);
  const reused = !!link;
  if (!link) link = { id:Number((await run('INSERT INTO evidence_links(url,title,created_by) VALUES(?,?,?)', url,title,actorId)).lastInsertRowid) };
  const added = await run('INSERT OR IGNORE INTO evidence_link_usage(evidence_id,link_id) VALUES(?,?)', evidenceId,link.id);
  if (added.changes) {
    await sourceChanged(evidenceId, actorId, 'tautan sumber berubah');
    await run("UPDATE evidence_requests SET status='uploaded',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('needed','collecting')", evidenceId);
    await audit(actorId, 'link', 'evidence_link', link.id, `evidence ${evidenceId}`);
  }
  return {id:link.id,reused,added:!!added.changes};
}
async function indicatorReadiness(indicatorId) {
  const narrative = await get('SELECT body,source_url FROM narratives WHERE indicator_id=?', indicatorId);
  const evidence = await all(`SELECT e.id,e.status,
    (SELECT COUNT(*) FROM evidence_files f WHERE f.evidence_id=e.id) AS file_count,
    (SELECT COUNT(*) FROM evidence_link_usage elu WHERE elu.evidence_id=e.id) AS link_count
    FROM indicator_evidence ie JOIN evidence_requests e ON e.id=ie.evidence_id WHERE ie.indicator_id=?`, indicatorId);
  return { narrative: !!(clean(narrative?.body) || narrative?.source_url), evidence: evidence.length>0,
    sources: evidence.length>0 && evidence.every(e=>e.file_count+e.link_count>0),
    verified: evidence.length>0 && evidence.every(e=>e.status==='verified') };
}

app.get('/api/setup-status', async (req, res) => res.json({ needsSetup: (await get('SELECT COUNT(*) AS n FROM users')).n === 0 }));
app.get('/api/appearance', async (_req, res) => res.json(await publicAppearance()));
app.get('/api/appearance/logo', async (_req, res) => {
  const file = (await appearance()).logoFile;
  if (!/^brand-[a-f0-9-]+\.(png|jpg|webp)$/.test(file)) return fail(res, 404, 'Logo belum tersedia.');
  const stored = path.join(uploadDir, file);
  if (!fs.existsSync(stored)) return fail(res, 404, 'Logo tidak ditemukan.');
  res.set('Cache-Control', 'no-store').sendFile(stored);
});
app.get('/api/appearance/login-background', async (_req, res) => {
  const file = (await appearance()).loginBackgroundFile;
  if (!/^login-bg-[a-f0-9-]+\.(png|jpg|webp)$/.test(file)) return fail(res,404,'Gambar latar belum tersedia.');
  const stored = path.join(uploadDir,file);
  if (!fs.existsSync(stored)) return fail(res,404,'Gambar latar tidak ditemukan.');
  res.set('Cache-Control','no-store').sendFile(stored);
});
app.post('/api/setup', async (req, res) => {
  if ((await get('SELECT COUNT(*) AS n FROM users')).n !== 0) return fail(res, 409, 'Pengaturan awal sudah selesai.');
  const name = clean(req.body.name, 100), username = usernameValue(req.body.username), password = String(req.body.password || '');
  if (!name || !validUsername(username) || password.length < 8) return fail(res, 400, 'Isi nama, username 2–32 karakter (huruf, angka, titik, garis bawah, atau tanda hubung), dan kata sandi minimal 8 karakter.');
  // The legacy email column remains required in existing databases; new accounts store their username there too.
  const userId = Number((await run('INSERT INTO users(name,username,email,password_hash,role) VALUES(?,?,?,?,?)', name, username, username, hashPassword(password), 'admin')).lastInsertRowid);
  await audit(userId, 'setup', 'user', userId);
  const user = await get('SELECT * FROM users WHERE id=?', userId);
  await loginSession(res, user);
  res.status(201).json({ user: userPublic(user) });
});
app.post('/api/login', async (req, res) => {
  const username = usernameValue(req.body.username);
  const user = await get('SELECT * FROM users WHERE username=? COLLATE NOCASE AND active=1', username);
  if (!user || !verifyPassword(String(req.body.password || ''), user.password_hash)) return fail(res, 401, 'Username atau kata sandi salah.');
  await loginSession(res, user);
  await audit(user.id, 'login', 'user', user.id);
  res.json({ user: userPublic(user) });
});
app.post('/api/logout', auth, async (req, res) => {
  const cookie = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith('sid='));
  if (cookie) await run('DELETE FROM sessions WHERE token_hash=?', hashToken(cookie.slice(4)));
  res.clearCookie('sid', { path: '/' });
  res.json({ ok: true });
});
app.get('/api/me', auth, (req, res) => res.json({ user: userPublic(req.user) }));

app.use('/api', auth);
app.put('/api/appearance', roles('admin'), async (req, res) => {
  const fields = ['appName','subtitle','footerText','loginTitle','loginHeadline','loginDescription',
    'loginIntro','loginUsernameLabel','loginPasswordLabel','loginButtonText'];
  const limits = { appName:60, subtitle:100, footerText:180, loginTitle:160, loginHeadline:120,
    loginDescription:320, loginIntro:180, loginUsernameLabel:40, loginPasswordLabel:40, loginButtonText:40 };
  const next = { ...(await appearance()) };
  for (const field of fields) {
    if (!Object.hasOwn(req.body || {},field) && !['appName','subtitle','footerText','loginTitle','loginDescription'].includes(field)) continue;
    if (typeof req.body?.[field] !== 'string' || req.body[field].trim().length > limits[field])
      return fail(res,400,`Isian ${field} tidak valid atau terlalu panjang.`);
    next[field] = req.body[field].trim();
  }
  if (!next.appName || !next.subtitle || !next.loginTitle || !next.loginHeadline ||
      !next.loginUsernameLabel || !next.loginPasswordLabel || !next.loginButtonText)
    return fail(res,400,'Nama aplikasi dan teks utama halaman login wajib diisi.');
  if (!['center','top','bottom','left','right'].includes(req.body?.loginBackgroundPosition ?? next.loginBackgroundPosition))
    return fail(res,400,'Posisi gambar latar tidak dikenal.');
  next.loginBackgroundPosition = req.body.loginBackgroundPosition ?? next.loginBackgroundPosition;
  const color = String(req.body?.accentColor || '').toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(color)) return fail(res,400,'Warna utama harus menggunakan kode warna enam digit.');
  const channels = [1,3,5].map(index => parseInt(color.slice(index,index+2),16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4);
  if (0.2126*channels[0]+0.7152*channels[1]+0.0722*channels[2] > 0.183)
    return fail(res,400,'Pilih warna utama yang lebih gelap agar teks putih tetap terbaca.');
  if (!allowedFonts.has(req.body?.font)) return fail(res,400,'Pilihan font tidak dikenal.');
  next.accentColor = color;
  next.font = req.body.font;
  next.updatedAt = new Date().toISOString();
  await saveAppearance(next);
  await audit(req.user.id,'update','settings',null,'identitas aplikasi');
  res.json(await publicAppearance());
});
const logoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
app.post('/api/appearance/logo', roles('admin'), logoUpload.single('logo'), async (req, res) => {
  const file = req.file;
  if (!file) return fail(res,400,'Pilih berkas logo.');
  const bytes = file.buffer;
  const format = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png'
    : bytes.length>=3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255 ? 'jpg'
    : bytes.length>=12 && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP' ? 'webp' : '';
  if (!format) return fail(res,400,'Logo harus berupa PNG, JPG, atau WebP.');
  const previous = await appearance();
  const logoFile = `brand-${crypto.randomUUID()}.${format}`;
  fs.writeFileSync(path.join(uploadDir,logoFile),bytes,{flag:'wx'});
  await saveAppearance({ ...previous, logoFile, updatedAt:new Date().toISOString() });
  if (previous.logoFile && /^brand-[a-f0-9-]+\.(png|jpg|webp)$/.test(previous.logoFile))
    fs.rmSync(path.join(uploadDir,previous.logoFile),{force:true});
  await audit(req.user.id,'upload','settings',null,'logo aplikasi');
  res.status(201).json(await publicAppearance());
});
app.delete('/api/appearance/logo', roles('admin'), async (req, res) => {
  const previous = await appearance();
  await saveAppearance({ ...previous, logoFile:'', updatedAt:new Date().toISOString() });
  if (previous.logoFile && /^brand-[a-f0-9-]+\.(png|jpg|webp)$/.test(previous.logoFile))
    fs.rmSync(path.join(uploadDir,previous.logoFile),{force:true});
  await audit(req.user.id,'delete','settings',null,'logo aplikasi');
  res.json(await publicAppearance());
});
const backgroundUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
app.post('/api/appearance/login-background', roles('admin'), backgroundUpload.single('background'), async (req, res) => {
  const file = req.file;
  if (!file) return fail(res,400,'Pilih gambar latar.');
  const bytes = file.buffer;
  const format = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png'
    : bytes.length>=3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255 ? 'jpg'
    : bytes.length>=12 && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP' ? 'webp' : '';
  if (!format) return fail(res,400,'Gambar latar harus berupa PNG, JPG, atau WebP.');
  const previous = await appearance();
  const loginBackgroundFile = `login-bg-${crypto.randomUUID()}.${format}`;
  const stored = path.join(uploadDir,loginBackgroundFile);
  fs.writeFileSync(stored,bytes,{flag:'wx'});
  try { await saveAppearance({ ...previous, loginBackgroundFile, updatedAt:new Date().toISOString() }); }
  catch (error) { fs.rmSync(stored,{force:true}); throw error; }
  if (previous.loginBackgroundFile && /^login-bg-[a-f0-9-]+\.(png|jpg|webp)$/.test(previous.loginBackgroundFile))
    fs.rmSync(path.join(uploadDir,previous.loginBackgroundFile),{force:true});
  await audit(req.user.id,'upload','settings',null,'gambar latar login');
  res.status(201).json(await publicAppearance());
});
app.delete('/api/appearance/login-background', roles('admin'), async (req, res) => {
  const previous = await appearance();
  await saveAppearance({ ...previous, loginBackgroundFile:'', updatedAt:new Date().toISOString() });
  if (previous.loginBackgroundFile && /^login-bg-[a-f0-9-]+\.(png|jpg|webp)$/.test(previous.loginBackgroundFile))
    fs.rmSync(path.join(uploadDir,previous.loginBackgroundFile),{force:true});
  await audit(req.user.id,'delete','settings',null,'gambar latar login');
  res.json(await publicAppearance());
});
app.get('/api/overview', async (req, res) => {
  const assessor = req.user.role === 'asesor';
  const team = req.user.role === 'team';
  const evidence = assessor ? await get(`SELECT COUNT(DISTINCT e.id) AS total,
    COUNT(DISTINCT CASE WHEN e.status='verified' THEN e.id END) AS verified
    FROM evidence_requests e JOIN indicator_evidence ie ON ie.evidence_id=e.id
    WHERE (SELECT status FROM assessments WHERE indicator_id=ie.indicator_id ORDER BY id DESC LIMIT 1)='approved'`)
    : team ? await get(`SELECT COUNT(*) AS total,SUM(CASE WHEN e.status='verified' THEN 1 ELSE 0 END) AS verified
      FROM evidence_requests e JOIN criteria c ON e.code LIKE c.code || '.%'
      JOIN user_criteria uc ON uc.criterion_id=c.id WHERE uc.user_id=?`,req.user.id)
    : await get("SELECT COUNT(*) AS total, SUM(CASE WHEN status='verified' THEN 1 ELSE 0 END) AS verified FROM evidence_requests");
  const summary = assessor ? await get(`SELECT COUNT(*) AS total, COUNT(*) AS approved FROM indicators i WHERE
    (SELECT status FROM assessments WHERE indicator_id=i.id ORDER BY id DESC LIMIT 1)='approved'`)
    : team ? await get(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN (SELECT status FROM assessments WHERE indicator_id=i.id ORDER BY id DESC LIMIT 1)='approved' THEN 1 ELSE 0 END) AS approved
      FROM indicators i JOIN dimensions d ON d.id=i.dimension_id
      JOIN user_criteria uc ON uc.criterion_id=d.criterion_id WHERE uc.user_id=?`,req.user.id)
    : await get(`SELECT COUNT(*) AS total,
    SUM(CASE WHEN (SELECT status FROM assessments WHERE indicator_id=i.id ORDER BY id DESC LIMIT 1)='approved' THEN 1 ELSE 0 END) AS approved
    FROM indicators i`);
  const instrument = await get('SELECT * FROM instrument_versions ORDER BY id DESC LIMIT 1');
  res.json({ evidence, indicators: summary, instrument,
    pendingReviews: assessor ? 0 : team ? (await get(`SELECT COUNT(*) AS n FROM assessments a JOIN indicators i ON i.id=a.indicator_id
      JOIN dimensions d ON d.id=i.dimension_id JOIN user_criteria uc ON uc.criterion_id=d.criterion_id
      WHERE uc.user_id=? AND a.status IN ('submitted','reviewed')`,req.user.id)).n
      : (await get("SELECT COUNT(*) AS n FROM assessments WHERE status IN ('submitted','reviewed')")).n,
    assessorAccess: (await get("SELECT value FROM settings WHERE key='assessor_access'"))?.value === '1' });
});
app.get('/api/criteria', async (req, res) => {
  const allowed = req.user.role === 'asesor' ? new Set(await assessorIndicatorIds()) : null;
  const teamAssigned = req.user.role === 'team' ? await assignedCriterionIds(req.user.id) : null;
  const criteria = (await all('SELECT * FROM criteria ORDER BY sort_order')).filter(c=>!teamAssigned||teamAssigned.has(c.id));
  const dimensions = await all('SELECT * FROM dimensions ORDER BY criterion_id,sort_order');
  const indicators = await all(`SELECT i.*, u.name AS owner_name,
    EXISTS(SELECT 1 FROM narratives n WHERE n.indicator_id=i.id AND (TRIM(n.body)<>'' OR TRIM(n.source_url)<>'')) AS has_narrative,
    (SELECT COUNT(*) FROM indicator_evidence ie WHERE ie.indicator_id=i.id) AS evidence_count,
    (SELECT COUNT(*) FROM indicator_evidence ie JOIN evidence_requests e ON e.id=ie.evidence_id
      WHERE ie.indicator_id=i.id AND (EXISTS(SELECT 1 FROM evidence_files f WHERE f.evidence_id=e.id)
      OR EXISTS(SELECT 1 FROM evidence_link_usage elu WHERE elu.evidence_id=e.id))) AS sourced_evidence_count,
    (SELECT COUNT(*) FROM indicator_evidence ie JOIN evidence_requests e ON e.id=ie.evidence_id
      WHERE ie.indicator_id=i.id AND e.status='verified') AS verified_evidence_count,
    EXISTS(SELECT 1 FROM indicator_evidence ie JOIN evidence_requests e ON e.id=ie.evidence_id
      WHERE ie.indicator_id=i.id AND e.status='revision') AS has_revision_evidence,
    EXISTS(SELECT 1 FROM assessment_drafts ad WHERE ad.indicator_id=i.id) AS has_assessment_draft,
    (SELECT status FROM assessments a WHERE a.indicator_id=i.id ORDER BY a.id DESC LIMIT 1) AS assessment_status
    FROM indicators i LEFT JOIN users u ON u.id=i.owner_user_id ORDER BY i.id`);
  res.json({ criteria: criteria.map(c => ({ ...c, dimensions: dimensions.filter(d => d.criterion_id === c.id).map(d => ({ ...d,
    indicators: indicators.filter(i => i.dimension_id === d.id && (!allowed || allowed.has(i.id))) })) })),
    instrument: await get('SELECT * FROM instrument_versions ORDER BY id DESC LIMIT 1') });
});
app.post('/api/indicators', roles('admin','kaprodi'), async (req, res) => {
  const dimensionId = id(req.body.dimensionId), code = clean(req.body.code, 50), body = clean(req.body.text, 5000);
  if (!dimensionId || !(await get('SELECT 1 FROM dimensions WHERE id=?', dimensionId)) || !code || !body) return fail(res, 400, 'Dimensi, kode, dan teks indikator wajib diisi.');
  try {
    const indicatorId = Number((await run('INSERT INTO indicators(dimension_id,code,text,standard_type,source_ref,owner_user_id,is_required_unggul) VALUES(?,?,?,?,?,?,?)',
      dimensionId, code, body, clean(req.body.standardType, 30) || 'LAM', clean(req.body.sourceRef, 300), id(req.body.ownerUserId), req.body.isRequiredUnggul === true || req.body.isRequiredUnggul === 'on' ? 1 : 0)).lastInsertRowid);
    await run("UPDATE instrument_versions SET status='draft' WHERE status='confirmed'");
    await audit(req.user.id, 'create', 'indicator', indicatorId);
    res.status(201).json({ id: indicatorId });
  } catch (error) { return fail(res, 409, 'Kode indikator sudah dipakai atau data tidak valid.'); }
});
app.put('/api/indicators/:id', roles('admin','kaprodi'), async (req, res) => {
  const indicatorId = id(req.params.id);
  if (!(await get('SELECT 1 FROM indicators WHERE id=?', indicatorId))) return fail(res, 404, 'Indikator tidak ditemukan.');
  if (!clean(req.body.text, 5000)) return fail(res, 400, 'Teks indikator wajib diisi.');
  await run('UPDATE indicators SET text=?,source_ref=?,owner_user_id=?,is_required_unggul=? WHERE id=?', clean(req.body.text,5000), clean(req.body.sourceRef,300), id(req.body.ownerUserId), req.body.isRequiredUnggul === true || req.body.isRequiredUnggul === 'on' ? 1 : 0, indicatorId);
  await run("UPDATE instrument_versions SET status='draft' WHERE status='confirmed'");
  await invalidateIndicator(indicatorId, req.user.id, 'indikator diubah');
  await audit(req.user.id, 'update', 'indicator', indicatorId);
  res.json({ ok: true });
});
app.post('/api/instrument/import-master', roles('admin','kaprodi'), async (req, res) => {
  try { res.status(201).json(await importIndicatorMaster(db,req.user.id)); }
  catch (error) { fail(res,409,error.message); }
});
app.post('/api/instrument/confirm', roles('admin','kaprodi'), async (req, res) => {
  const inst = await get('SELECT * FROM instrument_versions ORDER BY id DESC LIMIT 1');
  const count = (await get('SELECT COUNT(*) AS n FROM indicators')).n;
  if (count !== inst.expected_indicators) return fail(res, 400, `Diperlukan ${inst.expected_indicators} indikator; saat ini ${count}.`);
  const missingSource = (await get("SELECT COUNT(*) AS n FROM indicators WHERE source_ref=''")).n;
  if (missingSource) return fail(res, 400, `${missingSource} indikator belum memiliki rujukan resmi.`);
  const required = (await get('SELECT COUNT(*) AS n FROM indicators WHERE is_required_unggul=1')).n;
  if (required !== 8) return fail(res, 400, `Tandai tepat 8 indikator syarat perlu Unggul dari DL-09; saat ini ${required}.`);
  if (inst.source_sha256) {
    try { await validateImportedMapping(db); }
    catch (error) { return fail(res,400,error.message); }
  }
  await run("UPDATE instrument_versions SET status='confirmed' WHERE id=?", inst.id);
  await audit(req.user.id, 'confirm', 'instrument', inst.id);
  res.json({ ok: true });
});

app.get('/api/evidence', async (req, res) => {
  const q = clean(req.query.q, 100);
  const criterion = clean(req.query.criterion, 10);
  const status = clean(req.query.status, 30);
  let sql = `SELECT e.*, u.name AS owner_name, v.name AS validator_name,
    (SELECT COUNT(*) FROM evidence_files f WHERE f.evidence_id=e.id) AS file_count,
    (SELECT COUNT(*) FROM evidence_link_usage elu WHERE elu.evidence_id=e.id) AS link_count,
    (SELECT COUNT(*) FROM indicator_evidence ie WHERE ie.evidence_id=e.id) AS indicator_count
    FROM evidence_requests e LEFT JOIN users u ON u.id=e.owner_user_id LEFT JOIN users v ON v.id=e.validator_user_id WHERE 1=1`;
  const params = [];
  if (req.user.role === 'asesor') sql += ` AND EXISTS (SELECT 1 FROM indicator_evidence ie WHERE ie.evidence_id=e.id AND
    (SELECT status FROM assessments WHERE indicator_id=ie.indicator_id ORDER BY id DESC LIMIT 1)='approved')`;
  if (req.user.role === 'team') {
    sql += ` AND EXISTS (SELECT 1 FROM criteria c JOIN user_criteria uc ON uc.criterion_id=c.id
      WHERE e.code LIKE c.code || '.%' AND uc.user_id=?)`;
    params.push(req.user.id);
  }
  if (q) { sql += ' AND (e.code LIKE ? OR e.title LIKE ? OR e.source_unit LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (criterion) { sql += ' AND e.code LIKE ?'; params.push(`${criterion}.%`); }
  if (status) { sql += ' AND e.status=?'; params.push(status); }
  if (req.query.unmapped === '1' && req.user.role !== 'asesor') sql += ' AND NOT EXISTS (SELECT 1 FROM indicator_evidence ie WHERE ie.evidence_id=e.id)';
  sql += ' ORDER BY e.code LIMIT 300';
  res.json({ items: await all(sql, ...params) });
});
app.get('/api/mapping-coverage', roles('admin','team','validator','kaprodi'), async (req, res) => {
  const team=req.user.role==='team';
  const evidenceScope=team?`EXISTS (SELECT 1 FROM criteria c JOIN user_criteria uc ON uc.criterion_id=c.id
    WHERE e.code LIKE c.code || '.%' AND uc.user_id=?)`:'1=1';
  const indicatorScope=team?`EXISTS (SELECT 1 FROM dimensions d JOIN user_criteria uc ON uc.criterion_id=d.criterion_id
    WHERE d.id=i.dimension_id AND uc.user_id=?)`:'1=1';
  const args=team?[req.user.id]:[];
  const evidence = await all(`SELECT e.id,e.code,e.title FROM evidence_requests e
    WHERE ${evidenceScope} AND NOT EXISTS (SELECT 1 FROM indicator_evidence ie WHERE ie.evidence_id=e.id) ORDER BY e.code`,...args);
  const indicators = await all(`SELECT i.id,i.code,i.text FROM indicators i
    WHERE ${indicatorScope} AND NOT EXISTS (SELECT 1 FROM indicator_evidence ie WHERE ie.indicator_id=i.id) ORDER BY i.code`,...args);
  const evidenceTotal = (await get(`SELECT COUNT(*) AS n FROM evidence_requests e WHERE ${evidenceScope}`,...args)).n;
  const indicatorTotal = (await get(`SELECT COUNT(*) AS n FROM indicators i WHERE ${indicatorScope}`,...args)).n;
  res.json({ evidenceTotal, evidenceMapped: evidenceTotal-evidence.length,
    indicatorTotal, indicatorsCovered: indicatorTotal-indicators.length,
    unmappedEvidence: evidence, uncoveredIndicators: indicators });
});
app.get('/api/evidence/:id', async (req, res) => {
  const evidenceId = id(req.params.id);
  const item = await get('SELECT * FROM evidence_requests WHERE id=?', evidenceId);
  if (!item || !(await teamCanAccessEvidence(req,evidenceId)) ||
    (req.user.role === 'asesor' && !(await assessorCanSeeEvidence(evidenceId)))) return fail(res, 404, 'Bukti tidak ditemukan.');
  const visibleIndicatorIds = req.user.role === 'asesor' ? new Set(await assessorIndicatorIds()) : null;
  const linked = [];
  for (const indicator of await all(`SELECT i.id,i.code,i.text,ie.mapping_note FROM indicator_evidence ie JOIN indicators i ON i.id=ie.indicator_id WHERE ie.evidence_id=?`, evidenceId))
    if (await teamCanAccessIndicator(req, indicator.id) && (!visibleIndicatorIds || visibleIndicatorIds.has(indicator.id))) linked.push(indicator);
  const links = await all(`SELECT l.id,l.url,l.title,l.status,l.review_note,l.created_at,l.reviewed_at
    FROM evidence_link_usage elu JOIN evidence_links l ON l.id=elu.link_id WHERE elu.evidence_id=? ORDER BY l.id DESC`, evidenceId);
  res.json({ item, linked, links: req.user.role === 'asesor' ? links.filter(l => l.status === 'verified') : links,
    files: await all('SELECT id,original_name,mime,size,version,created_at FROM evidence_files WHERE evidence_id=? ORDER BY version DESC', evidenceId) });
});
app.post('/api/evidence/:id/links', roles('admin','team','validator','kaprodi'), teamEvidenceWrite, async (req, res) => {
  const evidenceId = id(req.params.id), url = httpsUrl(req.body.url), title = clean(req.body.title, 300);
  if (!(await get('SELECT 1 FROM evidence_requests WHERE id=?', evidenceId))) return fail(res, 404, 'Bukti tidak ditemukan.');
  if (!url || !title) return fail(res, 400, 'Isi judul dan URL HTTPS yang valid.');
  const result=await attachEvidenceLink(evidenceId,url,title,req.user.id);
  res.status(result.added ? 201 : 200).json({ id:result.id, reused:result.reused });
});
app.delete('/api/evidence/:id/links/:linkId', roles('admin','team','validator','kaprodi'), teamEvidenceWrite, async (req, res) => {
  const evidenceId = id(req.params.id), linkId = id(req.params.linkId);
  const removed = await run('DELETE FROM evidence_link_usage WHERE evidence_id=? AND link_id=?', evidenceId,linkId);
  if (!removed.changes) return fail(res, 404, 'Tautan pada bukti ini tidak ditemukan.');
  await sourceChanged(evidenceId, req.user.id, 'tautan sumber dilepas');
  await audit(req.user.id, 'unlink', 'evidence_link', linkId, `evidence ${evidenceId}`);
  res.json({ ok: true });
});
app.post('/api/evidence-links/:id/review', roles('validator','kaprodi'), async (req, res) => {
  const linkId = id(req.params.id), status = clean(req.body.status, 20), note = clean(req.body.note, 2000);
  const link = await get('SELECT * FROM evidence_links WHERE id=?', linkId);
  if (!link) return fail(res, 404, 'Tautan tidak ditemukan.');
  if (!['verified','revision'].includes(status) || (status === 'revision' && !note)) return fail(res, 400, 'Keputusan tidak valid atau catatan revisi kosong.');
  if (link.status !== status || link.review_note !== note) {
    await run('UPDATE evidence_links SET status=?,review_note=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?', status,note,req.user.id,linkId);
    if (status === 'revision') for (const row of await all('SELECT evidence_id FROM evidence_link_usage WHERE link_id=?', linkId))
      await sourceChanged(row.evidence_id, req.user.id, 'tautan sumber perlu revisi');
    await audit(req.user.id, 'review', 'evidence_link', linkId, status);
  }
  res.json({ ok: true });
});
app.post('/api/evidence', roles('admin','team','validator','kaprodi'), async (req, res) => {
  const code = clean(req.body.code, 50), title = clean(req.body.title, 500);
  if (!code || !title) return fail(res, 400, 'Kode dan judul bukti wajib diisi.');
  if (!(await teamCanCreateEvidence(req,code))) return fail(res,403,'Kode bukti di luar kriteria tugas Anda.');
  try {
    const evidenceId = Number((await run(`INSERT INTO evidence_requests(code,title,source_unit,pic_label,validator_label,source_sheet)
      VALUES(?,?,?,?,?,'manual')`, code,title,clean(req.body.sourceUnit,200),clean(req.body.picLabel,100),clean(req.body.validatorLabel,100))).lastInsertRowid);
    await audit(req.user.id, 'create', 'evidence', evidenceId);
    res.status(201).json({ id: evidenceId });
  } catch { return fail(res, 409, 'Kode bukti sudah dipakai.'); }
});
app.put('/api/evidence/:id', roles('admin','team','validator','kaprodi'), teamEvidenceWrite, async (req, res) => {
  const evidenceId = id(req.params.id);
  const current = await get('SELECT * FROM evidence_requests WHERE id=?', evidenceId);
  if (!current) return fail(res, 404, 'Bukti tidak ditemukan.');
  const allowed = ['needed','collecting','uploaded','verified','revision'];
  const status = clean(req.body.status, 30);
  if (!allowed.includes(status)) return fail(res, 400, 'Status tidak valid.');
  if (req.user.role === 'team' && status !== current.status)
    return fail(res,403,'Status bukti berubah melalui penambahan sumber dan pemeriksaan validator.');
  const manager = ['admin','kaprodi'].includes(req.user.role);
  const ownerId = req.body.ownerUserId === undefined ? current.owner_user_id : id(req.body.ownerUserId);
  const validatorId = req.body.validatorUserId === undefined ? current.validator_user_id : id(req.body.validatorUserId);
  if (!manager && (ownerId !== current.owner_user_id || validatorId !== current.validator_user_id))
    return fail(res,403,'Penugasan PIC dan validator hanya dapat diubah admin atau ketua prodi.');
  if (manager && ownerId && (await get('SELECT role FROM users WHERE id=? AND active=1',ownerId))?.role !== 'team')
    return fail(res,400,'PIC harus akun tim yang aktif.');
  if (manager && ownerId && ownerId!==current.owner_user_id && !(await get(`SELECT 1 FROM user_criteria uc JOIN criteria c ON c.id=uc.criterion_id
    JOIN evidence_requests e ON e.code LIKE c.code || '.%' WHERE uc.user_id=? AND e.id=?`,ownerId,evidenceId)))
    return fail(res,400,'PIC harus ditugaskan pada kriteria bukti ini.');
  if (manager && validatorId && !['validator','kaprodi'].includes((await get('SELECT role FROM users WHERE id=? AND active=1',validatorId))?.role))
    return fail(res,400,'Validator harus akun validator atau ketua prodi yang aktif.');
  if (status === 'verified' && !['validator','kaprodi'].includes(req.user.role)) return fail(res, 403, 'Validasi hanya dilakukan validator atau ketua prodi.');
  if (status === 'verified' && req.user.role === 'validator' && current.validator_user_id && current.validator_user_id !== req.user.id)
    return fail(res,403,'Bukti ini ditugaskan kepada validator lain.');
  if (status === 'uploaded') {
    const fileCount = (await get('SELECT COUNT(*) AS n FROM evidence_files WHERE evidence_id=?', evidenceId)).n;
    const linkCount = (await get('SELECT COUNT(*) AS n FROM evidence_link_usage WHERE evidence_id=?', evidenceId)).n;
    if (!fileCount && !linkCount) return fail(res,400,'Tambahkan berkas atau tautan sumber sebelum mengubah status menjadi Sumber tersedia.');
  }
  if (status === 'verified') {
    const files = (await get('SELECT COUNT(*) AS n FROM evidence_files WHERE evidence_id=?', evidenceId)).n;
    const links = await get(`SELECT COUNT(*) AS total,SUM(CASE WHEN l.status='verified' THEN 1 ELSE 0 END) AS valid
      FROM evidence_link_usage elu JOIN evidence_links l ON l.id=elu.link_id WHERE elu.evidence_id=?`, evidenceId);
    if (!files && !links.total) return fail(res, 400, 'Unggah berkas atau tautkan sumber sebelum validasi.');
    if (links.total && links.valid !== links.total) return fail(res, 400, 'Seluruh tautan sumber harus diverifikasi dahulu.');
  }
  await run(`UPDATE evidence_requests SET status=?,notes=?,owner_user_id=?,validator_user_id=?,due_date=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`,
    status,req.body.notes===undefined?current.notes:clean(req.body.notes,2000),ownerId,validatorId,
    req.body.dueDate===undefined?current.due_date:clean(req.body.dueDate,10)||null,evidenceId);
  if (status !== 'verified') for (const row of await all('SELECT indicator_id FROM indicator_evidence WHERE evidence_id=?', evidenceId))
    await invalidateIndicator(row.indicator_id, req.user.id, 'status bukti berubah');
  if (status !== 'verified') await invalidateEligibilityForEvidence(evidenceId, req.user.id);
  await audit(req.user.id, 'update', 'evidence', evidenceId, status);
  res.json({ ok: true });
});
const upload = multer({ storage: multer.diskStorage({ destination: uploadDir, filename: (_req,_file,cb) => cb(null, crypto.randomUUID()) }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req,file,cb) => cb(null, /\.(pdf|docx|xlsx|png|jpe?g)$/i.test(file.originalname)) });
app.post('/api/evidence/:id/files', roles('admin','team','validator','kaprodi'), teamEvidenceWrite, upload.single('file'), async (req, res) => {
  const evidenceId = id(req.params.id);
  if (!(await get('SELECT 1 FROM evidence_requests WHERE id=?', evidenceId)) || !req.file) {
    if (req.file) fs.unlinkSync(req.file.path);
    return fail(res, 400, 'Bukti atau berkas tidak valid. Gunakan PDF, DOCX, XLSX, PNG, atau JPG maksimal 15 MB.');
  }
  const version = (await get('SELECT COALESCE(MAX(version),0)+1 AS n FROM evidence_files WHERE evidence_id=?', evidenceId)).n;
  const fileId = Number((await run(`INSERT INTO evidence_files(evidence_id,stored_name,original_name,mime,size,version,uploaded_by)
    VALUES(?,?,?,?,?,?,?)`, evidenceId,req.file.filename,path.basename(req.file.originalname),req.file.mimetype,req.file.size,version,req.user.id)).lastInsertRowid);
  await run("UPDATE evidence_requests SET status='uploaded',updated_at=CURRENT_TIMESTAMP WHERE id=?", evidenceId);
  for (const row of await all('SELECT indicator_id FROM indicator_evidence WHERE evidence_id=?', evidenceId))
    await invalidateIndicator(row.indicator_id, req.user.id, 'versi bukti berubah');
  await invalidateEligibilityForEvidence(evidenceId, req.user.id);
  await audit(req.user.id, 'upload', 'file', fileId, `evidence ${evidenceId}, version ${version}`);
  res.status(201).json({ id: fileId, version });
});
app.get('/api/files/:id', async (req, res) => {
  const file = await get('SELECT * FROM evidence_files WHERE id=?', id(req.params.id));
  if (!file || !(await teamCanAccessEvidence(req,file.evidence_id)) ||
    (req.user.role === 'asesor' && !(await assessorCanSeeEvidence(file.evidence_id)))) return fail(res, 404, 'Berkas tidak ditemukan.');
  const stored = path.join(uploadDir, file.stored_name);
  if (!fs.existsSync(stored)) return fail(res, 404, 'Berkas tidak tersedia di penyimpanan.');
  res.download(stored, file.original_name);
});

app.get('/api/indicators/:id', async (req, res) => {
  const indicatorId = id(req.params.id);
  const indicator = await get(`SELECT i.*,d.title AS dimension_title,c.title AS criterion_title FROM indicators i
    JOIN dimensions d ON d.id=i.dimension_id JOIN criteria c ON c.id=d.criterion_id WHERE i.id=?`, indicatorId);
  if (!indicator || !(await teamCanAccessIndicator(req,indicatorId)) ||
    (req.user.role === 'asesor' && !(await assessorIndicatorIds()).includes(indicatorId))) return fail(res, 404, 'Indikator tidak ditemukan.');
  const evidence = [];
  for (const item of await all(`SELECT e.id,e.code,e.title,e.status,ie.mapping_note,(SELECT COUNT(*) FROM evidence_files f WHERE f.evidence_id=e.id) AS file_count,
      (SELECT COUNT(*) FROM evidence_link_usage elu WHERE elu.evidence_id=e.id) AS link_count
      FROM indicator_evidence ie JOIN evidence_requests e ON e.id=ie.evidence_id WHERE ie.indicator_id=? ORDER BY e.code`, indicatorId))
    if (await teamCanAccessEvidence(req, item.id)) evidence.push(item);
  res.json({ indicator,
    narrative: await get('SELECT * FROM narratives WHERE indicator_id=?', indicatorId),
    assessment: await latestAssessment(indicatorId),
    assessmentDraft: await get('SELECT * FROM assessment_drafts WHERE indicator_id=?', indicatorId),
    evidence });
});
app.put('/api/indicators/:id/narrative', roles('admin','team','validator','kaprodi'), async (req, res) => {
  const indicatorId = id(req.params.id), body = clean(req.body.body, 30000);
  const rawUrl=String(req.body.sourceUrl??'').trim(), sourceUrl=rawUrl?httpsUrl(rawUrl):'';
  if (!(await get('SELECT 1 FROM indicators WHERE id=?', indicatorId))) return fail(res, 404, 'Indikator tidak ditemukan.');
  if (!(await teamCanAccessIndicator(req,indicatorId))) return fail(res,403,'Indikator ini di luar kriteria tugas Anda.');
  if (rawUrl && !sourceUrl) return fail(res,400,'Tautan narasi harus berupa URL HTTPS yang valid.');
  if (!body && !sourceUrl) return fail(res,400,'Isi narasi atau tautkan dokumen narasi.');
  if (body && sourceUrl) return fail(res,400,'Pilih satu sumber narasi: teks atau tautan dokumen.');
  await run(`INSERT INTO narratives(indicator_id,body,source_url,updated_by) VALUES(?,?,?,?)
    ON CONFLICT(indicator_id) DO UPDATE SET body=excluded.body,source_url=excluded.source_url,updated_by=excluded.updated_by,
    version=narratives.version+1,updated_at=CURRENT_TIMESTAMP`, indicatorId,body,sourceUrl,req.user.id);
  await invalidateIndicator(indicatorId, req.user.id, 'narasi diubah');
  await audit(req.user.id, 'save', 'narrative', indicatorId);
  res.json({ ok: true });
});
app.post('/api/indicators/:id/link', roles('admin','team','validator','kaprodi'), async (req, res) => {
  const indicatorId = id(req.params.id), evidenceId = id(req.body.evidenceId), mappingNote = clean(req.body.mappingNote, 2000);
  const rawSourceUrl=String(req.body.sourceUrl??'').trim(), sourceUrl=rawSourceUrl?httpsUrl(rawSourceUrl):'';
  const sourceTitle=clean(req.body.sourceTitle,300);
  if (!(await get('SELECT 1 FROM indicators WHERE id=?', indicatorId)) || !(await get('SELECT 1 FROM evidence_requests WHERE id=?', evidenceId))) return fail(res, 404, 'Indikator atau bukti tidak ditemukan.');
  if (!(await teamCanAccessIndicator(req,indicatorId)) || !(await teamCanAccessEvidence(req,evidenceId)))
    return fail(res,403,'Indikator atau bukti di luar kriteria tugas Anda.');
  if (!mappingNote) return fail(res, 400, 'Jelaskan hubungan bukti dengan indikator.');
  if ((rawSourceUrl || sourceTitle) && (!sourceUrl || !sourceTitle)) return fail(res,400,'Isi judul dokumen dan tautan HTTPS yang valid.');
  await db.exec('BEGIN');
  try {
    await run('INSERT INTO indicator_evidence(indicator_id,evidence_id,mapping_note) VALUES(?,?,?) ON CONFLICT(indicator_id,evidence_id) DO UPDATE SET mapping_note=excluded.mapping_note', indicatorId,evidenceId,mappingNote);
    if (sourceUrl) await attachEvidenceLink(evidenceId,sourceUrl,sourceTitle,req.user.id);
    await invalidateIndicator(indicatorId, req.user.id, 'tautan bukti berubah');
    await audit(req.user.id, 'link', 'evidence', evidenceId, `indicator ${indicatorId}`);
    await db.exec('COMMIT');
    res.json({ ok: true });
  } catch (error) { await db.exec('ROLLBACK'); return fail(res,500,'Hubungan bukti gagal disimpan.'); }
});
app.delete('/api/indicators/:id/link/:evidenceId', roles('admin','team','validator','kaprodi'), async (req, res) => {
  const indicatorId = id(req.params.id), evidenceId = id(req.params.evidenceId);
  if (!(await teamCanAccessIndicator(req,indicatorId)) || !(await teamCanAccessEvidence(req,evidenceId)))
    return fail(res,403,'Indikator atau bukti di luar kriteria tugas Anda.');
  await run('DELETE FROM indicator_evidence WHERE indicator_id=? AND evidence_id=?', indicatorId,evidenceId);
  await invalidateIndicator(indicatorId, req.user.id, 'tautan bukti dihapus');
  await audit(req.user.id, 'unlink', 'evidence', evidenceId, `indicator ${indicatorId}`);
  res.json({ ok: true });
});
app.put('/api/indicators/:id/assessment-draft', roles('team'), async (req, res) => {
  const indicatorId = id(req.params.id), result = clean(req.body.result, 20), rationale = clean(req.body.rationale, 5000);
  if (!(await get('SELECT 1 FROM indicators WHERE id=?', indicatorId))) return fail(res, 404, 'Indikator tidak ditemukan.');
  if (!(await teamCanAccessIndicator(req,indicatorId))) return fail(res,403,'Indikator ini di luar kriteria tugas Anda.');
  if (!['met','not_met'].includes(result) || !rationale) return fail(res,400,'Hasil dan alasan penilaian wajib diisi.');
  const readiness=await indicatorReadiness(indicatorId);
  if (!readiness.evidence || !readiness.sources) return fail(res,400,'Lengkapi bukti dan sumber dokumen sebelum menyimpan penilaian awal.');
  if (['submitted','reviewed','approved'].includes((await latestAssessment(indicatorId))?.status))
    return fail(res,409,'Penilaian sedang diproses atau sudah disetujui.');
  if (await get('SELECT 1 FROM assessment_drafts WHERE indicator_id=?', indicatorId))
    await run('UPDATE assessment_drafts SET result=?,rationale=?,saved_by=?,updated_at=CURRENT_TIMESTAMP WHERE indicator_id=?', result,rationale,req.user.id,indicatorId);
  else await run('INSERT INTO assessment_drafts(indicator_id,result,rationale,saved_by) VALUES(?,?,?,?)', indicatorId,result,rationale,req.user.id);
  await audit(req.user.id,'save','assessment_draft',indicatorId);
  res.json({ok:true});
});
app.post('/api/indicators/:id/assessment', roles('team'), async (req, res) => {
  const indicatorId = id(req.params.id);
  if (!(await get('SELECT 1 FROM indicators WHERE id=?', indicatorId))) return fail(res, 404, 'Indikator tidak ditemukan.');
  if (!(await teamCanAccessIndicator(req,indicatorId))) return fail(res,403,'Indikator ini di luar kriteria tugas Anda.');
  if (['submitted','reviewed','approved'].includes((await latestAssessment(indicatorId))?.status))
    return fail(res,409,'Penilaian sedang diproses atau sudah disetujui. Ajukan ulang hanya setelah ada permintaan revisi.');
  const draft=await get('SELECT result,rationale FROM assessment_drafts WHERE indicator_id=?',indicatorId);
  if (!draft) return fail(res,400,'Simpan penilaian awal sebelum mengajukan.');
  const readiness=await indicatorReadiness(indicatorId);
  if (!readiness.narrative || !readiness.evidence || !readiness.sources)
    return fail(res,400,'Lengkapi narasi, hubungan bukti, dan sumber dokumen sebelum mengajukan penilaian.');
  await db.exec('BEGIN');
  try {
    const assessmentId = Number((await run('INSERT INTO assessments(indicator_id,result,rationale,proposed_by) VALUES(?,?,?,?)', indicatorId,draft.result,draft.rationale,req.user.id)).lastInsertRowid);
    await run('DELETE FROM assessment_drafts WHERE indicator_id=?',indicatorId);
    await audit(req.user.id, 'submit', 'assessment', assessmentId);
    await db.exec('COMMIT');
    res.status(201).json({ id: assessmentId });
  } catch (error) { await db.exec('ROLLBACK'); return fail(res,500,'Penilaian gagal diajukan.'); }
});
app.post('/api/assessments/:id/review', roles('validator'), async (req, res) => {
  const assessmentId = id(req.params.id), row = await get('SELECT * FROM assessments WHERE id=?', assessmentId);
  if (!row) return fail(res, 404, 'Penilaian tidak ditemukan.');
  if (row.status !== 'submitted') return fail(res, 409, 'Penilaian ini tidak menunggu pemeriksaan.');
  if ((await latestAssessment(row.indicator_id))?.id !== assessmentId) return fail(res, 409, 'Ada penilaian yang lebih baru.');
  if (row.proposed_by === req.user.id) return fail(res, 403, 'Pengusul tidak dapat memeriksa penilaiannya sendiri.');
  const decision = clean(req.body.decision, 20), note = clean(req.body.note, 2000);
  if (!['reviewed','revision'].includes(decision)) return fail(res, 400, 'Keputusan tidak valid.');
  if (decision === 'revision' && !note) return fail(res, 400, 'Catatan revisi wajib diisi.');
  await run('UPDATE assessments SET status=?,review_note=?,reviewed_by=?,reviewed_at=CURRENT_TIMESTAMP WHERE id=?', decision,note,req.user.id,assessmentId);
  await audit(req.user.id, 'review', 'assessment', assessmentId, decision);
  res.json({ ok: true });
});
app.post('/api/assessments/:id/approve', roles('kaprodi'), async (req, res) => {
  const assessmentId = id(req.params.id), row = await get('SELECT * FROM assessments WHERE id=?', assessmentId);
  if (!row) return fail(res, 404, 'Penilaian tidak ditemukan.');
  if (row.status !== 'reviewed') return fail(res, 409, 'Penilaian harus diperiksa sebelum disetujui.');
  if ((await latestAssessment(row.indicator_id))?.id !== assessmentId) return fail(res, 409, 'Ada penilaian yang lebih baru.');
  if (row.proposed_by === req.user.id || row.reviewed_by === req.user.id) return fail(res, 403, 'Persetujuan harus dilakukan oleh orang yang berbeda dari pengusul dan pemeriksa.');
  const linked = await all(`SELECT e.status FROM indicator_evidence ie JOIN evidence_requests e ON e.id=ie.evidence_id WHERE ie.indicator_id=?`, row.indicator_id);
  if (!linked.length || linked.some(e => e.status !== 'verified')) return fail(res, 400, 'Semua bukti tertaut harus diverifikasi sebelum persetujuan.');
  if (!(await indicatorReadiness(row.indicator_id)).narrative) return fail(res, 400, 'Narasi indikator harus diisi atau ditautkan sebelum persetujuan.');
  await run("UPDATE assessments SET status='approved',approved_by=?,approved_at=CURRENT_TIMESTAMP WHERE id=?", req.user.id,assessmentId);
  await audit(req.user.id, 'approve', 'assessment', assessmentId);
  res.json({ ok: true });
});

app.get('/api/eligibility', roles('admin','validator','kaprodi'), async (req, res) => res.json({
  rulesetConfirmed: (await get("SELECT value FROM settings WHERE key='ruleset_confirmed'"))?.value==='1',
  rules: (await all(`SELECT r.*,u.name AS approver_name,e.code AS evidence_code
  FROM eligibility_rules r LEFT JOIN users u ON u.id=r.approved_by LEFT JOIN evidence_requests e ON e.id=r.evidence_id ORDER BY r.code`))
    .map(r=>({...r,source_hint:S1_RULES.find(x=>x.code===r.code)?.sourceHint||''})) }));
app.post('/api/eligibility', roles('admin','kaprodi'), (req, res) =>
  fail(res,409,'Aturan S1 telah ditetapkan dari DL-09. Perubahan instrumen memerlukan peninjauan master aturan.'));
app.put('/api/eligibility/:id', roles('admin','validator','kaprodi'), async (req, res) => {
  const ruleId=id(req.params.id), rule=await get('SELECT * FROM eligibility_rules WHERE id=?',ruleId);
  if (!rule) return fail(res,404,'Syarat tidak ditemukan.');
  const source=clean(req.body.dataSource,500), evidenceId=id(req.body.evidenceId);
  const period=periodFromEnd(clean(req.body.periodEnd,10),rule.period_years);
  if (!source || !evidenceId || !(await get('SELECT 1 FROM evidence_requests WHERE id=?',evidenceId)) || !period)
    return fail(res,400,'Sumber data, bukti pendukung, dan tanggal akhir periode yang valid wajib diisi.');
  let value, numerator=null, denominator=null;
  if (rule.metric==='percentage') {
    if (req.body.numerator==='' || req.body.numerator===null || req.body.numerator===undefined ||
      req.body.denominator==='' || req.body.denominator===null || req.body.denominator===undefined)
      return fail(res,400,'Pembilang dan penyebut wajib diisi.');
    numerator=Number(req.body.numerator); denominator=Number(req.body.denominator);
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || numerator<0 || denominator<=0 || numerator>denominator)
      return fail(res,400,'Pembilang dan penyebut harus bilangan bulat; penyebut positif dan pembilang tidak melebihi penyebut.');
    value=numerator/denominator*100;
  } else {
    if (req.body.value==='' || req.body.value===null || req.body.value===undefined)
      return fail(res,400,'Nilai wajib diisi.');
    value=Number(req.body.value);
    if (!Number.isInteger(value) || value<0 || (rule.metric==='attestation' && ![0,1].includes(value)))
      return fail(res,400,'Nilai harus bilangan bulat yang valid.');
  }
  await run(`UPDATE eligibility_rules SET value=?,numerator=?,denominator=?,period_start=?,period_end=?,data_source=?,
    evidence_id=?,submitted_by=?,approved_by=NULL,approved_at=NULL WHERE id=?`,
    value,numerator,denominator,period.start,period.end,source,evidenceId,req.user.id,ruleId);
  await audit(req.user.id,'update','eligibility',ruleId,`value ${value}`);
  res.json({ok:true});
});
app.post('/api/eligibility/:id/approve', roles('kaprodi'), async (req, res) => {
  const ruleId=id(req.params.id),rule=await get('SELECT * FROM eligibility_rules WHERE id=?',ruleId);
  if (!rule) return fail(res,404,'Syarat tidak ditemukan.');
  if (rule.submitted_by===req.user.id) return fail(res,403,'Penyetuju harus berbeda dari pengisi nilai.');
  if (rule.value===null || !rule.evidence_id || !rule.data_source || !rule.period_start || !rule.period_end ||
    (await get('SELECT status FROM evidence_requests WHERE id=?',rule.evidence_id))?.status!=='verified')
    return fail(res,400,'Nilai, sumber data, periode, dan bukti terverifikasi diperlukan.');
  await run('UPDATE eligibility_rules SET approved_by=?,approved_at=CURRENT_TIMESTAMP WHERE id=?',req.user.id,ruleId);
  await audit(req.user.id,'approve','eligibility',ruleId);
  res.json({ok:true});
});
function rulePass(r) {
  if (r.value===null || !r.approved_by) return null;
  return ({'>=':r.value>=r.threshold,'>':r.value>r.threshold,'<=':r.value<=r.threshold,'<':r.value<r.threshold,'=':r.value===r.threshold})[r.operator];
}
app.post('/api/eligibility/confirm-set', roles('kaprodi'), async (req, res) => {
  const rules=await all('SELECT * FROM eligibility_rules');
  if (rules.length!==S1_RULES.length || S1_RULES.some(master=>{
    const row=rules.find(r=>r.code===master.code);
    return !row || row.category!==master.category || row.metric!==master.metric || row.operator!==master.operator ||
      row.threshold!==master.threshold || row.period_years!==master.periodYears || row.source_ref!==master.sourceRef;
  })) return fail(res,400,'Master aturan S1 belum sesuai DL-09 dan pemeriksaan kelayakan.');
  await run("INSERT INTO settings(key,value) VALUES('ruleset_confirmed','1') ON CONFLICT(key) DO UPDATE SET value='1'");
  await audit(req.user.id,'confirm','eligibility_ruleset',null,`rules ${rules.length}`);
  res.json({ok:true});
});
app.get('/api/simulation', roles('admin','validator','kaprodi'), async (req, res) => {
  if (req.user.role === 'asesor') return fail(res, 403, 'Simulasi internal tidak tersedia untuk asesor.');
  const instrument=await get('SELECT * FROM instrument_versions ORDER BY id DESC LIMIT 1');
  const indicators=await all(`SELECT i.id,i.code,i.text,i.is_required_unggul,d.title AS dimension,c.code AS criterion,
    (SELECT result FROM assessments WHERE indicator_id=i.id ORDER BY id DESC LIMIT 1) AS result,
    (SELECT status FROM assessments WHERE indicator_id=i.id ORDER BY id DESC LIMIT 1) AS assessment_status
    FROM indicators i JOIN dimensions d ON d.id=i.dimension_id JOIN criteria c ON c.id=d.criterion_id ORDER BY c.sort_order,d.sort_order,i.id`);
  const rules=(await all('SELECT * FROM eligibility_rules ORDER BY code')).map(r=>({...r,pass:rulePass(r)}));
  const approved=indicators.filter(i=>i.assessment_status==='approved');
  const passed=approved.filter(i=>i.result==='met').length;
  const failed=approved.filter(i=>i.result==='not_met').length;
  const required=indicators.filter(i=>i.is_required_unggul===1);
  const requiredPassed=required.filter(i=>i.assessment_status==='approved'&&i.result==='met').length;
  const byCategory=category=>rules.filter(r=>r.category===category);
  const allPass=category=>byCategory(category).length>0&&byCategory(category).every(r=>r.pass===true);
  const rulesetConfirmed=(await get("SELECT value FROM settings WHERE key='ruleset_confirmed'"))?.value==='1';
  const ready=instrument.status==='confirmed' && indicators.length===instrument.expected_indicators &&
    required.length===8 && approved.length===indicators.length && rulesetConfirmed &&
    ['eligibility','qualification'].every(c=>byCategory(c).length>0&&byCategory(c).every(r=>r.pass!==null));
  const fiveYearReady=ready && byCategory('publication').length>0 && byCategory('publication').every(r=>r.pass!==null);
  const outcome=projectUnggul({ready,passed,requiredPassed,eligibilityPassed:allPass('eligibility'),
    qualificationPassed:allPass('qualification'),publicationPassed:fiveYearReady&&allPass('publication')});
  res.json({instrument,indicators,rules,summary:{expected:instrument.expected_indicators,mapped:indicators.length,
    approved:approved.length,passed,failed,required:required.length,requiredPassed,rulesetConfirmed,
    eligibilityConfigured:rules.length,eligibilityPassed:rules.filter(r=>r.pass===true).length,
    eligibilityFailed:rules.filter(r=>r.pass===false).length,outcome,ready,fiveYearReady}});
});

app.get('/api/assessor-package', roles('admin','kaprodi','asesor'), async (_req, res) => {
  const pkg=await buildAssessorPackage(db,uploadDir);
  res.json({generatedAt:pkg.generatedAt,indicatorCount:pkg.indicators.length,evidenceCount:pkg.evidence.length,
    fileCount:pkg.archiveFiles.length,invalidIndicators:pkg.invalidIndicators,missingFiles:pkg.missingFiles,
    indicators:pkg.indicators.map(i=>({code:i.code,dimension:i.dimension,result:i.result}))});
});
app.get('/api/assessor-package/download', roles('admin','kaprodi','asesor'), async (req, res) => {
  const pkg=await buildAssessorPackage(db,uploadDir);
  if(!pkg.indicators.length) return fail(res,409,'Belum ada indikator yang disetujui untuk paket asesor.');
  if(pkg.invalidIndicators.length || pkg.missingFiles.length)
    return fail(res,409,'Paket belum lengkap: ada indikator atau berkas yang perlu ditinjau ulang.');
  await audit(req.user.id,'download','assessor_package',null,`${pkg.indicators.length} indikator, ${pkg.archiveFiles.length} berkas`);
  res.set('Content-Type','application/zip');
  res.set('Content-Disposition','attachment; filename="sisakprod-paket-asesor.zip"');
  res.set('Cache-Control','no-store');
  streamAssessorZip(pkg,res);
});

async function parseCriterionIds(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const ids=[...new Set(value.map(id))];
  if (ids.length > 7) return null;
  for (const criterionId of ids) if (!criterionId || !(await get('SELECT 1 FROM criteria WHERE id=?', criterionId))) return null;
  return ids;
}
app.get('/api/users', roles('admin','kaprodi'), async (req, res) => {
  const assignments=await all('SELECT uc.user_id,c.id,c.code FROM user_criteria uc JOIN criteria c ON c.id=uc.criterion_id ORDER BY c.sort_order');
  res.json({users:(await all('SELECT id,name,username,role,active,created_at FROM users ORDER BY name'))
    .map(user=>({...user,criteria:assignments.filter(a=>a.user_id===user.id).map(a=>({id:a.id,code:a.code}))}))});
});
app.post('/api/users', roles('admin'), async (req, res) => {
  const name=clean(req.body.name,100),username=usernameValue(req.body.username),password=String(req.body.password||''),role=clean(req.body.role,20);
  const criterionIds=await parseCriterionIds(req.body.criterionIds);
  if (!name || !validUsername(username) || password.length<8 || !['admin','team','validator','kaprodi','asesor'].includes(role))
    return fail(res,400,'Isi nama, username 2–32 karakter, peran, dan kata sandi minimal 8 karakter.');
  if (!criterionIds || (role!=='team' && criterionIds.length)) return fail(res,400,'Penugasan kriteria hanya berlaku bagi tim penyusun.');
  try {
    await db.exec('BEGIN');
    const userId=Number((await run('INSERT INTO users(name,username,email,password_hash,role) VALUES(?,?,?,?,?)',name,username,username,hashPassword(password),role)).lastInsertRowid);
    for(const criterionId of criterionIds) await run('INSERT INTO user_criteria(user_id,criterion_id,assigned_by) VALUES(?,?,?)',userId,criterionId,req.user.id);
    await audit(req.user.id,'create','user',userId,`${role}; kriteria ${criterionIds.join(',')}`);
    await db.exec('COMMIT');
    res.status(201).json({id:userId});
  }
  catch { await db.exec('ROLLBACK'); return fail(res,409,'Username sudah digunakan atau penugasan tidak valid.'); }
});
app.put('/api/users/:id', roles('admin'), async (req, res) => {
  const userId=id(req.params.id), current=await get('SELECT * FROM users WHERE id=?',userId);
  if (!current) return fail(res,404,'Pengguna tidak ditemukan.');
  if (!current.active) return fail(res,400,'Pulihkan akun sebelum mengeditnya.');
  const name=clean(req.body.name,100),username=usernameValue(req.body.username),role=clean(req.body.role,20);
  const password=String(req.body.password||''),criterionIds=await parseCriterionIds(req.body.criterionIds);
  if (!name || !validUsername(username) || (password && password.length<8) || !['admin','team','validator','kaprodi','asesor'].includes(role))
    return fail(res,400,'Isi nama, username 2–32 karakter, peran, dan kata sandi baru minimal 8 karakter bila diubah.');
  if (!criterionIds || (role!=='team' && criterionIds.length)) return fail(res,400,'Penugasan kriteria hanya berlaku bagi tim penyusun.');
  if (userId===req.user.id && role!=='admin') return fail(res,400,'Admin tidak dapat mengubah peran akunnya sendiri.');
  if (role!=='team' && ((await get('SELECT 1 FROM evidence_requests WHERE owner_user_id=?',userId)) || (await get('SELECT 1 FROM indicators WHERE owner_user_id=?',userId))))
    return fail(res,409,'Pindahkan penugasan PIC bukti dan indikator sebelum mengubah peran tim penyusun.');
  if (!['validator','kaprodi'].includes(role) && (await get('SELECT 1 FROM evidence_requests WHERE validator_user_id=?',userId)))
    return fail(res,409,'Pindahkan penugasan validator bukti sebelum mengubah peran.');
  if (await get('SELECT 1 FROM users WHERE username=? COLLATE NOCASE AND id<>?',username,userId))
    return fail(res,409,'Username sudah digunakan.');
  try {
    await db.exec('BEGIN');
    await run('UPDATE users SET name=?,username=?,role=?,password_hash=? WHERE id=?',
      name,username,role,password?hashPassword(password):current.password_hash,userId);
    await run('DELETE FROM user_criteria WHERE user_id=?',userId);
    for (const criterionId of criterionIds)
      await run('INSERT INTO user_criteria(user_id,criterion_id,assigned_by) VALUES(?,?,?)',userId,criterionId,req.user.id);
    if (password) {
      const sid=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('sid='))?.slice(4);
      if (userId===req.user.id && sid) await run('DELETE FROM sessions WHERE user_id=? AND token_hash<>?',userId,hashToken(sid));
      else await run('DELETE FROM sessions WHERE user_id=?',userId);
    }
    await audit(req.user.id,'update','user',userId,`nama, username, peran ${role}, kriteria ${criterionIds.join(',')}${password?', kata sandi':''}`);
    await db.exec('COMMIT');
    res.json({ok:true,user:userPublic(await get('SELECT * FROM users WHERE id=?',userId))});
  } catch {
    await db.exec('ROLLBACK');
    return fail(res,409,'Perubahan pengguna gagal disimpan. Periksa username dan penugasan.');
  }
});
app.delete('/api/users/:id', roles('admin'), async (req, res) => {
  const userId=id(req.params.id), user=await get('SELECT id,active FROM users WHERE id=?',userId);
  if (!user) return fail(res,404,'Pengguna tidak ditemukan.');
  if (userId===req.user.id) return fail(res,400,'Akun sendiri tidak dapat dihapus.');
  if (!user.active) return fail(res,400,'Akun sudah dihapus dari akses aktif.');
  await db.exec('BEGIN');
  try {
    await run('UPDATE users SET active=0 WHERE id=?',userId);
    await run('DELETE FROM sessions WHERE user_id=?',userId);
    const releasedEvidence=(await run('UPDATE evidence_requests SET owner_user_id=NULL WHERE owner_user_id=?',userId)).changes;
    const releasedValidation=(await run('UPDATE evidence_requests SET validator_user_id=NULL WHERE validator_user_id=?',userId)).changes;
    const releasedIndicators=(await run('UPDATE indicators SET owner_user_id=NULL WHERE owner_user_id=?',userId)).changes;
    await audit(req.user.id,'delete','user',userId,`akses dicabut; riwayat dipertahankan; ${releasedEvidence} PIC bukti, ${releasedValidation} validator bukti, ${releasedIndicators} indikator dilepas`);
    await db.exec('COMMIT');
    res.json({ok:true});
  } catch { await db.exec('ROLLBACK'); return fail(res,500,'Akun gagal dihapus.'); }
});
app.post('/api/users/:id/restore', roles('admin'), async (req, res) => {
  const userId=id(req.params.id), user=await get('SELECT id,active FROM users WHERE id=?',userId);
  if (!user) return fail(res,404,'Pengguna tidak ditemukan.');
  if (user.active) return fail(res,400,'Akun masih aktif.');
  await run('UPDATE users SET active=1 WHERE id=?',userId);
  await audit(req.user.id,'restore','user',userId);
  res.json({ok:true});
});
app.put('/api/users/:id/criteria', roles('admin'), async (req, res) => {
  const userId=id(req.params.id),user=await get('SELECT role,active FROM users WHERE id=?',userId);
  if (!user) return fail(res,404,'Pengguna tidak ditemukan.');
  if (!user.active) return fail(res,400,'Pulihkan akun sebelum mengubah penugasan.');
  if (user.role!=='team') return fail(res,400,'Penugasan kriteria hanya berlaku bagi tim penyusun.');
  const criterionIds=await parseCriterionIds(req.body.criterionIds);
  if (!criterionIds) return fail(res,400,'Daftar kriteria tidak valid.');
  await db.exec('BEGIN');
  try {
    await run('DELETE FROM user_criteria WHERE user_id=?',userId);
    for(const criterionId of criterionIds) await run('INSERT INTO user_criteria(user_id,criterion_id,assigned_by) VALUES(?,?,?)',userId,criterionId,req.user.id);
    await audit(req.user.id,'assign','user_criteria',userId,criterionIds.join(','));
    await db.exec('COMMIT');
    res.json({ok:true,criterionIds});
  } catch(error) { await db.exec('ROLLBACK'); return fail(res,500,'Penugasan kriteria gagal disimpan.'); }
});
app.post('/api/settings/assessor-access', roles('kaprodi'), async (req, res) => {
  const value=req.body.enabled===true?'1':'0';
  await run("INSERT INTO settings(key,value) VALUES('assessor_access',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",value);
  await audit(req.user.id,'update','settings',null,`assessor_access ${value}`);
  res.json({enabled:value==='1'});
});
app.get('/api/audit', roles('admin','kaprodi'), async (req, res) => res.json({items:await all(`SELECT l.*,u.name AS actor_name FROM audit_logs l
  LEFT JOIN users u ON u.id=l.actor_id ORDER BY l.id DESC LIMIT 100`)}));

app.use('/api', (req,res)=>fail(res,404,'Endpoint tidak ditemukan.'));
app.use(express.static(path.join(here,'public')));
app.get('/{*any}', (_req,res)=>res.sendFile(path.join(here,'public','index.html')));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error instanceof multer.MulterError) return fail(res,400,error.code==='LIMIT_FILE_SIZE'?'Berkas melebihi batas ukuran yang diizinkan.':'Unggah berkas gagal.');
  return fail(res,500,'Terjadi kesalahan pada server.');
});

const port=Number(process.env.PORT||3000);
const host=process.env.HOST||'127.0.0.1';
app.listen(port,host,()=>console.log(`SISAKPROD berjalan di http://${host}:${port}`));
}

start().catch(error => {
  console.error('SISAKPROD gagal dijalankan:', error);
  process.exit(1);
});
