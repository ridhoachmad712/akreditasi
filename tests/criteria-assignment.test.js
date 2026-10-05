import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const project=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cookie=response=>response.headers.get('set-cookie')?.split(';')[0]||'';

test('admin menugaskan kriteria dan akses tim langsung mengikuti penugasan', {timeout:40000}, async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sisakprod-criteria-'));
  const port=await new Promise((resolve,reject)=>{
    const socket=net.createServer();socket.once('error',reject);
    socket.listen(0,'127.0.0.1',()=>{const p=socket.address().port;socket.close(()=>resolve(p));});
  });
  const base=`http://127.0.0.1:${port}`;
  const child=spawn(process.execPath,['server.js'],{cwd:project,
    env:{...process.env,PORT:String(port),SISAKPROD_DATA_DIR:path.join(temp,'data'),SISAKPROD_UPLOAD_DIR:path.join(temp,'uploads')},
    stdio:['ignore','pipe','pipe']});
  let stderr='';child.stderr.on('data',chunk=>{stderr+=chunk.toString();});
  async function request(url,method='GET',body=null,session=''){
    const options={method,headers:session?{Cookie:session}:{}};
    if(body instanceof FormData)options.body=body;
    else if(body!==null){options.body=JSON.stringify(body);options.headers['Content-Type']='application/json';}
    const response=await fetch(base+url,options);
    return {response,data:await response.json().catch(()=>({}))};
  }
  async function check(url,method,body,session,expected){
    const result=await request(url,method,body,session);
    assert.equal(result.response.status,expected,`${method} ${url}: ${JSON.stringify(result.data)}`);
    return result.data;
  }
  try{
    for(let i=0;i<60;i++){
      try{if((await fetch(base+'/api/setup-status')).ok)break;}
      catch{await new Promise(r=>setTimeout(r,150));}
      if(i===59)throw new Error('Server tidak mulai: '+stderr);
    }
    assert.equal((await request('/api/setup','POST',{name:'Admin',username:'admin',password:'1234567'})).response.status,400);
    const setup=await request('/api/setup','POST',{name:'Admin',username:'admin',password:'12345678'});
    assert.equal(setup.response.status,201);
    const admin=cookie(setup.response);
    assert.equal((await request('/api/login','POST',{username:'ADMIN',password:'12345678'})).response.status,200);
    assert.equal((await request('/api/login','POST',{username:'admin@example.test',password:'12345678'})).response.status,401);
    const criteria=(await check('/api/criteria','GET',null,admin,200)).criteria;
    const [k1,k2]=criteria;
    const a=(await check('/api/users','POST',{name:'Tim K1',username:'k1',password:'strong-password-123',role:'team',criterionIds:[k1.id]},admin,201)).id;
    await check('/api/users','POST',{name:'Terlalu pendek',username:'pendek',password:'1234567',role:'team'},admin,400);
    await check('/api/users','POST',{name:'Nama sama',username:'K1',password:'12345678',role:'team'},admin,409);
    const b=(await check('/api/users','POST',{name:'Tim K2',username:'k2',password:'strong-password-123',role:'team',criterionIds:[k2.id]},admin,201)).id;
    const empty=(await check('/api/users','POST',{name:'Tim Baru',username:'new',password:'strong-password-123',role:'team',criterionIds:[]},admin,201)).id;
    await check('/api/users','POST',{name:'Salah',username:'bad',password:'strong-password-123',role:'team',criterionIds:[99999]},admin,400);
    await check('/api/users','POST',{name:'Validator',username:'validator',password:'strong-password-123',role:'validator',criterionIds:[k1.id]},admin,400);
    const login=await request('/api/login','POST',{username:'k1',password:'strong-password-123'});
    const team=cookie(login.response);
    const newLogin=await request('/api/login','POST',{username:'new',password:'strong-password-123'});
    const unassigned=cookie(newLogin.response);
    const users=(await check('/api/users','GET',null,admin,200)).users;
    assert.deepEqual(users.find(u=>u.id===a).criteria.map(c=>c.code),['K1']);
    assert.deepEqual(users.find(u=>u.id===b).criteria.map(c=>c.code),['K2']);
    assert.deepEqual((await check('/api/criteria','GET',null,team,200)).criteria.map(c=>c.code),['K1']);
    assert.deepEqual((await check('/api/criteria','GET',null,unassigned,200)).criteria,[]);
    assert.equal((await check('/api/overview','GET',null,unassigned,200)).evidence.total,0);
    const k1Evidence=(await check('/api/evidence?criterion=K1','GET',null,admin,200)).items[0];
    const k2Evidence=(await check('/api/evidence?criterion=K2','GET',null,admin,200)).items[0];
    await check(`/api/evidence/${k1Evidence.id}`,'PUT',{status:'collecting',ownerUserId:b},admin,400);
    await check(`/api/evidence/${k1Evidence.id}`,'PUT',{status:'collecting',ownerUserId:a},admin,200);
    const visible=(await check('/api/evidence','GET',null,team,200)).items;
    assert.ok(visible.length>0&&visible.every(e=>e.code.startsWith('K1.')));
    assert.equal((await check('/api/evidence?criterion=K2','GET',null,team,200)).items.length,0);
    assert.equal((await check('/api/mapping-coverage','GET',null,team,200)).evidenceTotal,visible.length);
    assert.equal((await check('/api/overview','GET',null,team,200)).evidence.total,visible.length);
    const i1=(await check('/api/indicators','POST',{dimensionId:k1.dimensions[0].id,code:'TEST-K1',text:'Indikator K1'},admin,201)).id;
    const i2=(await check('/api/indicators','POST',{dimensionId:k2.dimensions[0].id,code:'TEST-K2',text:'Indikator K2'},admin,201)).id;
    assert.equal((await check('/api/criteria','GET',null,team,200)).criteria[0].dimensions[0].indicators.length,1);
    await check(`/api/indicators/${i2}`,'GET',null,team,404);
    await check(`/api/evidence/${k2Evidence.id}`,'GET',null,team,404);
    await check(`/api/indicators/${i2}/narrative`,'PUT',{body:'Tidak boleh'},team,403);
    await check(`/api/indicators/${i2}/assessment`,'POST',{result:'met',rationale:'Tidak boleh'},team,403);
    await check(`/api/indicators/${i1}/link`,'POST',{evidenceId:k2Evidence.id,mappingNote:'Lintas kriteria'},team,403);
    await check('/api/evidence','POST',{code:'K2.999',title:'Di luar tugas'},team,403);
    await check('/api/evidence','POST',{code:'K1.999',title:'Dalam tugas'},team,201);
    await check('/api/simulation','GET',null,team,403);
    await check('/api/eligibility','GET',null,team,403);
    await check(`/api/users/${a}/criteria`,'PUT',{criterionIds:[k2.id]},team,403);
    const form=new FormData();form.append('file',new Blob(['%PDF-1.4\nuji'],{type:'application/pdf'}),'uji.pdf');
    await check(`/api/evidence/${k2Evidence.id}/files`,'POST',form,team,403);
    const fileForm=new FormData();fileForm.append('file',new Blob(['%PDF-1.4\nuji'],{type:'application/pdf'}),'uji.pdf');
    const fileId=(await check(`/api/evidence/${k2Evidence.id}/files`,'POST',fileForm,admin,201)).id;
    const fileResponse=await fetch(base+`/api/files/${fileId}`,{headers:{Cookie:team}});
    assert.equal(fileResponse.status,404);
    await check(`/api/users/${a}/criteria`,'PUT',{criterionIds:[k2.id]},admin,200);
    assert.deepEqual((await check('/api/criteria','GET',null,team,200)).criteria.map(c=>c.code),['K2']);
    assert.equal((await check(`/api/evidence/${k1Evidence.id}`,'GET',null,team,404)).error,'Bukti tidak ditemukan.');
    await check(`/api/evidence/${k2Evidence.id}`,'GET',null,team,200);
    await check(`/api/indicators/${i1}`,'GET',null,team,404);
    await check(`/api/indicators/${i2}/narrative`,'PUT',{body:'Sekarang ditugaskan'},team,200);
    assert.equal((await fetch(base+`/api/files/${fileId}`,{headers:{Cookie:team}})).status,200);
    await check(`/api/users/${a}/criteria`,'PUT',{criterionIds:[]},admin,200);
    assert.deepEqual((await check('/api/criteria','GET',null,team,200)).criteria,[]);
    assert.equal((await check('/api/evidence','GET',null,team,200)).items.length,0);
    assert.equal((await check('/api/overview','GET',null,team,200)).indicators.total,0);
    assert.equal((await check('/api/mapping-coverage','GET',null,team,200)).indicatorTotal,0);
    assert.equal(empty>0,true);
    await check(`/api/users/${a}`,'PUT',{name:'Tim Lain',username:'tim-lain',role:'team',password:'12345678',criterionIds:[k1.id]},team,403);
    await check(`/api/users/${a}`,'PUT',{name:'Tim K1 Baru',username:'admin',role:'team',password:'',criterionIds:[k1.id]},admin,409);
    await check(`/api/users/${a}`,'PUT',{name:'Tim K1 Baru',username:'tim-k1',role:'team',password:'12345678',criterionIds:[k1.id]},admin,200);
    await check(`/api/users/${a}`,'PUT',{name:'Tim K1 Baru',username:'tim-k1',role:'validator',password:'',criterionIds:[]},admin,409);
    assert.equal((await request('/api/me','GET',null,team)).response.status,401);
    assert.equal((await request('/api/login','POST',{username:'k1',password:'strong-password-123'})).response.status,401);
    assert.equal((await request('/api/login','POST',{username:'tim-k1',password:'12345678'})).response.status,200);
    await check(`/api/users/${setup.data.user.id}`,'DELETE',null,admin,400);
    await check(`/api/users/${a}`,'DELETE',null,admin,200);
    assert.equal((await request('/api/login','POST',{username:'tim-k1',password:'12345678'})).response.status,401);
    assert.equal((await check('/api/evidence?criterion=K1','GET',null,admin,200)).items.find(e=>e.id===k1Evidence.id).owner_user_id,null);
    const removed=(await check('/api/users','GET',null,admin,200)).users.find(u=>u.id===a);
    assert.equal(removed.active,0);
    assert.deepEqual(removed.criteria.map(c=>c.code),['K1']);
    await check(`/api/users/${a}/restore`,'POST',null,admin,200);
    assert.equal((await request('/api/login','POST',{username:'tim-k1',password:'12345678'})).response.status,200);
  }finally{
    child.kill();if(child.exitCode===null)await new Promise(resolve=>child.once('exit',resolve));
    const resolved=path.resolve(temp);
    if(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('sisakprod-criteria-'))
      fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
});
