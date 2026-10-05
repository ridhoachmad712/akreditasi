import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const project=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
test('cadangan SQLite WAL dan berkas dapat dipulihkan serta checksum diperiksa',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sisakprod-backup-test-'));
  try {
    const dataDir=path.join(temp,'live-data'),uploadDir=path.join(temp,'live-uploads');
    fs.mkdirSync(dataDir);fs.mkdirSync(uploadDir);
    const live=new DatabaseSync(path.join(dataDir,'sisakprod.sqlite'));
    live.exec('PRAGMA journal_mode=WAL; CREATE TABLE example (value TEXT); INSERT INTO example VALUES (\'baris pertama\')');
    fs.writeFileSync(path.join(uploadDir,'contoh.pdf'),'%PDF-1.4\nfile bukti');
    const backupDir=path.join(temp,'backup');
    execFileSync(process.execPath,['scripts/backup.mjs','--output',backupDir],{cwd:project,
      env:{...process.env,SISAKPROD_DATA_DIR:dataDir,SISAKPROD_UPLOAD_DIR:uploadDir}});
    const manifest=JSON.parse(fs.readFileSync(path.join(backupDir,'manifest.json'),'utf8'));
    assert.equal(manifest.format,'sisakprod-backup');
    assert.equal(manifest.files.length,2);
    const restoredData=path.join(temp,'restored-data'),restoredUploads=path.join(temp,'restored-uploads');
    execFileSync(process.execPath,['scripts/restore.mjs','--backup',backupDir,'--data-dir',restoredData,
      '--upload-dir',restoredUploads],{cwd:project});
    const restored=new DatabaseSync(path.join(restoredData,'sisakprod.sqlite'),{readOnly:true});
    assert.equal(restored.prepare('SELECT value FROM example').get().value,'baris pertama');
    restored.close();
    assert.equal(fs.readFileSync(path.join(restoredUploads,'contoh.pdf'),'utf8'),'%PDF-1.4\nfile bukti');
    fs.writeFileSync(path.join(backupDir,'uploads','contoh.pdf'),'rusak');
    assert.throws(()=>execFileSync(process.execPath,['scripts/restore.mjs','--backup',backupDir,
      '--data-dir',path.join(temp,'another-data'),'--upload-dir',path.join(temp,'another-uploads')],
      {cwd:project,stdio:'pipe'}),/Checksum cadangan tidak cocok/);
    live.close();
  } finally {
    const resolved=path.resolve(temp);
    if(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('sisakprod-backup-test-'))
      fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
});
