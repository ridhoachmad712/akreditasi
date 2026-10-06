import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = path.dirname(here);
function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}
function cookie(response) { return response.headers.get('set-cookie')?.split(';')[0] || ''; }

test('alur bukti sampai persetujuan dan pengaman simulasi', { timeout: 40000 }, async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sisakprod-test-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: project, env: { ...process.env, PORT: String(port), SISAKPROD_DATA_DIR: path.join(temp, 'data'), SISAKPROD_UPLOAD_DIR: path.join(temp, 'uploads') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', x => { stderr += x.toString(); });
  async function request(url, method='GET', body=null, session='') {
    const options = { method, headers: session ? { Cookie: session } : {} };
    if (body instanceof FormData) options.body = body;
    else if (body !== null) { options.body = JSON.stringify(body); options.headers['Content-Type'] = 'application/json'; }
    const response = await fetch(base + url, options);
    const data = await response.json().catch(() => ({}));
    return { response, data };
  }
  try {
    for (let attempt = 0; attempt < 60; attempt++) {
      try { if ((await fetch(base + '/api/setup-status')).ok) break; }
      catch { await new Promise(r => setTimeout(r, 150)); }
      if (attempt === 59) throw new Error('Server tidak mulai: ' + stderr);
    }
    assert.equal((await request('/api/setup-status')).data.needsSetup, true);
    const setup = await request('/api/setup', 'POST', { name:'Admin Uji',username:'admin',password:'strong-password-123' });
    assert.equal(setup.response.status, 201);
    const admin = cookie(setup.response);
    const overview = (await request('/api/overview','GET',null,admin)).data;
    assert.equal(overview.evidence.total, 138);
    assert.equal(overview.indicators.total, 0);
    const criteria = (await request('/api/criteria','GET',null,admin)).data;
    assert.equal(criteria.criteria.length, 7);
    assert.equal(criteria.criteria.flatMap(c => c.dimensions).length, 21);

    for (const [name,username,role] of [
      ['Tim Uji','team','team'],
      ['Validator Uji','validator','validator'],
      ['Kaprodi Uji','kaprodi','kaprodi'],
    ]) {
      const created = await request('/api/users','POST',{ name,username,role,password:'strong-password-123',...(role==='team'?{criterionIds:[criteria.criteria[0].id]}:{}) },admin);
      assert.equal(created.response.status, 201);
    }
    const sessions = {};
    for (const role of ['team','validator','kaprodi']) {
      const result = await request('/api/login','POST',{username:role,password:'strong-password-123'});
      assert.equal(result.response.status, 200);
      sessions[role] = cookie(result.response);
    }
    const indicatorResult = await request('/api/indicators','POST',{
      dimensionId: criteria.criteria[0].dimensions[0].id,code:'IAU-K1-MISI-01',
      text:'Indikator contoh untuk uji alur',sourceRef:'DL-09 halaman uji',standardType:'LAM',
    },admin);
    assert.equal(indicatorResult.response.status, 201);
    const indicatorId = indicatorResult.data.id;
    const evidence = (await request('/api/evidence?criterion=K1','GET',null,admin)).data.items[0];
    assert.equal(evidence.code,'K1.01');
    let coverage=(await request('/api/mapping-coverage','GET',null,admin)).data;
    assert.equal(coverage.evidenceTotal,138);
    assert.equal(coverage.evidenceMapped,0);
    assert.equal(coverage.indicatorTotal,1);
    assert.equal((await request(`/api/indicators/${indicatorId}/link`,'POST',{evidenceId:evidence.id},admin)).response.status,400);
    assert.equal((await request(`/api/indicators/${indicatorId}/link`,'POST',{evidenceId:evidence.id,mappingNote:'Dokumen ini menjelaskan capaian indikator contoh.'},admin)).response.status,200);
    coverage=(await request('/api/mapping-coverage','GET',null,admin)).data;
    assert.equal(coverage.evidenceMapped,1);
    assert.equal(coverage.indicatorsCovered,1);
    assert.equal((await request('/api/evidence?unmapped=1','GET',null,admin)).data.items.length,137);
    const draftBody={result:'met',rationale:'Bukti K1.01 mendukung penilaian awal.'};
    assert.equal((await request(`/api/indicators/${indicatorId}/assessment-draft`,'PUT',draftBody,sessions.team)).response.status,400);
    const form = new FormData();
    form.append('file',new Blob(['%PDF-1.4\nexample'],{type:'application/pdf'}),'contoh.pdf');
    assert.equal((await request(`/api/evidence/${evidence.id}/files`,'POST',form,sessions.team)).response.status,201);
    assert.equal((await request(`/api/indicators/${indicatorId}/assessment`,'POST',draftBody,sessions.team)).response.status,400);
    assert.equal((await request(`/api/indicators/${indicatorId}/assessment-draft`,'PUT',draftBody,sessions.team)).response.status,200);
    assert.equal((await request(`/api/indicators/${indicatorId}`,'GET',null,sessions.team)).data.assessmentDraft.rationale,draftBody.rationale);
    assert.equal((await request('/api/criteria','GET',null,sessions.team)).data.criteria.flatMap(c=>c.dimensions.flatMap(d=>d.indicators)).find(item=>item.id===indicatorId).has_assessment_draft,1);
    assert.equal((await request(`/api/indicators/${indicatorId}/assessment`,'POST',{},sessions.team)).response.status,400);
    assert.equal((await request(`/api/evidence/${evidence.id}`,'PUT',{status:'verified',notes:'Berkas sesuai'},sessions.validator)).response.status,200);
    assert.equal((await request(`/api/indicators/${indicatorId}/narrative`,'PUT',{body:'Narasi contoh.'},sessions.team)).response.status,200);
    const assessment = await request(`/api/indicators/${indicatorId}/assessment`,'POST',{},sessions.team);
    assert.equal(assessment.response.status,201);
    assert.ok((await request(`/api/indicators/${indicatorId}`,'GET',null,sessions.team)).data.assessmentDraft == null);
    assert.equal((await request('/api/criteria','GET',null,sessions.team)).data.criteria.flatMap(c=>c.dimensions.flatMap(d=>d.indicators)).find(item=>item.id===indicatorId).has_assessment_draft,0);
    assert.equal((await request(`/api/indicators/${indicatorId}/assessment-draft`,'PUT',draftBody,sessions.team)).response.status,409);
    assert.equal((await request(`/api/assessments/${assessment.data.id}/review`,'POST',{decision:'reviewed',note:'Sesuai'},sessions.validator)).response.status,200);
    assert.equal((await request(`/api/assessments/${assessment.data.id}/approve`,'POST',{},sessions.kaprodi)).response.status,200);
    const simulation=(await request('/api/simulation','GET',null,admin)).data;
    assert.equal(simulation.summary.approved,1);
    assert.equal(simulation.summary.outcome,'Belum dapat disimpulkan');
    assert.equal((await request('/api/instrument/confirm','POST',{},admin)).response.status,400);
    const seeded=(await request('/api/eligibility','GET',null,admin)).data.rules;
    assert.equal(seeded.length,7);
    assert.equal((await request('/api/eligibility','POST',{
      code:'BAD',label:'Tanpa kategori',operator:'>=',threshold:1,sourceRef:'DL-09',
    },admin)).response.status,409);
    assert.equal((await request('/api/eligibility/confirm-set','POST',{},sessions.kaprodi)).response.status,200);
    const periodEnd=new Date().toISOString().slice(0,10);
    const common={periodEnd,dataSource:'Rekap data uji dari DKPS',evidenceId:evidence.id};
    const lektor=seeded.find(r=>r.code==='S1-LEKTOR');
    assert.equal((await request(`/api/eligibility/${lektor.id}`,'PUT',{...common,numerator:5,denominator:0},sessions.validator)).response.status,400);
    for (const rule of seeded) {
      const measurement=rule.metric==='percentage'?{numerator:rule.code==='S1-MAGISTER'?5:rule.code==='S1-LEKTOR'?2:1,denominator:5}:
        {value:rule.metric==='attestation'?1:2};
      assert.equal((await request(`/api/eligibility/${rule.id}`,'PUT',{...common,...measurement},sessions.validator)).response.status,200);
      assert.equal((await request(`/api/eligibility/${rule.id}/approve`,'POST',{},sessions.kaprodi)).response.status,200);
    }
    const first=seeded[0];
    assert.equal((await request(`/api/eligibility/${first.id}`,'PUT',{...common,value:1},sessions.kaprodi)).response.status,200);
    assert.equal((await request(`/api/eligibility/${first.id}/approve`,'POST',{},sessions.kaprodi)).response.status,403);
    assert.equal((await request(`/api/eligibility/${first.id}`,'PUT',{...common,value:1},sessions.validator)).response.status,200);
    assert.equal((await request(`/api/eligibility/${first.id}/approve`,'POST',{},sessions.kaprodi)).response.status,200);
    let rules=(await request('/api/eligibility','GET',null,admin)).data;
    assert.equal(rules.rulesetConfirmed,true);
    assert.equal(rules.rules.filter(x=>x.approved_by).length,7);
    assert.equal(rules.rules.find(x=>x.code==='S1-LEKTOR').value,40);
    assert.equal(rules.rules.find(x=>x.code==='S1-PUBLIKASI').value,20);
    assert.ok(rules.rules.find(x=>x.code==='S1-LEKTOR').period_start);
    assert.equal((await request('/api/simulation','GET',null,admin)).data.rules.every(r=>r.pass===true),true);
    assert.equal((await request('/api/simulation','GET',null,admin)).data.summary.ready,false);
    const replacement=new FormData();
    replacement.append('file',new Blob(['%PDF-1.4\nreplacement'],{type:'application/pdf'}),'baru.pdf');
    assert.equal((await request(`/api/evidence/${evidence.id}/files`,'POST',replacement,sessions.team)).response.status,201);
    rules=(await request('/api/eligibility','GET',null,admin)).data;
    assert.equal(rules.rules.filter(x=>x.approved_by).length,0);
    const second=(await request('/api/evidence?criterion=K1','GET',null,admin)).data.items.find(x=>x.id!==evidence.id);
    assert.equal((await request(`/api/evidence/${second.id}/links`,'POST',{title:'Bukan URL aman',url:'javascript:alert(1)'},sessions.team)).response.status,400);
    const source=await request(`/api/evidence/${evidence.id}/links`,'POST',{title:'Dokumen bersama',url:'https://example.org/dokumen'},sessions.team);
    assert.equal(source.response.status,201);
    assert.equal((await request(`/api/evidence/${second.id}/links`,'POST',{title:'Dokumen bersama',url:'https://example.org/dokumen'},sessions.team)).data.id,source.data.id);
    assert.equal((await request(`/api/evidence/${second.id}`,'PUT',{status:'verified'},sessions.validator)).response.status,400);
    assert.equal((await request(`/api/evidence-links/${source.data.id}/review`,'POST',{status:'verified'},sessions.validator)).response.status,200);
    assert.equal((await request(`/api/evidence/${second.id}`,'PUT',{status:'verified'},sessions.validator)).response.status,200);
    assert.equal((await request(`/api/evidence-links/${source.data.id}/review`,'POST',{status:'revision',note:'Akses tautan perlu diperbarui'},sessions.validator)).response.status,200);
    assert.equal((await request(`/api/evidence/${second.id}`,'GET',null,admin)).data.item.status,'revision');
    assert.equal((await request(`/api/evidence/${second.id}/links/${source.data.id}`,'DELETE',null,sessions.team)).response.status,200);
    assert.equal((await request(`/api/evidence/${evidence.id}`,'GET',null,admin)).data.links.length,1);
    assert.equal((await request(`/api/indicators/${indicatorId}/link`,'POST',{
      evidenceId:second.id,mappingNote:'Dokumen tambahan mendukung indikator yang sama.',
      sourceTitle:'Bukti tambahan pertama',sourceUrl:'https://example.org/bukti-tambahan-1',
    },sessions.team)).response.status,200);
    let indicatorEvidence=(await request(`/api/indicators/${indicatorId}`,'GET',null,sessions.team)).data.evidence;
    assert.deepEqual(indicatorEvidence.map(item=>item.id).sort((a,b)=>a-b),[evidence.id,second.id].sort((a,b)=>a-b));
    assert.equal(indicatorEvidence.find(item=>item.id===second.id).link_count,1);
    assert.equal((await request(`/api/evidence/${second.id}/links`,'POST',{
      title:'Bukti tambahan kedua',url:'https://example.org/bukti-tambahan-2',
    },sessions.team)).response.status,201);
    indicatorEvidence=(await request(`/api/indicators/${indicatorId}`,'GET',null,sessions.team)).data.evidence;
    assert.equal(indicatorEvidence.find(item=>item.id===second.id).link_count,2);
    assert.equal((await request(`/api/indicators/${indicatorId}/link/${second.id}`,'DELETE',null,sessions.team)).response.status,200);
    assert.deepEqual((await request(`/api/indicators/${indicatorId}`,'GET',null,sessions.team)).data.evidence.map(item=>item.id),[evidence.id]);
  } finally {
    child.kill();
    if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve));
    const resolved = path.resolve(temp);
    if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('sisakprod-test-'))
      fs.rmSync(resolved, { recursive:true, force:true, maxRetries:5, retryDelay:100 });
  }
});
