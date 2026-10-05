# Analisis Daftar Dokumen Akreditasi PS Manajemen 2026

Sumber: `C:\Users\Ridho Achmad\Documents\Daftar Dokumen Akreditasi PS Manajemen 2026.docx`, dibaca pada 4 Oktober 2026. **Klarifikasi pengguna:** dokumen ini adalah contoh dari program studi lain. Dokumen diperlakukan sebagai referensi pola kerja dan ide fitur, bukan inventaris resmi PS Manajemen FEB UNM, bukan sumber impor data, dan bukan dasar penilaian. Struktur awal SISAKPROD tetap berlaku.

## Kesimpulan

Dokumen contoh ini menunjukkan cara prodi lain mengelompokkan kebutuhan dan mencantumkan banyak rujukan bukti pada tiap baris. Isinya 94 baris kebutuhan, dengan 517 rujukan tautan (473 URL unik). Angka tersebut hanya menggambarkan contoh. SISAKPROD tetap menggunakan katalog awal 138 entri dari spreadsheet kerja PS Manajemen FEB UNM, struktur IAU 7 kriteria dan 21 dimensi, serta 58 indikator yang akan dipetakan dari instrumen resmi. Tidak ada rencana mengimpor 94 baris atau tautannya ke data operasional.

## Struktur dan isi

Tabel utama memiliki kolom bernomor, kriteria/dimensi, deskripsi dokumen pendukung, label referensi DL-09, dan tautan. Ada 7 kriteria, 22 judul subbagian, dan 94 baris bernomor 1–94. Satu subbagian tambahan adalah **4.3 Syarat Kualifikasi dan Luaran Dosen (Syarat Unggul)**. Ini hanya contoh pengelompokan kerja; struktur resmi 21 dimensi dalam aplikasi tidak berubah.

| Kriteria | Baris pada contoh prodi lain | Entri katalog awal SISAKPROD |
| --- | ---: | ---: |
| K1 Orientasi Strategis | 13 | 12 |
| K2 Tata Pamong dan Tata Kelola | 10 | 60 |
| K3 Pengelolaan Mahasiswa | 21 | 28 |
| K4 Dosen dan Tenaga Kependidikan | 17 | 13 |
| K5 Keuangan dan Sarana Prasarana | 7 | 5 |
| K6 Pendidikan dan Pengajaran | 12 | 10 |
| K7 Penelitian dan PKM | 14 | 10 |
| **Jumlah** | **94** | **138** |

Sebanyak 70 dari 94 baris contoh memiliki lebih dari satu tautan; jumlah terbanyak pada satu baris adalah 33. Jenis rujukan dalam tabel: 290 tautan berkas Google Drive, 33 folder Drive, 87 Google Sheets, 27 Google Docs, dan 80 laman lain. Terdapat 38 URL yang muncul pada lebih dari satu baris. Pola penggunaan ulang inilah yang berguna untuk rancangan sistem. Kepemilikan, akses, keberadaan, isi, periode, dan kesesuaian tautan contoh **belum diverifikasi** dan tidak boleh diasumsikan berlaku bagi prodi ini.

Contoh topik yang dapat digunakan sebagai daftar periksa saat menyempurnakan katalog sendiri:

- K1 nomor 1–13 menghubungkan misi, visi, tujuan, dan strategi dengan statuta, VMTS, Renstra/Renop, AMI, RTM, dan risk register.
- K2 nomor 14–23 mengumpulkan SOTK, kode etik, survei kepuasan, SPMI, AMI, serta benchmarking. Katalog awal K2 sangat rinci (60 entri), termasuk banyak instrumen monev yang dapat mendukung satu kebutuhan DOCX.
- K3 nomor 24–44 mencakup PMB, layanan akademik, kinerja, kesejahteraan, dan karier mahasiswa, termasuk penggunaan fasilitas dan keluaran kegiatan.
- K4 nomor 45–61 mencakup profil serta pengelolaan dosen/tendik. Nomor 55–57 menampung data publikasi, jabatan akademik, dan pendidikan dosen untuk syarat Unggul S1.
- K5 nomor 62–68 mencakup RKAT, realisasi keuangan, keberlanjutan pendanaan, inventaris, K3, dan aksesibilitas sarana.
- K6 nomor 69–80 mencakup CPL, peta kurikulum, RPS, keterlibatan pemangku kepentingan, asesmen CPL, tracer study, dan tindakan perbaikan.
- K7 nomor 81–94 mencakup roadmap, publikasi/PKM, pendanaan, integrasi ke pembelajaran, rekognisi, dan kerja sama.

## Hubungan dengan sistem saat ini

Katalog `evidence_requests` saat ini berasal dari spreadsheet kerja prodi dan berisi 138 permintaan yang masih berstatus awal. Aplikasi mendukung unggahan lokal, versi berkas, validasi, narasi, dan hubungan langsung bukti–indikator. DOCX contoh memperlihatkan kebutuhan fitur yang belum lengkap: **beberapa tautan/bukti pada satu entri katalog**, **penggunaan ulang satu sumber**, serta **pengelompokan dan pemeriksaan kelengkapan**. Fitur ini harus bekerja pada 138 entri yang sudah ada; tautan dan nama berkas milik prodi contoh tidak dipindahkan.

Label pada kolom “Referensi DL-09” masih umum, misalnya “Bukti K1 Misi”. Dokumen contoh ini tidak menetapkan hubungan resmi ke 58 indikator IAU. Angka dan masa acuan yang tertulis pada contoh (misalnya persentase dosen pada nomor 47, 55, dan 56) tidak dipakai sebagai aturan mesin simulasi; sumbernya tetap DL-09 resmi dan data PS Manajemen FEB UNM.

## Penyempurnaan yang disarankan

### 1. Perkaya 138 entri katalog yang sudah ada

Pertahankan `evidence_requests` sebagai katalog utama. Tambahkan kemampuan mencatat lebih dari satu sumber untuk setiap entri: URL Drive/Sheets/Docs, laman institusi, dan unggahan lokal. Simpan nama tampilan, jenis sumber, periode, pemilik, status akses, status pemeriksaan isi, serta catatan. Gunakan satu identitas sumber yang dapat dipakai ulang oleh beberapa entri katalog bila benar-benar sama.

### 2. Pertahankan pemetaan katalog ke indikator resmi

Gunakan hubungan `indicator_evidence` yang sudah tersedia untuk mengaitkan 138 entri katalog dengan 58 indikator resmi. Lengkapi rujukan halaman/indikator DL-09 pada setiap keputusan pemetaan. Satu entri dapat mendukung beberapa indikator dan satu indikator dapat memakai beberapa entri. Syarat kelayakan/kualifikasi/publikasi tetap dikelola dalam modul aturan tersendiri.

### 3. Status yang menilai mutu bukti

Pisahkan “tautan dicatat” dari “bukti layak”. Untuk setiap sumber milik prodi, tampilkan status seperti belum diperiksa, tautan dapat diakses, isi sesuai, periode sesuai, perlu revisi, dan disetujui. Simpan pemeriksa, tanggal, catatan, serta versi/snapshot berkas. Perubahan atau penggantian sumber harus membatalkan persetujuan yang bergantung padanya, seperti mekanisme yang sudah ada untuk unggahan lokal.

### 4. Tampilan dan alur kerja

Sediakan tampilan 7 kriteria → 21 dimensi → indikator 58 → entri katalog 138 → sumber/tautan. Pada setiap entri, tampilkan penanggung jawab, kelengkapan, periode TS–TS-2, sumber, dan catatan validator. Sediakan filter “tautan belum dapat diakses”, “isi belum diperiksa”, “belum terhubung ke indikator”, dan “bukti lintas entri”. Ketua prodi dapat melihat ringkasan kesenjangan; asesor hanya melihat sumber yang telah disetujui untuk paket asesmen.

### 5. Simulasi dan ketertelusuran

Setiap penilaian indikator dan syarat kuantitatif harus menampilkan entri katalog dan sumber prodi yang mendasarinya. Pola data dosen dalam dokumen contoh mengingatkan perlunya pembilang, penyebut, periode, dan definisi DT yang disetujui. Keberadaan tautan atau jumlah berkas tidak menaikkan hitungan 40/52 secara otomatis.

## Urutan implementasi

1. Tambahkan sumber URL dan pemeriksaan akses/isi pada 138 entri katalog awal. Tidak ada impor data dari DOCX contoh.
2. Dukung beberapa sumber per entri dan penggunaan ulang satu sumber pada banyak entri tanpa duplikasi berkas.
3. Kurasi hubungan 138 entri ↔ 58 indikator dan syarat khusus S1 berdasarkan DL-09 resmi. Tampilkan indikator dan entri yang belum terpetakan.
4. Hubungkan persetujuan sumber dengan alur penilaian serta simulasi; uji pembatalan persetujuan saat sumber berubah.
5. Siapkan paket baca asesor dari bukti prodi yang disetujui, dengan jejak sumber dan periode.

## Keputusan yang perlu ditetapkan tim prodi

- Versi final DL-09 dan periode TS yang akan dipakai untuk proses akreditasi 2026.
- Sumber dokumen dan URL mana yang benar-benar milik PS Manajemen FEB UNM dan boleh digunakan oleh tim/asesor.
- Siapa PIC dan validator untuk 138 entri katalog yang sudah ada.
- Cara memperlakukan tautan ke laman dinamis milik prodi: cukup sebagai rujukan, atau perlu salinan bukti bertanggal.

Keputusan tersebut diperlukan sebelum bukti dinyatakan sah atau simulasi dijadikan dasar keputusan internal. Dokumen contoh tetap hanya menjadi referensi rancangan fitur.
