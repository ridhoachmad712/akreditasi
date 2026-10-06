import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

if (process.env.DB_DRIVER === 'mysql') throw new Error('Skrip ini hanya untuk SQLite. Pulihkan MySQL dari cadangan hPanel dan folder unggahan secara terpisah.');

const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const backupArg=arg('--backup'), dataArg=arg('--data-dir'), uploadArg=arg('--upload-dir');
if(!backupArg||!dataArg||!uploadArg)
  throw new Error('Gunakan: npm run restore -- --backup <folder-cadangan> --data-dir <folder-data-baru> --upload-dir <folder-uploads-baru>');
const backupDir=path.resolve(backupArg),dataDir=path.resolve(dataArg),uploadDir=path.resolve(uploadArg);
const inside=(parent,child)=>child.toLowerCase()===parent.toLowerCase()||child.toLowerCase().startsWith(parent.toLowerCase()+path.sep);
if(fs.existsSync(dataDir)||fs.existsSync(uploadDir)||inside(backupDir,dataDir)||inside(backupDir,uploadDir)||
  inside(dataDir,uploadDir)||inside(uploadDir,dataDir))
  throw new Error('Folder tujuan harus baru, terpisah satu sama lain, dan berada di luar cadangan.');
const manifest=JSON.parse(fs.readFileSync(path.join(backupDir,'manifest.json'),'utf8'));
if(manifest.format!=='sisakprod-backup'||manifest.version!==1||!Array.isArray(manifest.files))
  throw new Error('Format manifest cadangan tidak dikenal.');
const expected=new Set(),verified=[];
for(const entry of manifest.files){
  const relative=entry.path;
  if(typeof relative!=='string'||!(/^(data\/sisakprod\.sqlite|uploads\/[a-zA-Z0-9._/-]+)$/.test(relative))||
    relative.split('/').includes('..')||expected.has(relative)) throw new Error('Path cadangan tidak valid atau duplikat.');
  expected.add(relative);
  const source=path.join(backupDir,...relative.split('/'));
  if(!inside(backupDir,source)||!fs.existsSync(source)||!fs.statSync(source).isFile()) throw new Error(`Berkas cadangan hilang: ${relative}`);
  const size=fs.statSync(source).size,hash=crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  if(size!==entry.size||hash!==entry.sha256) throw new Error(`Checksum cadangan tidak cocok: ${relative}`);
  verified.push({relative,source});
}
if(!expected.has('data/sisakprod.sqlite')) throw new Error('Snapshot database tidak ada dalam manifest.');
const sourceDb=new DatabaseSync(path.join(backupDir,'data','sisakprod.sqlite'),{readOnly:true});
try { if(sourceDb.prepare('PRAGMA integrity_check').get().integrity_check!=='ok') throw new Error('Database cadangan rusak.'); }
finally { sourceDb.close(); }
const suffix=`.restore-${crypto.randomUUID()}`;
const stagingData=dataDir+suffix,stagingUploads=uploadDir+suffix;
fs.mkdirSync(path.dirname(dataDir),{recursive:true});
fs.mkdirSync(path.dirname(uploadDir),{recursive:true});
fs.mkdirSync(stagingData,{recursive:true});fs.mkdirSync(stagingUploads,{recursive:true});
for(const entry of verified){
  const destination=entry.relative.startsWith('data/')?
    path.join(stagingData,entry.relative.slice(5)):path.join(stagingUploads,entry.relative.slice(8));
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.copyFileSync(entry.source,destination);
}
fs.renameSync(stagingData,dataDir);
try { fs.renameSync(stagingUploads,uploadDir); }
catch(error) { fs.renameSync(dataDir,stagingData); throw error; }
console.log(`Pemulihan selesai. Atur SISAKPROD_DATA_DIR=${dataDir} dan SISAKPROD_UPLOAD_DIR=${uploadDir} sebelum memulai server.`);
