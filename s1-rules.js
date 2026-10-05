// DL-09, 27 November 2025, Tabel 8 baris Sarjana (halaman cetak 25).
// Kelayakan dokumen dilengkapi dari FAQ resmi LAMEMBA, bagian Status Terakreditasi Unggul.
export const S1_RULES = [
  { code:'S1-AKTIF', label:'SK atau sertifikat akreditasi masih aktif', category:'eligibility', metric:'attestation', operator:'=', threshold:1, unit:'ya/tidak', periodYears:0, sourceRef:'FAQ LAMEMBA, Syarat Kelayakan butir 1', sourceHint:'SK/sertifikat dan tanggal berlaku' },
  { code:'S1-DOSEN-CUKUP', label:'Jumlah dosen tetap sesuai analisis kebutuhan dosen serta konsisten pada DED, DKPS, dan PD-Dikti', category:'eligibility', metric:'attestation', operator:'=', threshold:1, unit:'ya/tidak', periodYears:0, sourceRef:'DL-09 Tabel 8 baris Sarjana hlm. 25; FAQ LAMEMBA, Syarat Kelayakan butir 2–3', sourceHint:'Analisis kebutuhan dosen, DED, DKPS, PD-Dikti' },
  { code:'S1-EWMP', label:'EWMP dosen tetap telah diperiksa untuk kelayakan pengajuan', category:'eligibility', metric:'attestation', operator:'=', threshold:1, unit:'ya/tidak', periodYears:0, sourceRef:'FAQ LAMEMBA, Syarat Kelayakan butir 5', sourceHint:'Rekap EWMP dosen tetap' },
  { code:'S1-DOKTOR', label:'Minimal satu dosen tetap berkualifikasi doktor yang selaras dengan kompetensi inti', category:'qualification', metric:'count', operator:'>=', threshold:1, unit:'dosen', periodYears:3, sourceRef:'DL-09 Tabel 8 baris Sarjana hlm. 25', sourceHint:'Daftar dosen tetap dan ijazah doktor' },
  { code:'S1-MAGISTER', label:'Seluruh dosen tetap minimal magister dengan bidang yang selaras', category:'qualification', metric:'percentage', operator:'>=', threshold:100, unit:'%', periodYears:3, sourceRef:'DL-09 Tabel 8 baris Sarjana hlm. 25', sourceHint:'Daftar dosen tetap, ijazah, dan keselarasan bidang' },
  { code:'S1-LEKTOR', label:'Dosen tetap berjabatan Lektor, Lektor Kepala, atau Guru Besar', category:'qualification', metric:'percentage', operator:'>=', threshold:40, unit:'%', periodYears:3, sourceRef:'DL-09 Tabel 8 baris Sarjana hlm. 25', sourceHint:'Daftar dosen tetap dan SK jabatan akademik' },
  { code:'S1-PUBLIKASI', label:'Dosen tetap dengan publikasi selaras pada jurnal nasional terakreditasi', category:'publication', metric:'percentage', operator:'>=', threshold:20, unit:'%', periodYears:3, sourceRef:'DL-09 Tabel 8 baris Sarjana hlm. 25', sourceHint:'Daftar dosen tetap, artikel, dan akreditasi jurnal' },
];

export function periodFromEnd(value, years) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
  const end = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(end.getTime()) || end.toISOString().slice(0,10) !== value || end > new Date()) return null;
  if (!years) return { start:value, end:value };
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear()-years);
  start.setUTCDate(start.getUTCDate()+1);
  return { start:start.toISOString().slice(0,10), end:value };
}
