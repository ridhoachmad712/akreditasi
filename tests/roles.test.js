import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import yauzl from 'yauzl';

const project = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cookie = response => response.headers.get('set-cookie')?.split(';')[0] || '';
function zipEntries(buffer) {
  return new Promise((resolve,reject)=>yauzl.fromBuffer(buffer,{lazyEntries:true},(error,zip)=>{
    if(error) return reject(error);
    const entries=new Map();
    zip.on('error',reject);
    zip.on('end',()=>resolve(entries));
    zip.on('entry',entry=>zip.openReadStream(entry,(streamError,stream)=>{
      if(streamError) return reject(streamError);
      const chunks=[];
      stream.on('data',chunk=>chunks.push(chunk));
      stream.on('error',reject);
      stream.on('end',()=>{entries.set(entry.fileName,Buffer.concat(chunks));zip.readEntry();});
    }));
    zip.readEntry();
  }));
}

test('izin lintas peran, revisi, dan akses baca asesor', { timeout:40000 }, async () => {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sisakprod-roles-'));
  const port=await new Promise((resolve,reject)=>{
    const socket=net.createServer();
    socket.once('error',reject);
    socket.listen(0,'127.0.0.1',()=>{const p=socket.address().port;socket.close(()=>resolve(p));});
  });
  const base=`http://127.0.0.1:${port}`;
  const child=spawn(process.execPath,['server.js'],{cwd:project,
    env:{...process.env,PORT:String(port),SISAKPROD_DATA_DIR:path.join(temp,'data'),SISAKPROD_UPLOAD_DIR:path.join(temp,'uploads')},
    stdio:['ignore','pipe','pipe']});
  let stderr=''; child.stderr.on('data',chunk=>{stderr+=chunk.toString();});
  async function request(url,method='GET',body=null,session='') {
    const options={method,headers:session?{Cookie:session}:{}};
    if(body instanceof FormData) options.body=body;
    else if(body!==null){options.body=JSON.stringify(body);options.headers['Content-Type']='application/json';}
    const response=await fetch(base+url,options);
    return {response,data:await response.json().catch(()=>({}))};
  }
  async function status(url,method,body,session,expected) {
    const result=await request(url,method,body,session);
    assert.equal(result.response.status,expected,`${method} ${url}: ${JSON.stringify(result.data)}`);
    return result.data;
  }
  try {
    for(let i=0;i<60;i++){
      try { if((await fetch(base+'/api/setup-status')).ok) break; }
      catch { await new Promise(r=>setTimeout(r,150)); }
      if(i===59) throw new Error('Server tidak mulai: '+stderr);
    }
    await status('/api/criteria','GET',null,'',401);
    const setup=await request('/api/setup','POST',{name:'Admin',username:'admin',password:'strong-password-123'});
    assert.equal(setup.response.status,201);
    const admin=cookie(setup.response);
    const criteria=(await request('/api/criteria','GET',null,admin)).data;
    for(const account of ['team','validator','validator2','kaprodi','asesor'])
      await status('/api/users','POST',{name:account,username:account,role:account==='validator2'?'validator':account,password:'strong-password-123',...(account==='team'?{criterionIds:[criteria.criteria[0].id]}:{})},admin,201);
    const sessions={};
    for(const account of ['team','validator','validator2','kaprodi','asesor']){
      const login=await request('/api/login','POST',{username:account,password:'strong-password-123'});
      assert.equal(login.response.status,200);
      sessions[account]=cookie(login.response);
    }
    const dimensionId=criteria.criteria[0].dimensions[0].id;
    const indicatorPayload={dimensionId,code:'TEST-IAU-01',text:'Indikator uji peran',sourceRef:'DL-09 uji'};
    await status('/api/indicators','POST',indicatorPayload,sessions.team,403);
    const indicatorId=(await status('/api/indicators','POST',indicatorPayload,admin,201)).id;
    const otherIndicatorId=(await status('/api/indicators','POST',{...indicatorPayload,code:'TEST-IAU-02'},admin,201)).id;
    const evidence=(await request('/api/evidence?criterion=K1','GET',null,admin)).data.items[0];
    const hiddenEvidence=(await request('/api/evidence?criterion=K1','GET',null,admin)).data.items[1];
    const accounts=(await status('/api/users','GET',null,admin,200)).users;
    const teamId=accounts.find(u=>u.username==='team').id;
    const validatorId=accounts.find(u=>u.username==='validator').id;
    const otherValidatorId=accounts.find(u=>u.username==='validator2').id;
    await status(`/api/evidence/${evidence.id}`,'PUT',{status:'collecting',ownerUserId:teamId,validatorUserId:validatorId},admin,200);
    await status(`/api/evidence/${evidence.id}`,'PUT',{status:'uploaded'},sessions.team,403);
    await status(`/api/evidence/${evidence.id}`,'PUT',{status:'collecting',validatorUserId:otherValidatorId},sessions.team,403);
    await status(`/api/evidence/${evidence.id}`,'PUT',{status:'collecting',ownerUserId:accounts.find(u=>u.role==='asesor').id},admin,400);
    await status(`/api/indicators/${otherIndicatorId}/narrative`,'PUT',{sourceUrl:'http://docs.google.com/document/d/uji'},sessions.team,400);
    await status(`/api/indicators/${otherIndicatorId}/narrative`,'PUT',{sourceUrl:'https://docs.google.com/document/d/uji/edit'},sessions.team,200);
    await status(`/api/indicators/${otherIndicatorId}/assessment`,'POST',{result:'not_met',rationale:'Sumber belum ditautkan.'},sessions.team,400);
    await status(`/api/indicators/${otherIndicatorId}/link`,'POST',{evidenceId:hiddenEvidence.id,mappingNote:'Mendukung indikator kedua.',sourceTitle:'Dokumen uji',sourceUrl:'http://drive.google.com/file/d/uji/view'},sessions.team,400);
    assert.equal((await status(`/api/indicators/${otherIndicatorId}`,'GET',null,sessions.team,200)).evidence.length,0);
    await status(`/api/indicators/${otherIndicatorId}/link`,'POST',{evidenceId:hiddenEvidence.id,mappingNote:'Mendukung indikator kedua.',sourceTitle:'Dokumen uji',sourceUrl:'https://drive.google.com/file/d/uji/view'},sessions.team,200);
    assert.equal((await status(`/api/evidence/${hiddenEvidence.id}`,'GET',null,sessions.team,200)).links.length,1);
    const teamTree=(await status('/api/criteria','GET',null,sessions.team,200)).criteria;
    const otherProgress=teamTree.flatMap(c=>c.dimensions.flatMap(d=>d.indicators)).find(i=>i.id===otherIndicatorId);
    assert.equal(otherProgress.has_narrative,1);
    assert.equal(otherProgress.sourced_evidence_count,1);
    await status(`/api/indicators/${otherIndicatorId}/assessment`,'POST',{result:'not_met',rationale:'Dokumen uji belum diverifikasi.'},sessions.team,201);
    await status(`/api/indicators/${indicatorId}/link`,'POST',{evidenceId:evidence.id,mappingNote:'Mendukung indikator uji.'},sessions.team,200);
    const form=new FormData();form.append('file',new Blob(['%PDF-1.4\ntest'],{type:'application/pdf'}),'uji.pdf');
    const fileId=(await status(`/api/evidence/${evidence.id}/files`,'POST',form,sessions.team,201)).id;
    await status(`/api/evidence/${evidence.id}`,'PUT',{status:'verified'},sessions.team,403);
    await status(`/api/evidence/${evidence.id}`,'PUT',{status:'verified'},admin,403);
    await status(`/api/evidence/${evidence.id}`,'PUT',{status:'verified'},sessions.validator2,403);
    await status(`/api/evidence/${evidence.id}`,'PUT',{status:'verified'},sessions.validator,200);
    await status(`/api/indicators/${indicatorId}/narrative`,'PUT',{body:'Narasi pertama.'},sessions.team,200);
    await status(`/api/indicators/${indicatorId}/assessment`,'POST',{result:'met',rationale:'Bukti terverifikasi.'},sessions.validator,403);
    await status(`/api/indicators/${indicatorId}/assessment`,'POST',{result:'met',rationale:'Bukti terverifikasi.'},sessions.kaprodi,403);
    const first=(await status(`/api/indicators/${indicatorId}/assessment`,'POST',{result:'met',rationale:'Bukti terverifikasi.'},sessions.team,201)).id;
    await status(`/api/indicators/${indicatorId}/assessment`,'POST',{result:'met',rationale:'Pengajuan ganda.'},sessions.team,409);
    await status(`/api/assessments/${first}/review`,'POST',{decision:'reviewed'},sessions.team,403);
    await status(`/api/assessments/${first}/review`,'POST',{decision:'reviewed'},sessions.kaprodi,403);
    await status(`/api/assessments/${first}/review`,'POST',{decision:'revision',note:'Perbaiki dasar.'},sessions.validator,200);
    await status(`/api/assessments/${first}/approve`,'POST',{},sessions.kaprodi,409);
    const second=(await status(`/api/indicators/${indicatorId}/assessment`,'POST',{result:'met',rationale:'Dasar diperbaiki.'},sessions.team,201)).id;
    await status(`/api/assessments/${first}/review`,'POST',{decision:'reviewed'},sessions.validator,409);
    await status(`/api/assessments/${second}/review`,'POST',{decision:'reviewed'},sessions.validator,200);
    await status(`/api/indicators/${indicatorId}/narrative`,'PUT',{sourceUrl:'https://docs.google.com/document/d/narasi-uji/edit'},sessions.team,200);
    assert.equal((await status(`/api/indicators/${indicatorId}`,'GET',null,admin,200)).assessment.status,'revision');
    await status(`/api/assessments/${second}/approve`,'POST',{},sessions.kaprodi,409);
    const third=(await status(`/api/indicators/${indicatorId}/assessment`,'POST',{result:'met',rationale:'Narasi terbaru.'},sessions.team,201)).id;
    await status(`/api/assessments/${third}/review`,'POST',{decision:'reviewed'},sessions.validator,200);
    await status(`/api/assessments/${third}/approve`,'POST',{},sessions.validator,403);
    await status(`/api/assessments/${third}/approve`,'POST',{},sessions.kaprodi,200);

    await status('/api/criteria','GET',null,sessions.asesor,403);
    await status('/api/assessor-package','GET',null,sessions.asesor,403);
    await status('/api/settings/assessor-access','POST',{enabled:true},sessions.team,403);
    await status('/api/settings/assessor-access','POST',{enabled:true},sessions.kaprodi,200);
    const assessorCriteria=(await status('/api/criteria','GET',null,sessions.asesor,200)).criteria;
    assert.deepEqual(assessorCriteria.flatMap(c=>c.dimensions.flatMap(d=>d.indicators.map(i=>i.id))),[indicatorId]);
    const assessorEvidence=(await status('/api/evidence','GET',null,sessions.asesor,200)).items;
    assert.deepEqual(assessorEvidence.map(e=>e.id),[evidence.id]);
    const preview=await status('/api/assessor-package','GET',null,sessions.asesor,200);
    assert.equal(preview.indicatorCount,1);
    assert.equal(preview.evidenceCount,1);
    assert.equal(preview.fileCount,1);
    const zipResponse=await fetch(base+'/api/assessor-package/download',{headers:{Cookie:sessions.asesor}});
    assert.equal(zipResponse.status,200);
    assert.match(zipResponse.headers.get('content-type'),/application\/zip/);
    const entries=await zipEntries(Buffer.from(await zipResponse.arrayBuffer()));
    assert.ok(entries.has('index.html'));
    const manifest=JSON.parse(entries.get('manifest.json').toString());
    assert.deepEqual(manifest.indicators.map(i=>i.id),[indicatorId]);
    assert.equal(manifest.indicators[0].narrativeUrl,'https://docs.google.com/document/d/narasi-uji/edit');
    assert.equal(manifest.evidence.length,1);
    assert.ok(entries.has(manifest.evidence[0].files[0].path));
    await status(`/api/indicators/${otherIndicatorId}`,'GET',null,sessions.asesor,404);
    await status(`/api/evidence/${hiddenEvidence.id}`,'GET',null,sessions.asesor,404);
    await status(`/api/files/${fileId}`,'GET',null,sessions.asesor,200);
    for(const url of ['/api/simulation','/api/eligibility','/api/users','/api/audit','/api/mapping-coverage'])
      await status(url,'GET',null,sessions.asesor,403);
    await status(`/api/indicators/${indicatorId}/narrative`,'PUT',{body:'Tidak boleh.'},sessions.asesor,403);

    await status(`/api/indicators/${indicatorId}/narrative`,'PUT',{body:'Narasi diperbarui.'},sessions.team,200);
    assert.equal((await status(`/api/indicators/${indicatorId}`,'GET',null,admin,200)).assessment.status,'revision');
    assert.equal((await status('/api/evidence','GET',null,sessions.asesor,200)).items.length,0);
    await status(`/api/evidence/${evidence.id}`,'GET',null,sessions.asesor,404);
    await status(`/api/files/${fileId}`,'GET',null,sessions.asesor,404);
    await status('/api/assessor-package/download','GET',null,sessions.asesor,409);
    const fourth=(await status(`/api/indicators/${indicatorId}/assessment`,'POST',{result:'met',rationale:'Narasi baru.'},sessions.team,201)).id;
    await status(`/api/assessments/${fourth}/review`,'POST',{decision:'reviewed'},sessions.validator,200);
    await status(`/api/assessments/${fourth}/approve`,'POST',{},sessions.kaprodi,200);
    const replacement=new FormData();replacement.append('file',new Blob(['%PDF-1.4\nversion2'],{type:'application/pdf'}),'versi2.pdf');
    await status(`/api/evidence/${evidence.id}/files`,'POST',replacement,sessions.team,201);
    assert.equal((await status(`/api/indicators/${indicatorId}`,'GET',null,admin,200)).assessment.status,'revision');
    assert.equal((await status('/api/evidence','GET',null,sessions.asesor,200)).items.length,0);
    await status(`/api/evidence/${evidence.id}`,'PUT',{status:'verified'},sessions.validator,200);
    const fifth=(await status(`/api/indicators/${indicatorId}/assessment`,'POST',{result:'met',rationale:'Berkas versi baru.'},sessions.team,201)).id;
    await status(`/api/assessments/${fifth}/review`,'POST',{decision:'reviewed'},sessions.validator,200);
    await status(`/api/assessments/${fifth}/approve`,'POST',{},sessions.kaprodi,200);
    assert.equal((await status('/api/evidence','GET',null,sessions.asesor,200)).items.length,1);
    await status(`/api/evidence/${evidence.id}/links`,'POST',{title:'Sumber tambahan',url:'https://example.org/sumber-baru'},sessions.team,201);
    assert.equal((await status(`/api/indicators/${indicatorId}`,'GET',null,admin,200)).assessment.status,'revision');
    assert.equal((await status(`/api/evidence/${evidence.id}`,'GET',null,admin,200)).item.status,'revision');
    assert.equal((await status('/api/evidence','GET',null,sessions.asesor,200)).items.length,0);
  } finally {
    child.kill();
    if(child.exitCode===null) await new Promise(resolve=>child.once('exit',resolve));
    const resolved=path.resolve(temp);
    if(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('sisakprod-roles-'))
      fs.rmSync(resolved,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
});
