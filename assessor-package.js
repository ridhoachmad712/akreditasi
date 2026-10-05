import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ZipArchive } from 'archiver';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeName = value => String(value ?? '').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(0,120) || 'berkas';
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export function buildAssessorPackage(db, uploadDir) {
  const get=(sql,...args)=>db.prepare(sql).get(...args);
  const all=(sql,...args)=>db.prepare(sql).all(...args);
  const instrument=get('SELECT name,source_url FROM instrument_versions ORDER BY id DESC LIMIT 1');
  const approved=all(`SELECT i.id,i.code,i.text,i.source_ref,d.title AS dimension,c.code AS criterion,
    n.body AS narrative,n.source_url AS narrativeUrl,a.result,a.rationale,a.approved_at
    FROM indicators i JOIN dimensions d ON d.id=i.dimension_id JOIN criteria c ON c.id=d.criterion_id
    JOIN assessments a ON a.id=(SELECT id FROM assessments WHERE indicator_id=i.id ORDER BY id DESC LIMIT 1)
    LEFT JOIN narratives n ON n.indicator_id=i.id WHERE a.status='approved' ORDER BY c.sort_order,d.sort_order,i.id`);
  const evidenceById=new Map(), filesById=new Map(), invalidIndicators=[];
  const indicators=[];
  for(const indicator of approved) {
    const linked=all(`SELECT e.id,e.code,e.title,e.status,ie.mapping_note
      FROM indicator_evidence ie JOIN evidence_requests e ON e.id=ie.evidence_id
      WHERE ie.indicator_id=? ORDER BY e.code`,indicator.id);
    if(!linked.length || linked.some(e=>e.status!=='verified')) {
      invalidIndicators.push(indicator.code);
      continue;
    }
    indicators.push({...indicator,evidence:linked.map(e=>({code:e.code,mappingNote:e.mapping_note}))});
    for(const item of linked) {
      if(evidenceById.has(item.id)) continue;
      const files=all(`SELECT id,stored_name,original_name,size,version FROM evidence_files
        WHERE evidence_id=? ORDER BY version DESC`,item.id).map(file=>{
        const stored=path.join(uploadDir,path.basename(file.stored_name));
        const archivePath=`bukti/${safeName(item.code)}/${file.id}-${safeName(file.original_name)}`;
        const entry={name:file.original_name,version:file.version,size:file.size,path:archivePath};
        filesById.set(file.id,{stored,archivePath,entry});
        return entry;
      });
      const links=all(`SELECT l.title,l.url FROM evidence_link_usage elu
        JOIN evidence_links l ON l.id=elu.link_id
        WHERE elu.evidence_id=? AND l.status='verified' ORDER BY l.id`,item.id);
      evidenceById.set(item.id,{code:item.code,title:item.title,files,links});
    }
  }
  const missingFiles=[];
  for(const file of filesById.values()) {
    if(!fs.existsSync(file.stored) || !fs.statSync(file.stored).isFile()) missingFiles.push(file.archivePath);
    else file.entry.sha256=sha256(file.stored);
  }
  return {generatedAt:new Date().toISOString(),instrument,indicators,evidence:[...evidenceById.values()],
    invalidIndicators,missingFiles,archiveFiles:[...filesById.values()]};
}

export function assessorHtml(pkg) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Paket Baca Asesor SISAKPROD</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:1000px;margin:32px auto;padding:0 20px;color:#173147}h1,h2{line-height:1.2}section{border:1px solid #ccd8df;border-radius:12px;padding:22px;margin:20px 0}small{color:#536b79}pre{white-space:pre-wrap;font:inherit}a{color:#075e86}li{margin:9px 0}</style></head><body>
  <h1>Paket Baca Asesor</h1><p>S1 Manajemen FEB UNM · dibuat ${esc(pkg.generatedAt)}<br>${esc(pkg.instrument?.name||'Instrumen IAU')}</p>
  <p>Hanya indikator dengan penilaian disetujui dan bukti terverifikasi yang disertakan. Tautan eksternal memerlukan akses internet.</p>
  <h2>Indikator (${pkg.indicators.length})</h2>${pkg.indicators.map(i=>`<section><h3>${esc(i.code)} · ${esc(i.dimension)}</h3><p>${esc(i.text)}</p>
    <p><strong>Hasil:</strong> ${i.result==='met'?'Melampaui SN-Dikti':'Belum melampaui SN-Dikti'} · Disetujui ${esc(i.approved_at)}</p>
    <p><strong>Alasan:</strong> ${esc(i.rationale)}</p><h4>Narasi</h4>${i.narrativeUrl?`<p><a href="${esc(i.narrativeUrl)}" target="_blank" rel="noopener noreferrer">Buka dokumen narasi</a> (akses ke sumber diperlukan)</p>`:`<pre>${esc(i.narrative||'')}</pre>`}<h4>Bukti</h4><ul>${i.evidence.map(link=>{
      const e=pkg.evidence.find(x=>x.code===link.code);
      return `<li><strong>${esc(e.code)} · ${esc(e.title)}</strong><br><small>Dasar hubungan: ${esc(link.mappingNote)}</small>
        ${e.files.length?`<ul>${e.files.map(f=>`<li><a href="${esc(f.path)}">${esc(f.name)}</a> (versi ${f.version})</li>`).join('')}</ul>`:''}
        ${e.links.length?`<ul>${e.links.map(l=>`<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.title)}</a></li>`).join('')}</ul>`:''}</li>`;
    }).join('')}</ul></section>`).join('')}</body></html>`;
}

export function streamAssessorZip(pkg, output) {
  const archive=new ZipArchive({zlib:{level:6}});
  archive.on('error',error=>output.destroy(error));
  archive.on('warning',error=>output.destroy(error));
  archive.pipe(output);
  const {archiveFiles,...manifest}=pkg;
  archive.append(assessorHtml(pkg),{name:'index.html'});
  archive.append(JSON.stringify(manifest,null,2),{name:'manifest.json'});
  for(const file of archiveFiles) archive.file(file.stored,{name:file.archivePath});
  void archive.finalize();
}
