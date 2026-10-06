import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cookie = response => response.headers.get('set-cookie')?.split(';')[0] || '';

test('identitas aplikasi tersimpan, logo dapat diganti, dan hanya admin yang mengubahnya', { timeout: 30000 }, async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),'sisakprod-appearance-'));
  const port = await new Promise((resolve,reject) => {
    const socket = net.createServer();
    socket.once('error',reject);
    socket.listen(0,'127.0.0.1',() => { const value=socket.address().port;socket.close(() => resolve(value)); });
  });
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath,['server.js'],{ cwd:project,
    env:{ ...process.env,PORT:String(port),SISAKPROD_DATA_DIR:path.join(temp,'data'),SISAKPROD_UPLOAD_DIR:path.join(temp,'uploads') },
    stdio:['ignore','ignore','pipe'] });
  let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk.toString();});
  async function request(url,method='GET',body=null,session='') {
    const headers = session ? {Cookie:session} : {};
    if(body!==null && !(body instanceof FormData)) headers['Content-Type']='application/json';
    const response=await fetch(base+url,{method,headers,body:body instanceof FormData?body:body===null?undefined:JSON.stringify(body)});
    return {response,data:await response.json().catch(()=>({}))};
  }
  try {
    for(let index=0;index<60;index++) {
      try { if((await fetch(base+'/api/appearance')).ok) break; }
      catch { await new Promise(resolve=>setTimeout(resolve,100)); }
      if(index===59) throw new Error(`Server tidak mulai: ${stderr}`);
    }
    const initial=(await request('/api/appearance')).data;
    assert.equal(initial.appName,'SISAKPROD');
    assert.equal(initial.logoUrl,'');
    assert.equal(initial.loginTitle,'Login ke aplikasi');
    assert.equal(initial.loginBackgroundUrl,'');
    const setup=await request('/api/setup','POST',{name:'Admin',username:'admin',password:'strong-password-123'});
    assert.equal(setup.response.status,201);
    const admin=cookie(setup.response);
    assert.equal((await request('/api/users','POST',{name:'Tim',username:'tim',password:'strong-password-123',role:'team'},admin)).response.status,201);
    const team=cookie((await request('/api/login','POST',{username:'tim',password:'strong-password-123'})).response);
    const updated={appName:'Akreditasi FEB',subtitle:'S1 Manajemen',footerText:'FEB UNM · 2026',
      loginTitle:'Masuk ke ruang kerja',loginHeadline:'Akreditasi Unggul dimulai di sini',
      loginDescription:'Dokumen dan bukti dalam satu tempat.',loginIntro:'Gunakan akun yang diberikan admin.',
      loginUsernameLabel:'Nama pengguna',loginPasswordLabel:'Sandi akun',loginButtonText:'Lanjut masuk',
      loginBackgroundPosition:'top',accentColor:'#0f766e',font:'open-sans'};
    assert.equal((await request('/api/appearance','PUT',updated,'')).response.status,401);
    assert.equal((await request('/api/appearance','PUT',updated,team)).response.status,403);
    assert.equal((await request('/api/appearance','PUT',{...updated,accentColor:'#ffffff'},admin)).response.status,400);
    assert.equal((await request('/api/appearance','PUT',{...updated,font:'unknown'},admin)).response.status,400);
    assert.equal((await request('/api/appearance','PUT',{...updated,loginBackgroundPosition:'invalid'},admin)).response.status,400);
    const saved=await request('/api/appearance','PUT',updated,admin);
    assert.equal(saved.response.status,200);
    assert.equal(saved.data.appName,updated.appName);
    assert.equal(saved.data.loginHeadline,updated.loginHeadline);
    assert.equal(saved.data.loginButtonText,updated.loginButtonText);
    assert.equal((await request('/api/appearance')).data.font,'open-sans');
    const fontResponse=await fetch(base+'/fonts/open-sans-latin-wght-normal.woff2');
    assert.equal(fontResponse.status,200);
    assert.match(fontResponse.headers.get('content-type'),/font\/woff2/);
    const form=new FormData();
    form.append('logo',new Blob([Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'}),'logo.png');
    assert.equal((await request('/api/appearance/logo','POST',form,team)).response.status,403);
    const upload=await request('/api/appearance/logo','POST',form,admin);
    assert.equal(upload.response.status,201);
    assert.match(upload.data.logoUrl,/^\/api\/appearance\/logo\?v=/);
    const image=await fetch(base+upload.data.logoUrl);
    assert.equal(image.status,200);
    assert.match(image.headers.get('content-type'),/image\/png/);
    assert.equal((await request('/api/appearance/logo','DELETE',null,admin)).response.status,200);
    assert.equal((await request('/api/appearance')).data.logoUrl,'');
    const background=new FormData();
    background.append('background',new Blob([Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'}),'latar.png');
    assert.equal((await request('/api/appearance/login-background','POST',background,team)).response.status,403);
    const backgroundUpload=await request('/api/appearance/login-background','POST',background,admin);
    assert.equal(backgroundUpload.response.status,201);
    assert.match(backgroundUpload.data.loginBackgroundUrl,/^\/api\/appearance\/login-background\?v=/);
    const imageResponse=await fetch(base+backgroundUpload.data.loginBackgroundUrl);
    assert.equal(imageResponse.status,200);
    assert.match(imageResponse.headers.get('content-type'),/image\/png/);
    assert.equal((await request('/api/appearance/login-background','DELETE',null,team)).response.status,403);
    assert.equal((await request('/api/appearance/login-background','DELETE',null,admin)).response.status,200);
    assert.equal((await request('/api/appearance')).data.loginBackgroundUrl,'');
  } finally {
    child.kill();
    if(child.exitCode===null) await new Promise(resolve=>child.once('exit',resolve));
    const resolved=path.resolve(temp);
    if(resolved.startsWith(path.resolve(os.tmpdir())+path.sep) && path.basename(resolved).startsWith('sisakprod-appearance-'))
      fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
});
