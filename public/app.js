const root = document.querySelector('#app');
const toastBox = document.querySelector('#toast');
const state = { user: null, appearance: null, view: 'dashboard', selected: null, criteria: null, evidencePage: 1, evidenceReturnIndicator: null, evidenceFilter: { q:'', criterion:'', status:'', unmapped:'' } };
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = value => value ? new Date(value).toLocaleString('id-ID') : '—';
const roleName = { admin:'Admin', team:'Tim penyusun', validator:'Validator', kaprodi:'Ketua prodi', asesor:'Asesor' };
const evidenceStatus = { needed:'Belum dikumpulkan', collecting:'Pengumpulan', uploaded:'Sumber tersedia', verified:'Terverifikasi', revision:'Perlu revisi' };
const linkStatus = { pending:'Menunggu pemeriksaan', verified:'Terverifikasi', revision:'Perlu revisi' };
const assessmentStatus = { submitted:'Menunggu pemeriksaan', reviewed:'Menunggu persetujuan', approved:'Disetujui', revision:'Perlu revisi' };
const canEdit = () => state.user && state.user.role !== 'asesor';
const canManage = () => ['admin','kaprodi'].includes(state.user?.role);
const canReview = () => ['validator','kaprodi'].includes(state.user?.role);
const canAssessmentReview = () => state.user?.role === 'validator';
const defaultAppearance = { appName:'SISAKPROD', subtitle:'S1 Manajemen · FEB UNM', footerText:'Program Studi S1 Manajemen · FEB UNM',
  loginTitle:'Login ke aplikasi', loginHeadline:'Ruang kerja Akreditasi Unggul',
  loginDescription:'Dokumen, narasi, dan bukti terhubung dalam satu ruang kerja.',
  loginIntro:'', loginUsernameLabel:'Username', loginPasswordLabel:'Kata sandi', loginButtonText:'Masuk',
  loginBackgroundPosition:'center', loginBackgroundUrl:'', accentColor:'#2563eb', font:'inter', logoUrl:'' };
const fontStacks = { inter:'Inter, "Segoe UI", Arial, sans-serif', 'open-sans':'"Open Sans", "Segoe UI", Arial, sans-serif', system:'system-ui, sans-serif', segoe:'"Segoe UI", Arial, sans-serif', arial:'Arial, sans-serif' };
function appearance(){ return state.appearance || defaultAppearance; }
function applyAppearance(){
  const value=appearance();
  document.documentElement.style.setProperty('--forest',value.accentColor);
  document.documentElement.style.setProperty('--app-font',fontStacks[value.font]||fontStacks.inter);
  document.title=`${value.appName} | Akreditasi Unggul S1 Manajemen`;
  let icon=document.querySelector('link[rel="icon"]');
  if(value.logoUrl){ if(!icon){icon=document.createElement('link');icon.rel='icon';document.head.append(icon);}icon.href=value.logoUrl; }
  else icon?.remove();
}
function brandMarkup(){
  const value=appearance();
  return `<div class="brandmark">${value.logoUrl?`<img src="${esc(value.logoUrl)}" alt="" width="34" height="34">`:`<b>${esc(value.appName.charAt(0).toLocaleUpperCase('id-ID'))}</b>`}<span>${esc(value.appName)}<small>${esc(value.subtitle)}</small></span></div>`;
}
let toastTimer;
function toast(message, error=false){ toastBox.textContent=message; toastBox.classList.toggle('error',error); toastBox.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toastBox.classList.remove('show'),3800); }
async function api(url, options={}) {
  const response = await fetch(url,{ credentials:'same-origin', ...options,
    headers: options.body instanceof FormData ? (options.headers||{}) : { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(options.headers||{}) } });
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error || `Permintaan gagal (${response.status})`);
  return data;
}
const json = value => JSON.stringify(value);
const iconPaths = {
  home:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z"/>',
  chart:'<path d="M4 20V10m6 10V5m6 15v-8m4 8H2"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
  file:'<path d="M6 2h8l5 5v15H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M14 2v5h5M8 12h8M8 16h8"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  checkCircle:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clipboard:'<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4.5h6M8 10h8m-8 4h8"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.07 0l2-2A5 5 0 0 0 12 3.93l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.07l1.1-1.1"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2zM17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  logout:'<path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  eye:'<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/>',
  eyeOff:'<path d="M3 3l18 18M10.6 6.1A11 11 0 0 1 12 6c6 0 9.5 6 9.5 6a14 14 0 0 1-3.1 3.7M6.2 7.6C3.8 9.3 2.5 12 2.5 12s3.5 6 9.5 6c1.2 0 2.3-.2 3.3-.6"/><path d="M10 10a2.8 2.8 0 0 0 4 4"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>'
};
const icon = (name, className='') => `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]||iconPaths.file}</svg>`;
const percent = (value,total) => total>0 ? Math.max(0,Math.min(100,Math.round(value/total*100))) : 0;
function progressBar(label,value,total,tone='accent'){
  return `<div class="progress-track ${tone}" role="progressbar" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${Number(total)||0}" aria-valuenow="${Number(value)||0}"><span style="width:${percent(value,total)}%"></span></div>`;
}
function tag(label, tone='gray'){return `<span class="pill ${tone}">${esc(label)}</span>`;}
function statusTag(status){ const tone={verified:'green',uploaded:'blue',collecting:'amber',revision:'red',approved:'green',reviewed:'blue',submitted:'amber',needed:'gray'}[status]||'gray'; return tag(evidenceStatus[status]||assessmentStatus[status]||status,tone); }
function linkStatusTag(status){ return tag(linkStatus[status]||status,{pending:'amber',verified:'green',revision:'red'}[status]||'gray'); }
function teamIndicatorProgress(i){return `<small class="indicator-progress">Bukti: ${i.evidence_count?`${i.sourced_evidence_count}/${i.evidence_count} memiliki sumber`:'belum ditautkan'} · Penilaian: ${esc(assessmentStatus[i.assessment_status]||(i.has_assessment_draft?'draf tersimpan':'belum diisi'))} · Narasi: ${i.has_narrative?'tersedia':'belum ada'}</small>`;}
function teamIndicatorStage(i){
  if(i.assessment_status==='revision'||i.has_revision_evidence)return 'revision';
  if(['submitted','reviewed'].includes(i.assessment_status))return 'waiting';
  if(i.assessment_status==='approved')return 'approved';
  if(!i.has_narrative&&!i.evidence_count&&!i.has_assessment_draft)return 'new';
  if(!i.has_narrative||!i.evidence_count||i.sourced_evidence_count<i.evidence_count||!i.has_assessment_draft)return 'incomplete';
  return 'ready';
}
function teamDashboardDimension(d){
  const stages=d.indicators.map(teamIndicatorStage);
  const started=stages.filter(stage=>stage!=='new').length;
  const revision=stages.filter(stage=>stage==='revision').length;
  const ready=stages.filter(stage=>stage==='ready').length;
  const waiting=stages.filter(stage=>stage==='waiting').length;
  const attention=revision?`${revision} perlu revisi`:ready?`${ready} siap diajukan`:waiting?`${waiting} menunggu pemeriksaan`:'';
  const labels={revision:'Perlu revisi',incomplete:'Perlu dilengkapi',ready:'Siap diajukan',new:'Belum dikerjakan',waiting:'Menunggu pemeriksaan',approved:'Disetujui'};
  return `<details class="team-dimension"><summary><span class="team-dimension-name"><strong>${esc(d.code)}</strong> ${esc(d.title)}</span><span class="team-dimension-count">${started}/${d.indicators.length} mulai dikerjakan${attention?` · ${esc(attention)}`:''}</span>${progressBar(`${d.code} mulai dikerjakan`,started,d.indicators.length)}</summary>
    <div class="team-dimension-indicators">${d.indicators.length?d.indicators.map(i=>{
      const stage=teamIndicatorStage(i);
      return `<div class="team-subindicator"><div><strong>${esc(i.code)}</strong><p>${esc(i.text)}</p></div><div class="team-subindicator-actions">${tag(labels[stage],stage==='revision'?'red':stage==='approved'?'green':stage==='ready'?'blue':'amber')}${button('Buka indikator','dashboard-indicator-'+i.id)}</div></div>`;
    }).join(''):empty('Belum ada indikator pada subkriteria ini.')}</div></details>`;
}
const field = (label, name, value='', type='text', extra='') => `<div class="field"><label for="${esc(name)}">${esc(label)}</label><input id="${esc(name)}" name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${extra}></div>`;
const option = (value,label,selected=false) => `<option value="${esc(value)}" ${selected?'selected':''}>${esc(label)}</option>`;
const note = (text,warn=false) => `<div class="note ${warn?'warn':''}">${esc(text)}</div>`;
const empty = text => `<div class="empty">${esc(text)}</div>`;
const button = (text, action, cls='button') => `<button type="button" class="${cls}" data-action="${esc(action)}">${esc(text)}</button>`;
function bind(selector,event,handler){ root.querySelector(selector)?.addEventListener(event,handler); }
function bindAll(selector,event,handler){ root.querySelectorAll(selector).forEach(el=>el.addEventListener(event,handler)); }
function bindOptionSearch(selector){
  bindAll(selector,'input',event=>{
    const input=event.currentTarget, select=input.nextElementSibling;
    if(!input._options)input._options=[...select.options].map(option=>({value:option.value,label:option.textContent}));
    const selected=select.value, query=input.value.trim().toLocaleLowerCase('id-ID');
    select.replaceChildren(...input._options.filter(option=>!option.value||option.value===selected||option.label.toLocaleLowerCase('id-ID').includes(query)).map(option=>new Option(option.label,option.value,option.value===selected,option.value===selected)));
  });
}
function handleError(error){ toast(error.message || String(error),true); }
function shell(content) {
  const groups=[{label:'Dokumen',icon:'folder',items:[['criteria','Instrumen IAU','clipboard'],['evidence','Katalog bukti','file']]},
    {label:'Penilaian',icon:'chart',items:[]},{label:'Administrasi',icon:'settings',items:[]}];
  if(['admin','validator','kaprodi'].includes(state.user.role)) groups[1].items.push(['simulation','Simulasi','chart'],['eligibility','Syarat perlu','checkCircle']);
  if(['admin','kaprodi','asesor'].includes(state.user.role)) groups[1].items.push(['assessorPackage','Paket asesor','folder']);
  if(canManage()) groups[2].items.push(['users','Pengguna','users'],['audit','Riwayat aktivitas','clock']);
  if(state.user.role==='admin') groups[2].items.push(['settings','Pengaturan tampilan','settings']);
  const activeNav={indicator:'criteria',evidenceDetail:'evidence'}[state.view]||state.view;
  root.innerHTML=`<a class="skip-link" href="#main-content">Lewati navigasi</a><div class="app-shell"><header class="app-header"><div class="topbar">${brandMarkup()}
    <nav class="nav" aria-label="Menu utama"><button class="${activeNav==='dashboard'?'active':''}" data-nav="dashboard" ${activeNav==='dashboard'?'aria-current="page"':''}>${icon('home')}Ringkasan</button>${groups.filter(group=>group.items.length).map(group=>`<details class="nav-group ${group.items.some(([view])=>view===activeNav)?'active':''}"><summary>${icon(group.icon)}${group.label}<span class="nav-chevron" aria-hidden="true"></span></summary><div class="nav-menu">${group.items.map(([view,label,iconName])=>`<button class="${activeNav===view?'active':''}" data-nav="${view}" ${activeNav===view?'aria-current="page"':''}>${icon(iconName)}${label}</button>`).join('')}</div></details>`).join('')}</nav>
    <div class="right"><details class="account-menu"><summary aria-label="Menu akun ${esc(state.user.name)}"><span class="account-role ${state.user.role==='admin'?'is-admin':''}">${esc(state.user.role==='admin'?'Super Admin':roleName[state.user.role])}</span><span class="account-avatar" aria-hidden="true">${esc(state.user.name.trim().charAt(0).toLocaleUpperCase('id-ID'))}</span></summary><div class="account-popover"><div class="account-popover-head"><strong>${esc(state.user.name)}</strong><small>@${esc(state.user.username)}</small></div><button id="logout" type="button">${icon('logout')}Keluar dari akun</button></div></details></div></div></header>
    <div class="main">
    <main class="page" id="main-content" tabindex="-1">${content}</main><footer class="site-footer">${esc(appearance().footerText)}</footer></div></div>`;
  bindAll('.nav-group','toggle',e=>{if(e.currentTarget.open){root.querySelectorAll('.nav-group').forEach(group=>{if(group!==e.currentTarget)group.open=false;});root.querySelector('.account-menu').open=false;}});
  bind('.account-menu','toggle',e=>{if(e.currentTarget.open)root.querySelectorAll('.nav-group').forEach(group=>group.open=false);});
  bindAll('[data-nav]','click',e=>go(e.currentTarget.dataset.nav));
  bind('#main-content','click',()=>root.querySelectorAll('.nav-group, .account-menu').forEach(group=>group.open=false));
  bind('#logout','click',async()=>{try{await api('/api/logout',{method:'POST'});state.user=null;await boot();}catch(e){handleError(e);}});
}
function viewTitle(){return {dashboard:'Ringkasan',criteria:'Instrumen IAU',indicator:'Detail indikator',evidence:'Katalog bukti',evidenceDetail:'Detail bukti',simulation:'Simulasi',eligibility:'Syarat perlu',assessorPackage:'Paket asesor',users:'Pengguna',audit:'Riwayat aktivitas',settings:'Pengaturan tampilan'}[state.view]||appearance().appName;}
function heading(kicker,title,description,actions=''){return `<div class="page-head"><div><div class="eyebrow">${esc(kicker)}</div><h1>${esc(title)}</h1><p class="muted">${esc(description)}</p></div><div class="button-row">${actions}</div></div>`;}
async function go(view,selected=null){ state.view=view;state.selected=selected;root.innerHTML='<div class="loading">Memuat...</div>';try{
  if(view==='dashboard') await renderDashboard(); else if(view==='criteria') await renderCriteria(); else if(view==='indicator') await renderIndicator(selected);
  else if(view==='evidence') await renderEvidence(); else if(view==='evidenceDetail') await renderEvidenceDetail(selected);
  else if(view==='simulation') await renderSimulation(); else if(view==='eligibility') await renderEligibility();
  else if(view==='assessorPackage') await renderAssessorPackage();
  else if(view==='users') await renderUsers(); else if(view==='audit') await renderAudit(); else if(view==='settings') await renderSettings();
}catch(e){handleError(e);root.innerHTML=`<div class="loading">${esc(e.message)}</div>`;}}

async function boot(){
  try{state.appearance=await api('/api/appearance');applyAppearance();}catch{state.appearance={...defaultAppearance};applyAppearance();}
  try{const data=await api('/api/me');state.user=data.user;await go('dashboard');}
  catch{const status=await api('/api/setup-status');renderAuth(status.needsSetup);}
}
function renderAuth(setup){
  const value=appearance();
  root.innerHTML=`<div class="auth-shell ${value.loginBackgroundUrl?'has-photo':''}"><main class="auth-main"><div class="auth-content">
    <section class="auth-story" aria-label="Identitas aplikasi"><div class="auth-identity">${brandMarkup()}</div>
      <div class="auth-story-copy"><h1>${esc(value.loginHeadline)}</h1>${value.loginDescription?`<p>${esc(value.loginDescription)}</p>`:''}</div>
      <div class="auth-story-art" aria-hidden="true"><span></span><span></span><span></span></div>
    </section>
    <section class="auth-card" aria-labelledby="auth-title"><div class="auth-card-head"><span class="auth-card-mark" aria-hidden="true">${icon('lock')}</span>
      <h2 id="auth-title">${esc(setup?'Buat akun admin':value.loginTitle)}</h2>
      ${(setup||value.loginIntro)?`<p>${esc(setup?'Siapkan akun pertama untuk mengelola aplikasi.':value.loginIntro)}</p>`:''}</div>
      <form id="auth-form">${setup?field('Nama lengkap','name','','text','required autocomplete="name"'):''}
        ${field(setup?'Username':value.loginUsernameLabel,'username','','text','required autocomplete="username" autocapitalize="none" spellcheck="false" minlength="2" maxlength="32" pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,31}"')}
        <div class="field password-field"><label for="password">${esc(setup?'Kata sandi':value.loginPasswordLabel)}</label><div class="password-control"><input id="password" name="password" type="password" required autocomplete="${setup?'new-password':'current-password'}" ${setup?'minlength="8"':''}><button type="button" class="password-toggle" aria-label="Tampilkan kata sandi" aria-pressed="false">${icon('eye')}</button></div></div>
        ${setup?'<p class="mini">Kata sandi minimal 8 karakter.</p>':''}
        <button class="button primary auth-submit">${esc(setup?'Buat akun':value.loginButtonText)}${icon('arrow')}</button><div id="auth-error" class="login-error" role="alert"></div></form>
    </section></div></main><footer class="auth-footer">${esc(value.footerText)}</footer></div>`;
  if(value.loginBackgroundUrl){
    const shell=root.querySelector('.auth-shell');
    shell.style.setProperty('--auth-photo',`url("${value.loginBackgroundUrl}")`);
    shell.style.setProperty('--auth-position',value.loginBackgroundPosition||'center');
  }
  bind('.password-toggle','click',event=>{
    const password=root.querySelector('#password'),visible=password.type==='password';
    password.type=visible?'text':'password';
    event.currentTarget.setAttribute('aria-pressed',String(visible));
    event.currentTarget.setAttribute('aria-label',visible?'Sembunyikan kata sandi':'Tampilkan kata sandi');
    event.currentTarget.innerHTML=icon(visible?'eyeOff':'eye');
  });
  bind('#auth-form','submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const payload=Object.fromEntries(f.entries());try{
    const result=await api(setup?'/api/setup':'/api/login',{method:'POST',body:json(payload)});state.user=result.user;await go('dashboard');
  }catch(error){root.querySelector('#auth-error').textContent=error.message;}});
}

function renderTeamDashboard(data,tree){
  const criteria=tree.criteria.map(c=>{
    const indicators=c.dimensions.flatMap(d=>d.indicators),total=indicators.length;
    const stages=indicators.map(teamIndicatorStage);
    const started=stages.filter(stage=>stage!=='new').length;
    const approved=stages.filter(stage=>stage==='approved').length;
    const waiting=stages.filter(stage=>stage==='waiting').length;
    const revision=stages.filter(stage=>stage==='revision').length;
    return {criterion:c,total,started,approved,waiting,revision,toDo:total-approved-waiting};
  });
  const totals=criteria.reduce((sum,item)=>({toDo:sum.toDo+item.toDo,waiting:sum.waiting+item.waiting,approved:sum.approved+item.approved}),{toDo:0,waiting:0,approved:0});
  shell(`${heading('Beranda','Kriteria tugas Anda',`${tree.criteria.length} kriteria ditugaskan. Pilih kriteria untuk melanjutkan pekerjaan.`)}
    ${data.instrument.status!=='confirmed'&&tree.criteria.length?'<p class="team-dashboard-note">Pemetaan instrumen menunggu konfirmasi admin. Bukti, penilaian awal, dan narasi tetap dapat disiapkan.</p>':''}
    ${criteria.length?`<section class="team-overview" aria-label="Ringkasan pekerjaan">${[['Perlu tindakan',totals.toDo,'clipboard'],['Menunggu pemeriksaan',totals.waiting,'clock'],['Disetujui',totals.approved,'checkCircle']].map(([label,count,iconName])=>`<div><span class="team-overview-icon">${icon(iconName)}</span><strong>${count}</strong><span>${label}</span></div>`).join('')}</section>
      <div class="team-criteria-grid">${criteria.map(({criterion:c,total,started,approved,revision})=>{
      return `<section class="team-criterion-section"><div class="team-criterion-header"><div class="team-criterion-identity"><span class="criterion-code">${esc(c.code)}</span><div><h2>${esc(c.title)}</h2><p>${total} indikator · ${approved} disetujui${revision?` · ${revision} perlu revisi`:''}</p></div></div>${button('Lihat di Instrumen IAU','criterion-'+c.id,'button text-button')}</div><div class="team-criterion-progress"><span>${started} dari ${total} indikator mulai dikerjakan</span>${progressBar(`${c.code} mulai dikerjakan`,started,total)}</div>
        <div class="team-dimensions">${c.dimensions.map(teamDashboardDimension).join('')}</div></section>`;
    }).join('')}</div>`:`<section class="panel team-criterion-card"><h2>Belum ada kriteria tugas</h2><p>Hubungi admin untuk mendapatkan penugasan.</p></section>`}`);
  bindAll('[data-action^="criterion-"]','click',event=>go('criteria',Number(event.currentTarget.dataset.action.split('-')[1])));
  bindAll('[data-action^="dashboard-indicator-"]','click',event=>go('indicator',Number(event.currentTarget.dataset.action.split('-')[2])));
}

async function renderDashboard(){
  const [data, tree]=await Promise.all([api('/api/overview'),api('/api/criteria')]);state.criteria=tree;
  if(state.user.role==='team')return renderTeamDashboard(data,tree);
  const approved=data.indicators.approved||0,mapped=data.indicators.total||0,expected=data.instrument.expected_indicators;
  const team=state.user.role==='team';
  const evidenceTotal=data.evidence.total||0,verified=data.evidence.verified||0;
  const cards=[
    {label:'Kebutuhan bukti',number:evidenceTotal,foot:'Dalam katalog dokumen',icon:'folder',tone:'accent'},
    {label:'Bukti terverifikasi',number:verified,foot:'Sudah diperiksa',icon:'checkCircle',tone:'green'},
    {label:'Indikator dipetakan',number:`${mapped}/${expected}`,foot:'Cakupan instrumen IAU',icon:'clipboard',tone:'violet'},
    {label:'Penilaian disetujui',number:approved,foot:'Keputusan akhir internal',icon:'chart',tone:'amber'}
  ];
  const next=team?[['Buka indikator tugas','Tulis narasi dan tentukan bukti yang mendukung.','criteria'],['Kelola dokumen bukti','Tautkan dokumen yang sudah ada pada kebutuhan bukti.','evidence']]:state.user.role==='validator'?[['Periksa bukti','Tinjau sumber yang sudah dikumpulkan tim.','evidence'],['Tinjau indikator','Periksa penilaian yang diajukan tim.','criteria'],['Isi syarat perlu','Catat data ukur dan sumbernya.','eligibility']]:state.user.role==='kaprodi'?[['Tinjau indikator','Periksa penilaian yang menunggu persetujuan.','criteria'],['Setujui syarat perlu','Periksa nilai dan sumber data.','eligibility'],['Lihat simulasi','Tinjau proyeksi dari data yang disetujui.','simulation']]:[['Periksa instrumen','Tinjau pemetaan indikator resmi.','criteria'],['Kelola bukti','Lihat kebutuhan dan cakupan pemetaan.','evidence'],['Lihat simulasi','Tinjau kesiapan dari keputusan yang disetujui.','simulation']];
  shell(`${heading('Beranda',team?'Ruang kerja kriteria Anda':'Ringkasan pekerjaan',team?'Pantau indikator dan bukti pada kriteria yang ditugaskan admin.':'Pantau perkembangan instrumen, bukti, dan penilaian dalam satu tempat.')}
    ${team&&!tree.criteria.length?note('Belum ada kriteria yang ditugaskan kepada akun Anda. Hubungi admin untuk penugasan.',true):''}
    ${data.instrument.status!=='confirmed'?note(team?'Pemetaan instrumen menunggu konfirmasi admin. Anda tetap dapat menyiapkan narasi dan bukti.':'Instrumen masih dalam tahap pemetaan. Simulasi belum dapat menyimpulkan kesiapan Unggul.',true):''}
    ${team?`<section class="panel team-guide"><h2>Alur kerja tim kriteria</h2><p>Mulai dari indikator tugas Anda: simpan narasi, hubungkan kebutuhan bukti, tempel tautan dokumen yang sudah dikerjakan, lalu ajukan penilaian. Unggah berkas tersedia bila tautan tidak dapat digunakan. Validator memeriksa bukti dan usulan; ketua prodi memberi persetujuan akhir.</p></section>`:''}
    <div class="grid stats dashboard-stats">${cards.map(c=>`<div class="stat"><div class="stat-top"><span class="stat-icon ${c.tone}">${icon(c.icon)}</span><span class="label">${esc(c.label)}</span></div><div class="number">${esc(c.number)}</div><div class="foot">${esc(c.foot)}</div></div>`).join('')}</div>
    <section class="panel dashboard-progress"><div class="section-head"><div><h2>Progres kerja akreditasi</h2><p class="mini">Pemetaan instrumen, pemeriksaan bukti, dan persetujuan adalah tahapan yang berbeda.</p></div></div><div class="progress-grid">
      ${[['Pemetaan instrumen',mapped,expected,'accent','clipboard'],['Verifikasi bukti',verified,evidenceTotal,'green','checkCircle'],['Persetujuan penilaian',approved,mapped,'violet','chart']].map(([label,value,total,tone,iconName])=>`<div class="progress-item"><div class="progress-item-head"><span>${icon(iconName)}${label}</span><strong>${value}/${total}</strong></div>${progressBar(label,value,total,tone)}</div>`).join('')}
    </div></section>
    <div class="split"><section class="panel"><div class="section-head"><h2>Kriteria ${team?'tugas':'instrumen'}</h2><span class="mini">${tree.criteria.length} kriteria</span></div>${tree.criteria.length?tree.criteria.map(c=>{
      const indicators=c.dimensions.flatMap(d=>d.indicators);
      return `<div class="criterion"><div class="criterion-head"><div class="button-row"><span class="criterion-code">${esc(c.code)}</span><div><div class="criterion-title">${esc(c.title)}</div><p>${c.dimensions.length} dimensi · ${indicators.length} indikator</p></div></div>${button('Buka','criterion-'+c.id)}</div></div>`;}).join(''):empty('Belum ada kriteria yang ditugaskan.')}</section>
    <section class="panel next-panel"><h2>Arah kerja</h2><div class="work-list">${next.map(([title,detail,route],i)=>`<div class="work-item"><span class="work-number">${String(i+1).padStart(2,'0')}</span><div><strong>${esc(title)}</strong><p>${esc(detail)}</p>${button('Buka halaman','next-'+route,'button text-button')}</div></div>`).join('')}</div></section></div>`);
  bindAll('[data-action^="criterion-"]','click',e=>go('criteria',Number(e.currentTarget.dataset.action.split('-')[1])));
  bindAll('[data-action^="next-"]','click',e=>go(e.currentTarget.dataset.action.slice(5)));
}

async function renderCriteria(){
  const tree=await api('/api/criteria');state.criteria=tree;
  const mapped=tree.criteria.flatMap(c=>c.dimensions.flatMap(d=>d.indicators)).length;
  const dimensionOptions=tree.criteria.flatMap(c=>c.dimensions.map(d=>option(d.id,`${c.code} · ${d.title}`))).join('');
  shell(`${heading('Instrumen',state.user.role==='team'?'Indikator tugas Anda':'Kriteria dan indikator',state.user.role==='team'?'Buka indikator untuk menyusun narasi, menautkan bukti, dan mengajukan penilaian.':'Struktur IAU menjadi dasar narasi, bukti, dan penilaian.',canManage()?`${mapped===0?button('Muat 58 indikator DL-09','import-master','button primary'):button('Tambah indikator','new-indicator','button')}${tree.instrument.status!=='confirmed'?button('Konfirmasi pemetaan','confirm-instrument'):''}`:'')}
    ${note(state.user.role==='team'?`${tree.criteria.length} kriteria ditugaskan kepada Anda, dengan ${mapped} indikator. Acuan: ${tree.instrument.name}.`:`${tree.criteria.length} kriteria dan 21 dimensi tersedia. ${mapped} dari ${tree.instrument.expected_indicators} indikator telah dipetakan. Acuan: ${tree.instrument.name}.` ,tree.instrument.status!=='confirmed')}
    ${canManage()?`<section id="new-indicator-panel" class="panel" hidden><h2>Tambah indikator dari panduan resmi</h2><form id="indicator-form"><div class="form-grid"><div class="field"><label>Dimensi</label><select name="dimensionId" required>${dimensionOptions}</select></div>${field('Kode indikator','code','','text','required')}
    <div class="field wide"><label>Teks indikator</label><textarea name="text" required></textarea></div>${field('Jenis standar','standardType','LAM')}${field('Rujukan dokumen dan halaman','sourceRef','','text','required')}<div class="field"><label><input type="checkbox" name="isRequiredUnggul"> Termasuk 8 indikator syarat perlu Unggul</label></div></div><div class="form-actions"><button class="button primary">Simpan indikator</button></div></form></section>`:''}
    ${tree.criteria.map(c=>`<section class="panel criterion-section" id="criterion-${c.id}"><div class="button-row"><span class="criterion-code">${esc(c.code)}</span><h2 style="margin:0">${esc(c.title)}</h2></div>
    ${c.dimensions.map(d=>`<div class="dim-title">${esc(d.code)} · ${esc(d.title)} <span class="mini">(${d.indicators.length} indikator)</span></div>
      ${d.indicators.length?`<div class="list">${d.indicators.map(i=>`<div class="list-item"><div><strong>${esc(i.code)}</strong><small>${esc(i.text)}</small>${state.user.role==='team'?teamIndicatorProgress(i):''}</div>${button('Buka','indicator-'+i.id)}</div>`).join('')}</div>`:empty('Indikator belum dipetakan.')}`).join('')}</section>`).join('')}`);
  bind('[data-action="new-indicator"]','click',()=>{const p=root.querySelector('#new-indicator-panel');p.hidden=!p.hidden;p.scrollIntoView({behavior:'smooth'});});
  bind('[data-action="import-master"]','click',async()=>{try{const result=await api('/api/instrument/import-master',{method:'POST'});toast(`${result.count} indikator dimuat. Periksa sebelum konfirmasi.`);await go('criteria');}catch(error){handleError(error);}});
  bind('[data-action="confirm-instrument"]','click',async()=>{try{await api('/api/instrument/confirm',{method:'POST'});toast('Pemetaan instrumen dikonfirmasi.');await go('criteria');}catch(error){handleError(error);}});
  bind('#indicator-form','submit',async e=>{e.preventDefault();try{await api('/api/indicators',{method:'POST',body:json(Object.fromEntries(new FormData(e.currentTarget).entries()))});toast('Indikator ditambahkan.');await go('criteria');}catch(error){handleError(error);}});
  bindAll('[data-action^="indicator-"]','click',e=>go('indicator',Number(e.currentTarget.dataset.action.split('-')[1])));
  if(state.selected)root.querySelector(`#criterion-${state.selected}`)?.scrollIntoView({block:'start'});
}

async function renderIndicator(indicatorId){
  const [data,ev]=await Promise.all([api(`/api/indicators/${indicatorId}`),api('/api/evidence')]);
  const a=data.assessment, draft=data.assessmentDraft, i=data.indicator;
  const team=state.user.role==='team';
  const assessmentLocked=['submitted','reviewed','approved'].includes(a?.status);
  const verifiedEvidence=data.evidence.filter(e=>e.status==='verified').length;
  const selectable=ev.items.filter(x=>!data.evidence.some(y=>y.id===x.id));
  const narrativeMode=data.narrative?.source_url?'link':data.narrative?.body?'text':team?'link':'text';
  const hasNarrative=!!(data.narrative?.body?.trim()||data.narrative?.source_url);
  const hasSources=data.evidence.length>0&&data.evidence.every(e=>e.file_count+e.link_count>0);
  const readyToSubmit=hasNarrative&&hasSources&&!!draft;
  const assessmentStage=a?.status==='approved'?'Disetujui':a?.status==='reviewed'?'Menunggu persetujuan':a?.status==='submitted'?'Menunggu pemeriksaan':draft?'Draf tersimpan':a?.status==='revision'?'Perlu revisi':'Belum diisi';
  const assessmentDone=!!draft||['submitted','reviewed','approved'].includes(a?.status);
  const steps=[
    {label:'Bukti',status:hasSources?'Sumber lengkap':data.evidence.length?'Perlu sumber':'Belum tertaut',done:hasSources,icon:'link',target:'indicator-evidence'},
    {label:'Penilaian',status:assessmentStage,done:assessmentDone,icon:'checkCircle',target:'indicator-assessment'},
    {label:'Narasi',status:hasNarrative?readyToSubmit?'Siap diajukan':'Tersedia':'Belum ada',done:hasNarrative&&assessmentLocked,icon:'file',target:'indicator-narrative'}
  ];
  const currentStep=steps.findIndex(step=>!step.done);
  const narrativeEditor=`<div class="indicator-narrative-editor"><div class="field"><label for="narrative-mode">Sumber narasi</label><select id="narrative-mode">${option('text','Tulis di aplikasi',narrativeMode==='text')}${option('link','Tautkan dokumen yang sudah ada',narrativeMode==='link')}</select></div>
    <div id="narrative-text-field" ${narrativeMode==='link'?'hidden':''}><label for="narrative">Isi narasi</label><textarea id="narrative">${esc(data.narrative?.body||'')}</textarea></div>
    <div id="narrative-link-field" ${narrativeMode==='text'?'hidden':''}><label for="narrative-url">Tautan dokumen narasi</label><input id="narrative-url" type="url" pattern="https://.*" placeholder="https://docs.google.com/document/..." value="${esc(data.narrative?.source_url||'')}"><p class="mini">Pastikan pemeriksa dapat membuka dokumen ini.</p></div>
    <div class="form-actions">${button('Simpan narasi','save-narrative','button primary')}</div></div>`;
  shell(`<div class="indicator-page"><div class="indicator-top">${heading(`${i.code} · ${i.criterion_title}`,i.dimension_title,i.text,button('Kembali ke daftar','back-criteria'))}
    <aside class="panel indicator-reference" aria-labelledby="indicator-reference-title"><h2 id="indicator-reference-title">Rujukan indikator</h2><p class="muted">${esc(i.source_ref||'Rujukan belum diisi.')}</p>${i.is_required_unggul?tag('Syarat perlu Unggul','blue'):tag('Indikator umum')}</aside></div>
    <nav class="indicator-steps" aria-label="Tahapan indikator">${steps.map((step,index)=>`<a class="indicator-step ${step.done?'done':index===currentStep?'current':''}" href="#${step.target}" aria-label="${index+1}. ${step.label}: ${step.status}"><span class="indicator-step-icon">${icon(step.icon)}</span><span><strong>${index+1}. ${step.label}</strong><small>${step.status}</small></span></a>`).join('')}</nav>
    <div class="detail-grid ${team?'team-flow':''}"><div><section class="panel" id="indicator-narrative"><div class="indicator-section-head"><h2>${team?'3. Narasi':'Narasi indikator'}</h2><span class="mini">${hasNarrative?'Tersimpan':'Belum diisi'}</span></div>
    ${canEdit()?team&&hasNarrative?`<div class="narrative-saved">${data.narrative?.source_url?`<a href="${esc(data.narrative.source_url)}" target="_blank" rel="noopener noreferrer">Buka dokumen narasi ↗</a>`:'Narasi sudah tersimpan.'}<span class="mini">${fmt(data.narrative?.updated_at)}</span></div><details class="narrative-edit"><summary>Ubah narasi</summary>${narrativeEditor}</details>`:narrativeEditor:data.narrative?.source_url?`<p><a href="${esc(data.narrative.source_url)}" target="_blank" rel="noopener noreferrer">Buka dokumen narasi</a></p>`:`<div class="narrative-readonly">${esc(data.narrative?.body||'Belum ada narasi.')}</div>`}
    ${team&&!assessmentLocked?`<div class="indicator-submit"><p class="mini">${!hasSources?'Lengkapi bukti di tahap 1.':!draft?'Simpan penilaian awal di tahap 2.':!hasNarrative?'Simpan narasi untuk mengajukan penilaian.':'Bukti, penilaian awal, dan narasi sudah siap untuk pemeriksaan.'}</p><button type="button" class="button primary" data-action="submit-assessment" ${readyToSubmit?'':'disabled'}>${a?.status==='revision'?'Ajukan ulang':'Ajukan untuk pemeriksaan'}</button></div>`:''}</section>
    <section class="panel" id="indicator-evidence"><div class="indicator-section-head"><h2>${team?'1. Bukti pendukung':'Bukti tertaut'}</h2><span class="mini">${data.evidence.length} bukti · ${verifiedEvidence} terverifikasi</span></div>${data.evidence.length?`<div class="list">${data.evidence.map(e=>`<div class="list-item"><div><strong>${esc(e.code)} · ${esc(e.title)}</strong><small>${statusTag(e.status)} · ${e.link_count} tautan · ${e.file_count} berkas</small><small>Dasar hubungan: ${esc(e.mapping_note||'Belum dicatat')}</small></div><div class="button-row">${button(team?'Lihat dokumen':'Buka','evidence-'+e.id)}${canEdit()?button('Lepas','unlink-'+e.id):''}</div></div>`).join('')}</div>`:empty('Belum ada bukti yang ditautkan.')}
    ${canEdit()?`<details class="evidence-add" ${data.evidence.length?'':'open'}><summary>+ Tambah bukti pendukung</summary>${selectable.length?`<div class="field"><label for="link-evidence">Pilih bukti dari katalog</label>${team?'':`<input id="evidence-option-search" class="option-search" type="search" placeholder="Cari kode atau judul...">`}<select id="link-evidence" aria-label="Pilih bukti">${option('','Pilih bukti')}${selectable.map(e=>option(e.id,`${e.code} · ${e.title}`)).join('')}</select></div><div class="field"><label for="mapping-note">Hubungan dengan indikator</label><input id="mapping-note" maxlength="2000" placeholder="Contoh: Menunjukkan kesesuaian kurikulum dengan CPL"></div>${team?`<div class="form-grid"><div class="field"><label for="new-source-title">Judul dokumen</label><input id="new-source-title" placeholder="Contoh: Peta kurikulum"></div><div class="field"><label for="new-source-url">Tautan dokumen</label><input id="new-source-url" type="url" pattern="https://.*" placeholder="https://drive.google.com/..."></div></div><p class="mini">Kosongkan kolom dokumen jika sumbernya sudah ada di katalog.</p>`:''}${button(team?'Simpan bukti':'Tautkan bukti','link-evidence','button primary')}`:`<p class="mini">Semua bukti yang tersedia sudah terhubung.</p>${button('Buka katalog bukti','open-evidence-catalog')}`}</details>`:''}
    ${team&&data.evidence.length?`<details class="evidence-more-sources"><summary>Tambah tautan dokumen pada bukti yang sudah terhubung</summary><form id="existing-link-form"><div class="field"><label for="existing-evidence">Bukti pendukung</label><select id="existing-evidence" name="evidenceId" required>${option('','Pilih bukti')}${data.evidence.map(e=>option(e.id,`${e.code} · ${e.title}`)).join('')}</select></div><div class="form-grid"><div class="field"><label for="existing-source-title">Judul dokumen</label><input id="existing-source-title" name="title" required placeholder="Contoh: Statuta UNM"></div><div class="field"><label for="existing-source-url">Tautan dokumen (HTTPS)</label><input id="existing-source-url" name="url" type="url" pattern="https://.*" required placeholder="https://drive.google.com/..."></div></div><button class="button primary">Simpan tautan dokumen</button></form></details>`:''}</section></div>
    <div><section class="panel" id="indicator-assessment"><div class="indicator-section-head"><h2>${team?'2. Penilaian awal':'Penilaian internal'}</h2>${draft?tag('Draf tersimpan','blue'):''}</div>${a?`<div class="meta"><dt>Pelampauan SN-Dikti</dt><dd>${a.result==='met'?'Melampaui':'Belum melampaui'}</dd><dt>Status</dt><dd>${statusTag(a.status)}</dd><dt>Pengusul</dt><dd>${esc(a.proposer_name)}</dd><dt>Pemeriksa</dt><dd>${esc(a.reviewer_name||'—')}</dd><dt>Penyetuju</dt><dd>${esc(a.approver_name||'—')}</dd></div><p><strong>Alasan:</strong> ${esc(a.rationale)}</p>${a.review_note?`<p><strong>Catatan pemeriksaan:</strong> ${esc(a.review_note)}</p>`:''}`:!team&&!draft?empty('Belum ada penilaian.'):''}
    ${team?assessmentLocked?`<p class="mini">${a.status==='submitted'?'Usulan sedang diperiksa validator.':a.status==='reviewed'?'Usulan menunggu persetujuan ketua prodi.':'Usulan telah disetujui.'} Jika narasi atau sumber bukti berubah, usulan perlu diajukan ulang.</p>`:`<p class="mini">${hasSources?'Isi hasil dan alasan berdasarkan bukti yang telah disiapkan. Pengajuan dilakukan setelah narasi di tahap 3.':'Lengkapi sumber bukti di tahap 1 sebelum menyimpan penilaian awal.'}</p><form id="assessment-draft-form"><div class="field"><label for="assessment-result">Pelampauan SN-Dikti</label><select id="assessment-result" name="result" required>${option('','Pilih hasil')}${option('met','Melampaui',(draft?.result||a?.result)==='met')}${option('not_met','Belum melampaui',(draft?.result||a?.result)==='not_met')}</select></div><div class="field"><label for="assessment-rationale">Alasan dan rujukan bukti</label><textarea id="assessment-rationale" name="rationale" required placeholder="Jelaskan dasar penilaian dan kode bukti yang digunakan">${esc(draft?.rationale||a?.rationale||'')}</textarea></div><button class="button primary" ${hasSources?'':'disabled'}>Simpan penilaian awal</button></form>`:''}
    ${a?.status==='submitted'&&canAssessmentReview()?`<div class="divider"></div><h3>Pemeriksaan</h3><textarea id="review-note" placeholder="Catatan pemeriksaan"></textarea><div class="button-row" style="margin-top:10px">${button('Terima pemeriksaan','review-ok','button primary')}${button('Minta revisi','review-revision','button')}</div>`:''}
    ${a?.status==='reviewed'&&state.user.role==='kaprodi'?`<div class="divider"></div>${button('Setujui penilaian','approve-assessment','button primary')}`:''}</section>
    ${canManage()?`<section class="panel"><h2>Ubah pemetaan indikator</h2><form id="edit-indicator-form"><div class="field"><label>Teks indikator</label><textarea name="text" required>${esc(i.text)}</textarea></div>${field('Rujukan dan halaman','sourceRef',i.source_ref,'text','required')}<div class="field"><label><input type="checkbox" name="isRequiredUnggul" ${i.is_required_unggul?'checked':''}> Termasuk 8 indikator syarat perlu Unggul</label></div><button class="button">Simpan pemetaan</button></form></section>`:''}</div></div></div>`);
  if(team){
    const workflow=root.querySelector('.team-flow');
    workflow.replaceChildren(root.querySelector('#indicator-evidence'),root.querySelector('#indicator-assessment'),root.querySelector('#indicator-narrative'));
  }
  bind('[data-action="back-criteria"]','click',()=>go('criteria'));
  bindOptionSearch('.option-search');
  bind('#narrative-mode','change',event=>{const linked=event.currentTarget.value==='link';root.querySelector('#narrative-text-field').hidden=linked;root.querySelector('#narrative-link-field').hidden=!linked;});
  bind('#edit-indicator-form','submit',async e=>{e.preventDefault();try{await api(`/api/indicators/${indicatorId}`,{method:'PUT',body:json(Object.fromEntries(new FormData(e.currentTarget).entries()))});toast('Pemetaan diperbarui.');await go('indicator',indicatorId);}catch(error){handleError(error);}});
  bind('[data-action="save-narrative"]','click',async()=>{const linked=root.querySelector('#narrative-mode').value==='link';const body=linked?'':root.querySelector('#narrative').value,sourceUrl=linked?root.querySelector('#narrative-url').value:'';try{await api(`/api/indicators/${indicatorId}/narrative`,{method:'PUT',body:json({body,sourceUrl})});toast('Narasi disimpan.');await go('indicator',indicatorId);root.querySelector('#indicator-narrative')?.scrollIntoView();}catch(e){handleError(e);}});
  bind('#existing-link-form','submit',async event=>{event.preventDefault();const form=Object.fromEntries(new FormData(event.currentTarget).entries());try{await api(`/api/evidence/${form.evidenceId}/links`,{method:'POST',body:json({title:form.title,url:form.url})});toast('Tautan dokumen ditambahkan.');await go('indicator',indicatorId);root.querySelector('#indicator-evidence')?.scrollIntoView();}catch(error){handleError(error);}});
  bind('[data-action="link-evidence"]','click',async()=>{const evidenceId=Number(root.querySelector('#link-evidence').value),mappingNote=root.querySelector('#mapping-note').value;const sourceTitle=root.querySelector('#new-source-title')?.value||'',sourceUrl=root.querySelector('#new-source-url')?.value||'';if(!evidenceId)return toast('Pilih bukti.',true);if(!mappingNote.trim())return toast('Isi dasar hubungan bukti.',true);if(Boolean(sourceTitle.trim())!==Boolean(sourceUrl.trim()))return toast('Isi judul dan tautan dokumen bersama-sama.',true);try{await api(`/api/indicators/${indicatorId}/link`,{method:'POST',body:json({evidenceId,mappingNote,sourceTitle,sourceUrl})});toast('Bukti ditambahkan. Anda dapat menambahkan bukti lain.');await go('indicator',indicatorId);root.querySelector('#indicator-evidence')?.scrollIntoView();}catch(e){handleError(e);}});
  bind('[data-action="open-evidence-catalog"]','click',()=>go('evidence'));
  bindAll('[data-action^="evidence-"]','click',e=>{state.evidenceReturnIndicator=indicatorId;go('evidenceDetail',Number(e.currentTarget.dataset.action.split('-')[1]));});
  bindAll('[data-action^="unlink-"]','click',async e=>{if(!window.confirm('Lepaskan bukti dari indikator ini? Berkas tetap tersimpan pada katalog bukti.'))return;try{await api(`/api/indicators/${indicatorId}/link/${e.currentTarget.dataset.action.split('-')[1]}`,{method:'DELETE'});await go('indicator',indicatorId);}catch(error){handleError(error);}});
  bind('#assessment-draft-form','submit',async e=>{e.preventDefault();try{await api(`/api/indicators/${indicatorId}/assessment-draft`,{method:'PUT',body:json(Object.fromEntries(new FormData(e.currentTarget).entries()))});toast('Penilaian awal disimpan. Lanjutkan ke narasi.');await go('indicator',indicatorId);root.querySelector('#indicator-assessment')?.scrollIntoView();}catch(error){handleError(error);}});
  bind('[data-action="submit-assessment"]','click',async()=>{try{await api(`/api/indicators/${indicatorId}/assessment`,{method:'POST',body:json({})});toast('Penilaian diajukan untuk pemeriksaan.');await go('indicator',indicatorId);root.querySelector('#indicator-narrative')?.scrollIntoView();}catch(error){handleError(error);}});
  for(const [action,decision] of [['review-ok','reviewed'],['review-revision','revision']])bind(`[data-action="${action}"]`,'click',async()=>{try{await api(`/api/assessments/${a.id}/review`,{method:'POST',body:json({decision,note:root.querySelector('#review-note').value})});toast('Pemeriksaan tersimpan.');await go('indicator',indicatorId);}catch(e){handleError(e);}});
  bind('[data-action="approve-assessment"]','click',async()=>{try{await api(`/api/assessments/${a.id}/approve`,{method:'POST'});toast('Penilaian disetujui.');await go('indicator',indicatorId);}catch(e){handleError(e);}});
}

async function renderEvidence(){
  const f=state.evidenceFilter;
  const tree=await api('/api/criteria');
  const criterionCodes=tree.criteria.map(c=>c.code);
  if(state.user.role==='team'&&f.criterion&&!criterionCodes.includes(f.criterion))f.criterion='';
  const params=new URLSearchParams(Object.entries(f).filter(([,v])=>v));
  const [data,coverage]=await Promise.all([api(`/api/evidence?${params}`),canEdit()?api('/api/mapping-coverage'):Promise.resolve(null)]);
  const canAdd=canEdit()&&(state.user.role!=='team'||criterionCodes.length>0);
  const pageSize=20,total=data.items.length,pages=Math.max(1,Math.ceil(total/pageSize));
  state.evidencePage=Math.min(state.evidencePage,pages);
  const start=(state.evidencePage-1)*pageSize;
  const visibleItems=data.items.slice(start,start+pageSize);
  shell(`${heading('Dokumen','Katalog kebutuhan bukti',state.user.role==='team'?'Pilih kebutuhan pada kriteria tugas Anda, lalu tempel tautan dokumen yang sudah dikerjakan.':'Daftar awal diimpor dari spreadsheet kerja tim akreditasi.',canAdd?button(state.user.role==='team'?'Buat kebutuhan baru':'Tambah kebutuhan bukti','new-evidence',state.user.role==='team'?'button':'button primary'):'')}
    ${coverage?`<section class="panel coverage-panel"><div class="section-head"><h2>Cakupan pemetaan</h2><span class="mini">Hubungan bukti dan indikator</span></div><div class="coverage-grid"><div class="progress-item"><div class="progress-item-head"><span>${icon('folder')}Bukti terhubung</span><strong>${coverage.evidenceMapped}/${coverage.evidenceTotal}</strong></div>${progressBar('Bukti terhubung',coverage.evidenceMapped,coverage.evidenceTotal)}</div><div class="progress-item"><div class="progress-item-head"><span>${icon('clipboard')}Indikator didukung bukti</span><strong>${coverage.indicatorsCovered}/${coverage.indicatorTotal}</strong></div>${progressBar('Indikator didukung bukti',coverage.indicatorsCovered,coverage.indicatorTotal,'green')}</div></div><p class="mini">${coverage.unmappedEvidence.length} kebutuhan bukti belum dipetakan · ${coverage.uncoveredIndicators.length} indikator belum didukung bukti.</p>${coverage.uncoveredIndicators.length?`<details><summary>Lihat indikator tanpa bukti</summary><div class="list">${coverage.uncoveredIndicators.map(i=>`<div class="list-item"><div><strong>${esc(i.code)}</strong><small>${esc(i.text)}</small></div>${button('Buka','indicator-'+i.id)}</div>`).join('')}</div></details>`:''}</section>`:''}
    <div class="toolbar" role="search"><label class="sr-only" for="search">Cari bukti</label><div class="search-field">${icon('search')}<input id="search" type="search" placeholder="Cari kode, judul, atau sumber..." value="${esc(f.q)}"></div><label class="sr-only" for="criterion">Filter kriteria</label><select id="criterion">${option('','Semua kriteria')}${criterionCodes.map(x=>option(x,x,x===f.criterion)).join('')}</select>
    <label class="sr-only" for="status-filter">Filter status</label><select id="status-filter">${option('','Semua status')}${Object.entries(evidenceStatus).map(([x,y])=>option(x,y,x===f.status)).join('')}</select>${coverage?`<label class="sr-only" for="mapping-filter">Filter pemetaan</label><select id="mapping-filter">${option('','Semua pemetaan',!f.unmapped)}${option('1','Belum dipetakan',f.unmapped==='1')}</select>`:''}<div class="toolbar-actions">${button('Cari','search','button')}${Object.values(f).some(Boolean)?button('Reset','reset-search','button ghost'):''}</div></div>
    ${canAdd?`<section id="new-evidence-panel" class="panel" hidden><h2>Tambah kebutuhan bukti</h2>${state.user.role==='team'?`<p class="mini">Gunakan awalan kode kriteria tugas: ${criterionCodes.map(esc).join(', ')}.</p>`:''}<form id="new-evidence-form"><div class="form-grid">${field('Kode bukti','code','','text','required')}${field('Judul bukti','title','','text','required')}${field('Unit sumber','sourceUnit')}${field('Penanggung jawab','picLabel')}</div><button class="button primary">Simpan</button></form></section>`:''}
    <section class="panel evidence-panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Kode</th><th>Kebutuhan bukti</th><th>Sumber</th><th>PIC</th><th>Status</th><th>Berkas</th><th>Tautan</th><th>Indikator</th><th>Tindakan</th></tr></thead><tbody>
    ${visibleItems.map(e=>`<tr><td><strong>${esc(e.code)}</strong></td><td><span class="evidence-title">${icon('file')}${esc(e.title)}</span></td><td>${esc(e.source_unit||'—')}</td><td>${esc(e.pic_label||'—')}</td><td>${statusTag(e.status)}</td><td>${e.file_count}</td><td>${e.link_count}</td><td>${e.indicator_count}</td><td class="actions">${button('Buka','evidence-'+e.id)}</td></tr>`).join('')}</tbody></table></div>
    <div class="evidence-cards">${visibleItems.map(e=>`<article class="evidence-card"><div><strong>${icon('file')}${esc(e.code)} · ${esc(e.title)}</strong>${statusTag(e.status)}</div><p class="mini">Sumber: ${esc(e.source_unit||'—')} · ${e.file_count} berkas · ${e.link_count} tautan</p>${button('Buka bukti','evidence-'+e.id)}</article>`).join('')}</div>
    ${!total?empty('Tidak ada bukti sesuai pencarian.'):`<div class="table-footer"><span>Menampilkan ${start+1}–${Math.min(start+pageSize,total)} dari ${total} bukti</span><div class="button-row"><button type="button" class="button" data-action="previous-page" ${state.evidencePage===1?'disabled':''}>Sebelumnya</button><span class="mini">${state.evidencePage}/${pages}</span><button type="button" class="button" data-action="next-page" ${state.evidencePage===pages?'disabled':''}>Berikutnya</button></div></div>`}</section>`);
  bind('[data-action="search"]','click',()=>{state.evidencePage=1;state.evidenceFilter={q:root.querySelector('#search').value,criterion:root.querySelector('#criterion').value,status:root.querySelector('#status-filter').value,unmapped:root.querySelector('#mapping-filter')?.value||''};go('evidence');});
  bind('[data-action="reset-search"]','click',()=>{state.evidencePage=1;state.evidenceFilter={q:'',criterion:'',status:'',unmapped:''};go('evidence');});
  bind('[data-action="previous-page"]','click',()=>{state.evidencePage--;go('evidence');});
  bind('[data-action="next-page"]','click',()=>{state.evidencePage++;go('evidence');});
  bind('#search','keydown',e=>{if(e.key==='Enter')root.querySelector('[data-action="search"]').click();});
  bindAll('[data-action^="evidence-"]','click',e=>{state.evidenceReturnIndicator=null;go('evidenceDetail',Number(e.currentTarget.dataset.action.split('-')[1]));});
  bindAll('[data-action^="indicator-"]','click',e=>go('indicator',Number(e.currentTarget.dataset.action.split('-')[1])));
  bind('[data-action="new-evidence"]','click',()=>{root.querySelector('#new-evidence-panel').hidden=false;});
  bind('#new-evidence-form','submit',async e=>{e.preventDefault();try{await api('/api/evidence',{method:'POST',body:json(Object.fromEntries(new FormData(e.currentTarget).entries()))});toast('Kebutuhan bukti ditambahkan.');await go('evidence');}catch(error){handleError(error);}});
}

async function renderEvidenceDetail(evidenceId){
  const [data,users,tree]=await Promise.all([api(`/api/evidence/${evidenceId}`),canManage()?api('/api/users'):Promise.resolve({users:[]}),canEdit()?api('/api/criteria'):Promise.resolve(null)]);
  const e=data.item;
  const team=state.user.role==='team';
  const statusOptions=Object.entries(evidenceStatus);
  const available=tree?.criteria.flatMap(c=>c.dimensions.flatMap(d=>d.indicators)).filter(i=>!data.linked.some(x=>x.id===i.id))||[];
  const linkPanel=`<section class="panel"><h2>${team?'Tautkan dokumen yang sudah ada':'Tautan sumber'}</h2>${data.links.length?`<div class="list">${data.links.map(l=>`<div class="list-item"><div><strong><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.title)}</a></strong><small>${linkStatusTag(l.status)} · ${esc(l.url)}</small>${l.review_note?`<small>Catatan: ${esc(l.review_note)}</small>`:''}</div><div class="button-row">${canReview()?`${button('Verifikasi','verify-link-'+l.id)}${button('Perlu revisi','revise-link-'+l.id)}`:''}${canEdit()?button('Lepas','remove-link-'+l.id):''}</div></div>`).join('')}</div>`:empty('Belum ada tautan sumber.')}
    ${canEdit()?`<div class="divider"></div><form id="link-form"><div class="field"><label for="source-title">Judul dokumen</label><input id="source-title" name="title" required maxlength="300" placeholder="Contoh: Statuta UNM"></div><div class="field"><label for="source-url">Tautan dokumen (HTTPS)</label><input id="source-url" name="url" type="url" pattern="https://.*" placeholder="https://drive.google.com/..." required></div><p class="mini">Gunakan tautan Google Drive, Docs, Sheets, atau sumber HTTPS lain yang sudah ada. Pastikan pemeriksa berwenang dapat membukanya. Tautan yang sama dapat dipakai untuk beberapa kebutuhan bukti.</p><button class="button primary">Simpan tautan dokumen</button></form>`:''}</section>`;
  const uploadForm=`<form id="upload-form"><label for="evidence-file">Pilih berkas${data.files.length?' versi baru':''}</label><input id="evidence-file" type="file" name="file" accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg" required><p class="mini">PDF, DOCX, XLSX, PNG, atau JPG; maksimal 15 MB. Versi sebelumnya tetap tersimpan.</p><button class="button ${team?'':'primary'}">Unggah berkas</button></form>`;
  const filePanel=`<section class="panel"><h2>${team?'Berkas yang diunggah':'Berkas bukti'}</h2>${data.files.length?`<div class="list">${data.files.map(f=>`<div class="list-item"><div><strong>${esc(f.original_name)}</strong><small>Versi ${f.version} · ${Math.round(f.size/1024)} KB · ${fmt(f.created_at)}</small></div><a class="button" href="/api/files/${f.id}">Unduh</a></div>`).join('')}</div>`:empty('Belum ada berkas yang diunggah.')}
    ${canEdit()?team?`<details class="upload-alternative"><summary>Unggah berkas sebagai alternatif</summary><p class="mini">Gunakan jika dokumen belum memiliki tautan yang dapat dibuka pemeriksa.</p>${uploadForm}</details>`:`<div class="divider"></div>${uploadForm}`:''}</section>`;
  shell(`${heading(e.code,e.title,`Sumber: ${e.source_unit||'belum diisi'}`,button(state.evidenceReturnIndicator?'Kembali ke indikator':'Kembali ke katalog','back-evidence'))}
    ${team?note('Tempel tautan dokumen yang sudah dikerjakan di Google Drive, Docs, Sheets, atau sumber lain. Unggah berkas hanya bila tautan tidak dapat digunakan. Validator memeriksa sumber sebelum bukti dinyatakan terverifikasi.'):''}
    <div class="detail-grid ${team?'team-evidence-flow':''}"><div>${team?`${linkPanel}${filePanel}`:`${filePanel}${linkPanel}`}
    <section class="panel"><h2>Indikator yang didukung</h2>${data.linked.length?`<div class="list">${data.linked.map(i=>`<div class="list-item"><div><strong>${esc(i.code)}</strong><small>${esc(i.text)}</small><small>Dasar hubungan: ${esc(i.mapping_note||'Belum dicatat')}</small></div><div class="button-row">${button('Buka','indicator-'+i.id)}${canEdit()&&!team?button('Lepas','unlink-indicator-'+i.id):''}</div></div>`).join('')}</div>`:empty('Bukti ini belum dihubungkan ke indikator.')}
    ${canEdit()&&!team?`<div class="divider"></div><div class="field"><label for="indicator-option-search">Hubungkan ke indikator</label><input id="indicator-option-search" class="option-search" type="search" placeholder="Cari kode atau teks indikator..." aria-label="Cari indikator untuk dihubungkan"><select id="select-indicator" aria-label="Pilih indikator">${option('','Pilih indikator')}${available.map(i=>option(i.id,`${i.code} · ${i.text}`)).join('')}</select></div><div class="field"><label>Dasar hubungan</label><textarea id="evidence-mapping-note" placeholder="Jelaskan bagian indikator yang didukung oleh bukti ini"></textarea></div>${button('Hubungkan','link-indicator','button')}`:team?'<p class="mini">Tautkan atau lepaskan bukti melalui halaman detail indikator.</p>':''}</section></div>
    <div><section class="panel"><h2>Pengelolaan bukti</h2><dl class="meta"><dt>Status</dt><dd>${statusTag(e.status)}</dd><dt>PIC awal</dt><dd>${esc(e.pic_label||'—')}</dd><dt>Validator awal</dt><dd>${esc(e.validator_label||'—')}</dd><dt>Sumber sheet</dt><dd>${esc(e.source_sheet||'—')}</dd></dl>
    ${canEdit()&&!(team&&e.status==='verified')?`<div class="divider"></div><form id="evidence-form">${team?`<input type="hidden" name="status" value="${esc(e.status)}"><p class="mini">Status sumber berubah otomatis saat tautan atau berkas ditambahkan dan setelah diperiksa validator.</p>`:`<div class="field"><label>Status</label><select name="status">${statusOptions.map(([x,y])=>option(x,y,x===e.status)).join('')}</select></div>`}
    ${canManage()?`<div class="field"><label>Pemilik akun</label><select name="ownerUserId">${option('','Belum ditetapkan')}${users.users.filter(u=>u.role==='team'&&u.active&&(u.criteria.some(c=>e.code.startsWith(c.code+'.'))||u.id===e.owner_user_id)).map(u=>option(u.id,u.name,u.id===e.owner_user_id)).join('')}</select></div>
    <div class="field"><label>Validator akun</label><select name="validatorUserId">${option('','Belum ditetapkan')}${users.users.filter(u=>['validator','kaprodi'].includes(u.role)).map(u=>option(u.id,u.name,u.id===e.validator_user_id)).join('')}</select></div>`:''}
    ${field('Tenggat','dueDate',e.due_date||'','date')}<div class="field"><label>Catatan</label><textarea name="notes">${esc(e.notes)}</textarea></div><button class="button primary">Simpan perubahan</button></form>`:team&&e.status==='verified'?'<p class="mini">Bukti telah diverifikasi. Jika berkas atau tautan berubah, validator perlu memeriksanya kembali.</p>':''}</section></div></div>`);
  bind('[data-action="back-evidence"]','click',()=>state.evidenceReturnIndicator?go('indicator',state.evidenceReturnIndicator):go('evidence'));
  bindOptionSearch('.option-search');
  bindAll('[data-action^="indicator-"]','click',event=>go('indicator',Number(event.currentTarget.dataset.action.split('-')[1])));
  bind('#upload-form','submit',async event=>{event.preventDefault();try{await api(`/api/evidence/${evidenceId}/files`,{method:'POST',body:new FormData(event.currentTarget)});toast('Berkas diunggah.');await go('evidenceDetail',evidenceId);}catch(error){handleError(error);}});
  bind('#link-form','submit',async event=>{event.preventDefault();try{await api(`/api/evidence/${evidenceId}/links`,{method:'POST',body:json(Object.fromEntries(new FormData(event.currentTarget).entries()))});toast('Tautan ditambahkan.');await go('evidenceDetail',evidenceId);}catch(error){handleError(error);}});
  for(const [action,status] of [['verify','verified'],['revise','revision']]) bindAll(`[data-action^="${action}-link-"]`,'click',async event=>{const linkId=Number(event.currentTarget.dataset.action.split('-')[2]);const note=status==='revision'?window.prompt('Catatan revisi tautan:',''):'';if(note===null)return;try{await api(`/api/evidence-links/${linkId}/review`,{method:'POST',body:json({status,note})});toast('Pemeriksaan tautan tersimpan.');await go('evidenceDetail',evidenceId);}catch(error){handleError(error);}});
  bindAll('[data-action^="remove-link-"]','click',async event=>{const linkId=Number(event.currentTarget.dataset.action.split('-')[2]);try{await api(`/api/evidence/${evidenceId}/links/${linkId}`,{method:'DELETE'});toast('Tautan dilepas.');await go('evidenceDetail',evidenceId);}catch(error){handleError(error);}});
  bind('[data-action="link-indicator"]','click',async()=>{const indicatorId=Number(root.querySelector('#select-indicator').value),mappingNote=root.querySelector('#evidence-mapping-note').value;if(!indicatorId)return toast('Pilih indikator.',true);try{await api(`/api/indicators/${indicatorId}/link`,{method:'POST',body:json({evidenceId,mappingNote})});toast('Indikator dihubungkan.');await go('evidenceDetail',evidenceId);}catch(error){handleError(error);}});
  bindAll('[data-action^="unlink-indicator-"]','click',async event=>{const indicatorId=Number(event.currentTarget.dataset.action.split('-')[2]);try{await api(`/api/indicators/${indicatorId}/link/${evidenceId}`,{method:'DELETE'});toast('Hubungan indikator dilepas.');await go('evidenceDetail',evidenceId);}catch(error){handleError(error);}});
  bind('#evidence-form','submit',async event=>{event.preventDefault();const payload=Object.fromEntries(new FormData(event.currentTarget).entries());if(!canManage()){payload.ownerUserId=e.owner_user_id;payload.validatorUserId=e.validator_user_id;}try{await api(`/api/evidence/${evidenceId}`,{method:'PUT',body:json(payload)});toast('Bukti diperbarui.');await go('evidenceDetail',evidenceId);}catch(error){handleError(error);}});
}

async function renderSimulation(){
  const data=await api('/api/simulation');const s=data.summary;
  shell(`${heading('Penilaian','Simulasi kesiapan Unggul','Proyeksi masa berlaku 2 atau 5 tahun berdasarkan DL-09 dan keputusan internal yang disetujui.')}
    ${note(s.ready?'Prasyarat simulasi dua tahun tersedia. Hasil ini tetap memerlukan asesmen resmi.':'Simulasi belum dapat menyimpulkan status. Lengkapi 58 indikator, 8 syarat perlu, penilaian dan persetujuan, serta aturan kelayakan dan kualifikasi S1.',!s.ready)}
    ${s.ready&&!s.fiveYearReady?note('Data publikasi yang disetujui masih diperlukan untuk memeriksa kemungkinan Unggul lima tahun.',true):''}
    <div class="grid stats"><div class="stat"><div class="label">Hasil internal</div><div style="font-size:1.12rem;font-weight:750;margin-top:12px">${esc(s.outcome)}</div></div>
    <div class="stat"><div class="label">Indikator dipetakan</div><div class="number">${s.mapped}/${s.expected}</div></div>
    <div class="stat"><div class="label">Melampaui SN-Dikti</div><div class="number">${s.passed}/58</div><small>Target 40 untuk 2 tahun; 52 untuk 5 tahun</small></div>
    <div class="stat"><div class="label">Syarat perlu indikator</div><div class="number">${s.requiredPassed}/${s.required}</div></div>
    <div class="stat"><div class="label">Syarat perlu disetujui</div><div class="number">${data.rules.filter(r=>r.approved_by).length}/${data.rules.length}</div></div></div>
    <div class="split"><section class="panel"><h2>Indikator</h2>${data.indicators.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>Kode</th><th>Dimensi</th><th>Status</th><th>Hasil</th></tr></thead><tbody>
    ${data.indicators.map(i=>`<tr><td>${esc(i.code)} ${i.is_required_unggul?'★':''}</td><td>${esc(i.dimension)}</td><td>${i.assessment_status?statusTag(i.assessment_status):tag('Belum dinilai')}</td><td>${i.assessment_status==='approved'?(i.result==='met'?'Melampaui':'Belum melampaui'):'—'}</td></tr>`).join('')}</tbody></table></div>`:empty('Belum ada indikator yang dipetakan.')}</section>
    <section class="panel"><h2>Syarat perlu</h2>${data.rules.length?`<div class="list">${data.rules.map(r=>`<div class="list-item"><div><strong>${esc(r.code)} · ${esc(r.label)}</strong><small>Ambang ${esc(r.operator)} ${esc(r.threshold)} ${esc(r.unit)} · Nilai ${r.value===null?'belum diisi':r.metric==='percentage'?`${Number(r.value).toFixed(2)}%`:r.metric==='attestation'?(r.value===1?'Ya':'Tidak'):r.value}</small><small>${esc(r.period_start||'—')} s.d. ${esc(r.period_end||'—')} · ${esc(r.data_source||'Sumber belum diisi')}</small></div>${r.pass===null?tag('Belum disetujui','amber'):r.pass?tag('Memenuhi','green'):tag('Belum memenuhi','red')}</div>`).join('')}</div>`:empty('Syarat perlu belum dikonfigurasi.')}
    <div style="margin-top:16px">${button('Kelola syarat perlu','eligibility','button')}</div></section></div>`);
  bind('[data-action="eligibility"]','click',()=>go('eligibility'));
}

async function renderEligibility(){
  const [data,ev]=await Promise.all([api('/api/eligibility'),api('/api/evidence')]);
  const categoryName={eligibility:'Kelayakan pengajuan',qualification:'Kualifikasi dosen',publication:'Publikasi/luaran dosen'};
  shell(`${heading('Instrumen','Syarat perlu Unggul','Aturan S1 Manajemen dari DL-09 Tabel 8 dan pemeriksaan kelayakan resmi.')}
    ${note('Aturan S1 sudah dimuat. Setiap hasil membutuhkan sumber data, akhir periode, bukti terverifikasi, dan persetujuan ketua prodi. Persentase dihitung dari pembilang dan penyebut.',!data.rulesetConfirmed)}
    ${state.user.role==='kaprodi'?`<section class="panel"><h2>Himpunan aturan</h2><p>${data.rulesetConfirmed?'Sudah dikonfirmasi.':'Belum dikonfirmasi.'} Perubahan daftar aturan akan membatalkan konfirmasi.</p>${button('Konfirmasi seluruh aturan S1','confirm-ruleset','button primary')}</section>`:''}
    ${data.rules.length?data.rules.map(r=>`<section class="panel"><div class="page-head" style="margin-bottom:14px"><div><div class="eyebrow">${esc(r.code)} · ${esc(categoryName[r.category]||r.category)}</div><h2>${esc(r.label)}</h2><p class="muted">Ambang ${esc(r.operator)} ${esc(r.threshold)} ${esc(r.unit)} · ${esc(r.source_ref)}</p></div>${r.approved_by?tag('Disetujui','green'):tag('Belum disetujui','amber')}</div>
    <p class="mini">Sumber yang disarankan: ${esc(r.source_hint)}. ${r.period_years?'Periode tiga tahun dihitung mundur dari tanggal akhir yang diisi.':'Pemeriksaan berlaku pada tanggal yang diisi.'}</p>
    ${r.value!==null?`<p>Nilai tercatat: <strong>${r.metric==='percentage'?`${esc(r.numerator)}/${esc(r.denominator)} = ${Number(r.value).toFixed(2)}%`:r.metric==='attestation'?(r.value===1?'Ya':'Tidak'):esc(r.value)}</strong> · Periode ${esc(r.period_start)} s.d. ${esc(r.period_end)} · ${esc(r.data_source||'')}</p>`:''}
    <form class="rule-value" data-id="${r.id}"><div class="form-grid">${r.metric==='percentage'?`${field('Jumlah dosen yang memenuhi','numerator',r.numerator??'','number','min="0" step="1" required')}${field('Jumlah seluruh dosen tetap','denominator',r.denominator??'','number','min="1" step="1" required')}`:r.metric==='attestation'?`<div class="field"><label>Hasil pemeriksaan</label><select name="value">${option('','Pilih hasil',r.value===null)}${option('1','Ya / memenuhi',r.value===1)}${option('0','Tidak / belum memenuhi',r.value===0)}</select></div>`:field('Jumlah dosen yang memenuhi','value',r.value??'','number','min="0" step="1" required')}
    ${field('Tanggal akhir periode / tanggal pemeriksaan','periodEnd',r.period_end||'','date','required')}${field('Sumber data dan tabel','dataSource',r.data_source||'','text','required maxlength="500"')}
    <div class="field"><label>Bukti pendukung</label><input class="option-search" type="search" placeholder="Cari kode atau judul bukti..." aria-label="Cari bukti pendukung"><select name="evidenceId" aria-label="Pilih bukti pendukung" required>${option('','Pilih bukti')}${ev.items.map(e=>option(e.id,`${e.code} · ${e.title}`,e.id===r.evidence_id)).join('')}</select></div></div>
    <div class="button-row">${canEdit()?'<button class="button">Simpan nilai</button>':''}${state.user.role==='kaprodi'?button('Setujui syarat','approve-rule-'+r.id,'button primary'):''}</div></form></section>`).join(''):empty('Belum ada aturan syarat perlu.')}`);
  bind('[data-action="confirm-ruleset"]','click',async()=>{try{await api('/api/eligibility/confirm-set',{method:'POST'});toast('Himpunan aturan dikonfirmasi.');await go('eligibility');}catch(error){handleError(error);}});
  bindOptionSearch('.option-search');
  bindAll('.rule-value','submit',async e=>{e.preventDefault();try{await api(`/api/eligibility/${e.currentTarget.dataset.id}`,{method:'PUT',body:json(Object.fromEntries(new FormData(e.currentTarget).entries()))});toast('Nilai disimpan.');await go('eligibility');}catch(error){handleError(error);}});
  bindAll('[data-action^="approve-rule-"]','click',async e=>{try{await api(`/api/eligibility/${e.currentTarget.dataset.action.split('-')[2]}/approve`,{method:'POST'});toast('Syarat disetujui.');await go('eligibility');}catch(error){handleError(error);}});
}

async function renderAssessorPackage(){
  const pkg=await api('/api/assessor-package');
  const ready=pkg.indicatorCount>0&&!pkg.invalidIndicators.length&&!pkg.missingFiles.length;
  shell(`${heading('Asesor','Paket baca asesor','Arsip ZIP berisi narasi, keputusan, dan bukti dari indikator yang telah disetujui.',ready?'<a class="button primary" href="/api/assessor-package/download">Unduh paket ZIP</a>':'')}
    <div class="grid stats"><div class="stat"><div class="label">Indikator disetujui</div><div class="number">${pkg.indicatorCount}</div></div>
    <div class="stat"><div class="label">Kebutuhan bukti</div><div class="number">${pkg.evidenceCount}</div></div>
    <div class="stat"><div class="label">Berkas</div><div class="number">${pkg.fileCount}</div></div></div>
    ${!ready?note(pkg.indicatorCount===0?'Belum ada indikator yang disetujui untuk disertakan.':`Paket belum dapat diunduh: ${pkg.invalidIndicators.length} indikator dan ${pkg.missingFiles.length} berkas perlu diperiksa.`,true):note('Paket siap diunduh. Tautan sumber eksternal di dalam paket memerlukan akses internet.')}
    <section class="panel"><h2>Isi paket</h2>${pkg.indicators.length?`<div class="list">${pkg.indicators.map(i=>`<div class="list-item"><strong>${esc(i.code)} · ${esc(i.dimension)}</strong>${tag(i.result==='met'?'Melampaui':'Belum melampaui',i.result==='met'?'green':'amber')}</div>`).join('')}</div>`:empty('Belum ada indikator disetujui.')}</section>`);
}

async function renderUsers(){
  const [data,overview,tree]=await Promise.all([api('/api/users'),api('/api/overview'),api('/api/criteria')]);
  const criteria=tree.criteria;
  const criterionChecks=selected=>`<div class="field wide"><label>Kriteria tugas tim penyusun</label><div class="list">${criteria.map(c=>`<label class="list-item"><input type="checkbox" name="criterionId" value="${c.id}" ${selected.includes(c.id)?'checked':''}> <strong>${esc(c.code)} · ${esc(c.title)}</strong></label>`).join('')}</div><p class="mini">Pilih satu atau beberapa kriteria. Akun tanpa penugasan belum dapat melihat indikator dan bukti.</p></div>`;
  const userActions=u=>u.active?`${button('Edit','edit-user-'+u.id)}${u.id!==state.user.id?button('Hapus','delete-user-'+u.id,'button danger'):''}`:button('Pulihkan','restore-user-'+u.id);
  const userCriteria=u=>u.role==='team'?(u.criteria.length?u.criteria.map(c=>esc(c.code)).join(', '):'Belum ditugaskan'):'—';
  shell(`${heading('Administrasi','Pengguna','Kelola akun dan akses setiap peran dalam proses akreditasi.',state.user.role==='admin'?button('Tambah pengguna','new-user','button primary'):'')}
    ${state.user.role==='kaprodi'?`<section class="panel"><h2>Akses asesor</h2><p class="muted">Akun asesor hanya dapat membaca indikator dan bukti yang sudah disetujui. Simulasi internal tetap tersembunyi.</p>
    <p>Status saat ini: ${overview.assessorAccess?tag('Dibuka','green'):tag('Ditutup','gray')}</p>${button(overview.assessorAccess?'Tutup akses':'Buka akses', 'toggle-assessor',overview.assessorAccess?'button danger':'button primary')}</section>`:''}
    ${state.user.role==='admin'?`<section id="new-user-panel" class="panel" hidden><h2>Tambah pengguna</h2><form id="user-form"><div class="form-grid">${field('Nama lengkap','name','','text','required')}${field('Username','username','','text','required autocomplete="off" autocapitalize="none" spellcheck="false" minlength="2" maxlength="32" pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,31}"')}
    ${field('Kata sandi awal (minimal 8 karakter)','password','','password','required minlength="8" autocomplete="new-password"')}<div class="field"><label>Peran</label><select name="role">${Object.entries(roleName).map(([x,y])=>option(x,y)).join('')}</select></div><div id="new-user-criteria" class="wide" hidden>${criterionChecks([])}</div></div><div class="form-actions">${button('Batal','cancel-new-user')}<button class="button primary">Buat akun</button></div></form></section>
    <section id="edit-user-panel" class="panel" hidden><h2>Edit pengguna</h2><p class="mini">Kosongkan kata sandi jika tidak ingin mengubahnya.</p><form id="edit-user-form"><div class="form-grid">
    <div class="field"><label for="edit-user-name">Nama lengkap</label><input id="edit-user-name" name="name" required maxlength="100"></div>
    <div class="field"><label for="edit-user-username">Username</label><input id="edit-user-username" name="username" required minlength="2" maxlength="32" pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,31}" autocapitalize="none" spellcheck="false"></div>
    <div class="field"><label for="edit-user-password">Kata sandi baru (opsional)</label><input id="edit-user-password" name="password" type="password" minlength="8" autocomplete="new-password" placeholder="Minimal 8 karakter"></div>
    <div class="field"><label for="edit-user-role">Peran</label><select id="edit-user-role" name="role">${Object.entries(roleName).map(([x,y])=>option(x,y)).join('')}</select></div>
    <div id="edit-user-criteria" class="wide" hidden>${criterionChecks([])}</div></div><div class="form-actions">${button('Batal','cancel-edit-user')}<button class="button primary">Simpan perubahan</button></div></form></section>
    <section id="delete-user-panel" class="panel" hidden><h2>Hapus akses pengguna?</h2><p id="delete-user-message" class="muted"></p><p class="mini">Akun tidak dapat masuk lagi dan penugasan PIC atau validator aktif dilepas. Narasi, bukti, dan riwayat pekerjaan tetap tersimpan. Akun dapat dipulihkan.</p><div class="form-actions">${button('Batal','cancel-delete-user')}${button('Hapus akses','confirm-delete-user','button danger')}</div></section>`:''}
    <section class="panel"><div class="table-wrap user-table-wrap"><table class="data-table"><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Kriteria tugas</th><th>Status</th>${state.user.role==='admin'?'<th>Tindakan</th>':''}</tr></thead><tbody>
    ${data.users.map(u=>`<tr><td><strong>${esc(u.name)}</strong></td><td>${esc(u.username)}</td><td>${tag(roleName[u.role],'blue')}</td><td>${userCriteria(u)}</td><td>${u.active?tag('Aktif','green'):tag('Akses dihapus','gray')}</td>${state.user.role==='admin'?`<td class="actions"><div class="button-row user-actions">${userActions(u)}</div></td>`:''}</tr>`).join('')}</tbody></table></div>
    <div class="user-cards">${data.users.map(u=>`<article class="user-card"><div class="user-card-head"><div><strong>${esc(u.name)}</strong><small>@${esc(u.username)}</small></div>${u.active?tag('Aktif','green'):tag('Akses dihapus','gray')}</div><div class="user-card-meta"><span>${esc(roleName[u.role])}</span><span>Kriteria: ${userCriteria(u)}</span></div>${state.user.role==='admin'?`<div class="button-row user-card-actions">${userActions(u)}</div>`:''}</article>`).join('')}</div></section>`);
  bind('[data-action="new-user"]','click',()=>{root.querySelector('#new-user-panel').hidden=false;root.querySelector('#edit-user-panel').hidden=true;root.querySelector('#delete-user-panel').hidden=true;root.querySelector('#new-user-panel').scrollIntoView({behavior:'smooth'});});
  bind('[data-action="cancel-new-user"]','click',()=>{root.querySelector('#new-user-panel').hidden=true;});
  bind('#user-form select[name="role"]','change',e=>{root.querySelector('#new-user-criteria').hidden=e.target.value!=='team';});
  bind('[data-action="toggle-assessor"]','click',async()=>{try{await api('/api/settings/assessor-access',{method:'POST',body:json({enabled:!overview.assessorAccess})});toast('Akses asesor diperbarui.');await go('users');}catch(error){handleError(error);}});
  bind('#user-form','submit',async e=>{e.preventDefault();try{const form=new FormData(e.currentTarget);const payload=Object.fromEntries(form.entries());if(payload.role==='team')payload.criterionIds=form.getAll('criterionId').map(Number);delete payload.criterionId;await api('/api/users',{method:'POST',body:json(payload)});toast('Pengguna ditambahkan.');await go('users');}catch(error){handleError(error);}});
  bindAll('[data-action^="edit-user-"]','click',e=>{const user=data.users.find(u=>u.id===Number(e.currentTarget.dataset.action.slice('edit-user-'.length)));if(!user)return;const panel=root.querySelector('#edit-user-panel'),form=panel.querySelector('form');root.querySelector('#new-user-panel').hidden=true;root.querySelector('#delete-user-panel').hidden=true;panel.hidden=false;form.dataset.userId=user.id;form.elements.namedItem('name').value=user.name;form.elements.namedItem('username').value=user.username;form.elements.namedItem('password').value='';form.elements.namedItem('role').value=user.role;form.elements.namedItem('role').disabled=user.id===state.user.id;root.querySelector('#edit-user-criteria').hidden=user.role!=='team';form.querySelectorAll('input[name="criterionId"]').forEach(input=>{input.checked=user.criteria.some(c=>c.id===Number(input.value));});panel.scrollIntoView({behavior:'smooth'});});
  bind('[data-action="cancel-edit-user"]','click',()=>{root.querySelector('#edit-user-panel').hidden=true;});
  bind('#edit-user-role','change',e=>{root.querySelector('#edit-user-criteria').hidden=e.currentTarget.value!=='team';});
  bind('#edit-user-form','submit',async e=>{e.preventDefault();const form=e.currentTarget,values=new FormData(form),userId=Number(form.dataset.userId),role=form.elements.namedItem('role').value;const payload={name:values.get('name'),username:values.get('username'),password:values.get('password'),role,criterionIds:role==='team'?values.getAll('criterionId').map(Number):[]};try{const result=await api(`/api/users/${userId}`,{method:'PUT',body:json(payload)});if(userId===state.user.id)state.user=result.user;toast('Perubahan pengguna disimpan.');await go('users');}catch(error){handleError(error);}});
  bindAll('[data-action^="delete-user-"]','click',e=>{const user=data.users.find(u=>u.id===Number(e.currentTarget.dataset.action.slice('delete-user-'.length)));if(!user)return;const panel=root.querySelector('#delete-user-panel');root.querySelector('#new-user-panel').hidden=true;root.querySelector('#edit-user-panel').hidden=true;panel.hidden=false;panel.querySelector('#delete-user-message').textContent=`Hapus akses ${user.name} (@${user.username})?`;panel.querySelector('[data-action="confirm-delete-user"]').dataset.userId=user.id;panel.scrollIntoView({behavior:'smooth'});});
  bind('[data-action="cancel-delete-user"]','click',()=>{root.querySelector('#delete-user-panel').hidden=true;});
  bind('[data-action="confirm-delete-user"]','click',async e=>{try{await api(`/api/users/${e.currentTarget.dataset.userId}`,{method:'DELETE'});toast('Akses pengguna dihapus.');await go('users');}catch(error){handleError(error);}});
  bindAll('[data-action^="restore-user-"]','click',async e=>{const userId=Number(e.currentTarget.dataset.action.slice('restore-user-'.length));try{await api(`/api/users/${userId}/restore`,{method:'POST'});toast('Akun dipulihkan.');await go('users');}catch(error){handleError(error);}});
}

async function renderAudit(){
  const data=await api('/api/audit');
  shell(`${heading('Administrasi','Riwayat aktivitas','Perubahan penting dan keputusan penilaian tercatat di sini.')}
    <section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Tindakan</th><th>Objek</th><th>Rincian</th></tr></thead><tbody>
    ${data.items.map(x=>`<tr><td>${fmt(x.created_at)}</td><td>${esc(x.actor_name||'Sistem')}</td><td>${esc(x.action)}</td><td>${esc(x.entity)} ${x.entity_id??''}</td><td>${esc(x.details)}</td></tr>`).join('')}</tbody></table></div></section>`);
}

async function renderSettings(){
  if(state.user.role!=='admin') throw new Error('Pengaturan tampilan hanya untuk admin.');
  const current=appearance();
  shell(`${heading('Administrasi','Pengaturan tampilan','Sesuaikan identitas yang terlihat oleh seluruh pengguna, termasuk pada halaman masuk.')}
    <div class="settings-layout"><section class="panel"><h2>Identitas aplikasi</h2><form id="appearance-form">
      ${field('Nama aplikasi','appName',current.appName,'text','required maxlength="60"')}
      ${field('Subjudul di header','subtitle',current.subtitle,'text','required maxlength="100"')}
      ${field('Teks footer','footerText',current.footerText,'text','maxlength="180"')}
      <h3>Tampilan</h3><div class="form-grid"><div class="field"><label for="accentColor">Warna utama</label><div class="color-field"><input id="accentColor" name="accentColor" type="color" value="${esc(current.accentColor)}"><span class="mini" id="color-value">${esc(current.accentColor)}</span></div><p class="mini">Pilih warna gelap agar teks tombol tetap jelas.</p></div>
      <div class="field"><label for="font">Font aplikasi</label><select id="font" name="font">${[['inter','Inter'],['open-sans','Open Sans'],['system','Sistem'],['segoe','Segoe UI'],['arial','Arial']].map(([value,label])=>option(value,label,current.font===value)).join('')}</select></div></div>
      <div class="form-actions"><button class="button primary">Simpan pengaturan</button></div></form></section>
    <div><section class="panel"><h2>Logo aplikasi</h2><div class="settings-logo">${current.logoUrl?`<img src="${esc(current.logoUrl)}" alt="Logo aplikasi saat ini">`:`<span>${esc(current.appName.charAt(0).toLocaleUpperCase('id-ID'))}</span>`}</div>
      <p class="mini">PNG, JPG, atau WebP. Maksimal 2 MB. Logo tampil pada header, halaman masuk, dan ikon tab.</p>
      <form id="logo-form"><div class="field"><label for="logo">Pilih logo baru</label><input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" required></div><div class="button-row"><button class="button primary">Unggah logo</button>${current.logoUrl?button('Gunakan ikon huruf','remove-logo'):''}</div></form></section>
      <section class="panel"><h2>Pratinjau identitas</h2><div class="settings-preview" id="settings-preview"><span class="settings-preview-mark" id="preview-mark">${current.logoUrl?`<img src="${esc(current.logoUrl)}" alt="">`:esc(current.appName.charAt(0).toLocaleUpperCase('id-ID'))}</span><div><strong id="preview-name">${esc(current.appName)}</strong><small id="preview-subtitle">${esc(current.subtitle)}</small></div></div><p class="mini">Pratinjau berubah saat Anda mengisi formulir. Tampilan pengguna berubah setelah disimpan.</p></section></div></div>
    <section class="panel login-settings-panel"><div class="login-settings-head"><div><h2>Halaman login</h2><p class="muted">Atur teks dan gambar yang dilihat pengguna sebelum masuk. Perubahan hanya berlaku setelah disimpan.</p></div></div>
      <div class="login-settings-grid"><form id="login-content-form">
        ${field('Judul di sisi kiri','loginHeadline',current.loginHeadline,'text','required maxlength="120"')}
        <div class="field"><label for="loginDescription">Deskripsi di sisi kiri</label><textarea id="loginDescription" name="loginDescription" rows="3" maxlength="320">${esc(current.loginDescription)}</textarea></div>
        ${field('Judul kartu login','loginTitle',current.loginTitle,'text','required maxlength="160"')}
        ${field('Kalimat di bawah judul kartu (opsional)','loginIntro',current.loginIntro,'text','maxlength="180"')}
        <div class="form-grid">${field('Label username','loginUsernameLabel',current.loginUsernameLabel,'text','required maxlength="40"')}
          ${field('Label kata sandi','loginPasswordLabel',current.loginPasswordLabel,'text','required maxlength="40"')}</div>
        ${field('Teks tombol masuk','loginButtonText',current.loginButtonText,'text','required maxlength="40"')}
        <div class="field"><label for="loginBackgroundPosition">Posisi gambar latar</label><select id="loginBackgroundPosition" name="loginBackgroundPosition">${[['center','Tengah'],['top','Atas'],['bottom','Bawah'],['left','Kiri'],['right','Kanan']].map(([value,label])=>option(value,label,current.loginBackgroundPosition===value)).join('')}</select></div>
        <div class="form-actions"><button class="button primary">Simpan halaman login</button></div></form>
      <div class="login-settings-side"><div class="login-preview" id="login-preview"><div class="login-preview-copy"><strong id="login-preview-headline">${esc(current.loginHeadline)}</strong><small id="login-preview-description">${esc(current.loginDescription)}</small></div><div class="login-preview-card"><strong id="login-preview-title">${esc(current.loginTitle)}</strong><small id="login-preview-intro">${esc(current.loginIntro)}</small><span id="login-preview-username">${esc(current.loginUsernameLabel)}</span><i></i><span id="login-preview-password">${esc(current.loginPasswordLabel)}</span><i></i><b id="login-preview-button">${esc(current.loginButtonText)}</b></div></div>
        <p class="mini">Pratinjau ringkas. Cek halaman login sebenarnya setelah menyimpan.</p>
        <form id="login-background-form"><div class="field"><label for="login-background">Gambar latar</label><input id="login-background" name="background" type="file" accept="image/png,image/jpeg,image/webp" required><p class="mini">PNG, JPG, atau WebP, maksimal 5 MB. Gradasi lembut digunakan bila tidak ada gambar.</p></div><div class="button-row"><button class="button primary">Unggah gambar</button>${current.loginBackgroundUrl?button('Hapus gambar','remove-login-background'):''}</div></form>
      </div></div></section>`);
  const form=root.querySelector('#appearance-form');
  const preview=()=>{
    root.querySelector('#preview-name').textContent=form.elements.appName.value||'Nama aplikasi';
    root.querySelector('#preview-subtitle').textContent=form.elements.subtitle.value||'Subjudul';
    root.querySelector('#color-value').textContent=form.elements.accentColor.value;
    root.querySelector('#preview-mark').style.backgroundColor=form.elements.accentColor.value;
    root.querySelector('#settings-preview').style.fontFamily=fontStacks[form.elements.font.value]||fontStacks.inter;
    if(!current.logoUrl)root.querySelector('#preview-mark').textContent=(form.elements.appName.value||'A').charAt(0).toLocaleUpperCase('id-ID');
  };
  form.addEventListener('input',preview);form.addEventListener('change',preview);preview();
  form.addEventListener('submit',async event=>{event.preventDefault();try{
    const payload={...current,...Object.fromEntries(new FormData(form).entries())};
    state.appearance=await api('/api/appearance',{method:'PUT',body:json(payload)});
    applyAppearance();toast('Pengaturan tampilan disimpan.');await go('settings');
  }catch(error){handleError(error);}});
  bind('#logo-form','submit',async event=>{event.preventDefault();try{
    state.appearance=await api('/api/appearance/logo',{method:'POST',body:new FormData(event.currentTarget)});
    applyAppearance();toast('Logo diperbarui.');await go('settings');
  }catch(error){handleError(error);}});
  bind('[data-action="remove-logo"]','click',async()=>{try{
    state.appearance=await api('/api/appearance/logo',{method:'DELETE'});
    applyAppearance();toast('Ikon huruf digunakan kembali.');await go('settings');
  }catch(error){handleError(error);}});
  const loginForm=root.querySelector('#login-content-form');
  const loginPreview=root.querySelector('#login-preview');
  if(current.loginBackgroundUrl){
    loginPreview.style.setProperty('--auth-photo',`url("${current.loginBackgroundUrl}")`);
    loginPreview.classList.add('has-photo');
  }
  const previewLogin=()=>{
    for(const [element,name] of [['headline','loginHeadline'],['description','loginDescription'],['title','loginTitle'],
      ['intro','loginIntro'],['username','loginUsernameLabel'],['password','loginPasswordLabel'],['button','loginButtonText']])
      root.querySelector('#login-preview-'+element).textContent=loginForm.elements[name].value;
    loginPreview.style.setProperty('--auth-position',loginForm.elements.loginBackgroundPosition.value);
  };
  loginForm.addEventListener('input',previewLogin);loginForm.addEventListener('change',previewLogin);previewLogin();
  loginForm.addEventListener('submit',async event=>{event.preventDefault();try{
    state.appearance=await api('/api/appearance',{method:'PUT',body:json({...current,...Object.fromEntries(new FormData(loginForm).entries())})});
    applyAppearance();toast('Halaman login disimpan.');await go('settings');
  }catch(error){handleError(error);}});
  bind('#login-background-form','submit',async event=>{event.preventDefault();try{
    state.appearance=await api('/api/appearance/login-background',{method:'POST',body:new FormData(event.currentTarget)});
    applyAppearance();toast('Gambar latar diperbarui.');await go('settings');
  }catch(error){handleError(error);}});
  bind('[data-action="remove-login-background"]','click',async()=>{try{
    state.appearance=await api('/api/appearance/login-background',{method:'DELETE'});
    applyAppearance();toast('Gradasi latar digunakan kembali.');await go('settings');
  }catch(error){handleError(error);}});
}

boot().catch(handleError);
