import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync, backup } from 'node:sqlite';

const project=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const outputArg=arg('--output');
if(!outputArg) throw new Error('Gunakan: npm run backup -- --output <folder-baru>');
const output=path.resolve(outputArg);
const dataDir=path.resolve(process.env.SISAKPROD_DATA_DIR||path.join(project,'data'));
const uploadDir=path.resolve(process.env.SISAKPROD_UPLOAD_DIR||path.join(project,'uploads'));
const inside=(parent,child)=>child.toLowerCase()===parent.toLowerCase()||child.toLowerCase().startsWith(parent.toLowerCase()+path.sep);
if(fs.existsSync(output)||inside(dataDir,output)||inside(uploadDir,output))
  throw new Error('Folder cadangan harus baru dan berada di luar folder data serta uploads.');
const sourceDb=path.join(dataDir,'sisakprod.sqlite');
if(!fs.existsSync(sourceDb)) throw new Error('Database sumber tidak ditemukan.');
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.mkdirSync(path.join(output,'data'),{recursive:true});
fs.mkdirSync(path.join(output,'uploads'),{recursive:true});
const database=new DatabaseSync(sourceDb,{readOnly:true});
try { await backup(database,path.join(output,'data','sisakprod.sqlite')); }
finally { database.close(); }
const copyUploads=(dir,relative='')=>{
  if(!fs.existsSync(dir)) return;
  for(const item of fs.readdirSync(dir,{withFileTypes:true})){
    if(item.isSymbolicLink()) throw new Error(`Tautan simbolik tidak didukung: ${item.name}`);
    const from=path.join(dir,item.name),next=path.join(relative,item.name);
    if(item.isDirectory()) copyUploads(from,next);
    else if(item.isFile()) {
      const to=path.join(output,'uploads',next);
      fs.mkdirSync(path.dirname(to),{recursive:true});
      fs.copyFileSync(from,to);
    } else throw new Error(`Jenis berkas tidak didukung: ${item.name}`);
  }
};
copyUploads(uploadDir);
const files=[];
const record=(dir,relative='')=>{
  for(const item of fs.readdirSync(dir,{withFileTypes:true})){
    const next=path.join(relative,item.name),full=path.join(dir,item.name);
    if(item.isDirectory()) record(full,next);
    else if(item.isFile()) files.push({path:next.replaceAll('\\','/'),size:fs.statSync(full).size,
      sha256:crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')});
  }
};
record(output);
const snapshot=new DatabaseSync(path.join(output,'data','sisakprod.sqlite'),{readOnly:true});
try { if(snapshot.prepare('PRAGMA integrity_check').get().integrity_check!=='ok') throw new Error('Integritas snapshot database gagal.'); }
finally { snapshot.close(); }
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({format:'sisakprod-backup',version:1,
  createdAt:new Date().toISOString(),files},null,2));
console.log(`Cadangan siap: ${output} (${files.length} berkas).`);
