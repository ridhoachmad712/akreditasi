import test from 'node:test';
import assert from 'node:assert/strict';
import { projectUnggul } from '../simulation.js';
import { S1_RULES, periodFromEnd } from '../s1-rules.js';

test('ambang 40/52 dan syarat perlu menghasilkan proyeksi berbeda', () => {
  const base={ready:true,requiredPassed:8,eligibilityPassed:true,qualificationPassed:true,publicationPassed:true};
  assert.equal(projectUnggul({...base,ready:false,passed:58}),'Belum dapat disimpulkan');
  assert.equal(projectUnggul({...base,passed:39}),'Simulasi: belum memenuhi Unggul');
  assert.equal(projectUnggul({...base,passed:40}),'Simulasi: Unggul 2 tahun');
  assert.equal(projectUnggul({...base,passed:52}),'Simulasi: Unggul 5 tahun');
  assert.equal(projectUnggul({...base,passed:52,publicationPassed:false}),'Simulasi: Unggul 2 tahun');
  assert.equal(projectUnggul({...base,passed:58,requiredPassed:7}),'Simulasi: belum memenuhi Unggul');
});

test('master S1 dan periode pengukuran tiga tahun', () => {
  assert.equal(S1_RULES.length,7);
  assert.equal(S1_RULES.find(r=>r.code==='S1-MAGISTER').threshold,100);
  assert.equal(S1_RULES.find(r=>r.code==='S1-LEKTOR').threshold,40);
  assert.equal(S1_RULES.find(r=>r.code==='S1-PUBLIKASI').threshold,20);
  assert.deepEqual(periodFromEnd('2026-09-30',3),{start:'2023-10-01',end:'2026-09-30'});
  assert.equal(periodFromEnd('2026-02-30',3),null);
});
