# Rencana Kerja SISAKPROD

Sasaran: sistem kerja bersama untuk persiapan Akreditasi Unggul S1 Manajemen FEB UNM. Struktur awal tetap: 7 kriteria, 21 dimensi, 58 indikator IAU, dan 138 kebutuhan bukti dari spreadsheet kerja prodi. Dokumen contoh dari program studi lain hanya menjadi referensi fitur; datanya tidak diimpor.

| Tahap | Hasil yang harus tersedia | Kriteria selesai | Status |
| --- | --- | --- | --- |
| 1. Pemetaan instrumen resmi | Master 58 indikator dari DL-09, penanda 8 syarat perlu, rujukan halaman, impor terstruktur | Jumlah per dimensi sesuai Tabel 1; 8 syarat perlu cocok dengan Tabel 7; data dapat ditinjau dan dikonfirmasi tanpa menimpa data pengguna | Master dan impor selesai; menunggu peninjauan/konfirmasi admin atau ketua prodi |
| 2. Pemetaan bukti prodi | Hubungan 138 entri bukti ke indikator, PIC/validator, beberapa sumber per entri | Setiap hubungan memiliki dasar; celah bukti dan indikator terlihat; data contoh prodi lain tidak masuk | Alur dan pemantauan selesai; pengisian hubungan, PIC, validator, serta sumber nyata oleh tim prodi belum dimulai |
| 3. Aturan simulasi S1 | Syarat kelayakan, kualifikasi, publikasi/luaran dari DL-09 serta sumber data dan periode | Semua aturan S1 dapat diperiksa; hitungan 40/52 dan 8 syarat perlu memakai nilai yang disetujui | Implementasi dan uji selesai; pengisian data serta persetujuan prodi menunggu tim |
| 4. Uji alur lintas peran | Skenario tim, validator, ketua prodi, revisi, dan persetujuan | Perubahan narasi/bukti membatalkan keputusan terkait; setiap peran hanya melihat dan mengubah yang diizinkan | Implementasi dan pengujian otomatis selesai; uji penerimaan dengan akun serta data prodi nyata masih diperlukan |
| 5. Kesiapan operasional | Paket baca asesor, pencadangan, rencana server, dan pemulihan | Paket hanya berisi materi disetujui; pemulihan database dan berkas teruji; konfigurasi produksi terdokumentasi | Implementasi dan uji teknis selesai; penempatan server serta kebijakan operasional menunggu keputusan FEB/UNM |

## Tahap 1

1. Kunci sumber instrumen yang dipakai: DL-09 Panduan Penilaian Akreditasi Unggul versi 27 November 2025, tautan dari [KPM ITS](https://www.its.ac.id/kpm/spme/lam-emba/) ke [berkas DL-09](https://drive.google.com/file/d/1AFxMWSIRfPM_xw3UTtmWu4cYS9mI21es/view). Perubahan versi pada masa depan memerlukan pemeriksaan ulang, bukan pembaruan diam-diam.
2. Transkripsikan 58 indikator dari Tabel 6 ke berkas master yang dapat ditinjau. Gunakan Tabel 1 untuk memeriksa jumlah per dimensi dan Tabel 7 untuk menandai 8 syarat perlu.
3. Siapkan impor yang memvalidasi kode, dimensi, jumlah, delapan penanda, rujukan, dan duplikasi sebelum menyimpan. Impor hanya boleh berjalan pada instrumen yang belum dipetakan, sehingga penilaian dan narasi pengguna tidak tertimpa.
4. Uji hasil impor pada database sementara, lalu terapkan pada database proyek setelah validasi lulus. **Selesai:** 58 indikator dan 8 penanda telah masuk ke database proyek; 138 entri bukti tetap ada. Status instrumen tetap `draft` sampai admin/ketua prodi memeriksa dan menekan konfirmasi.

## Batas keputusan

Master indikator adalah teks acuan, bukan penilaian capaian PS. Tidak ada bukti yang otomatis tertaut, nilai yang otomatis diberikan, atau status Unggul yang otomatis ditetapkan pada tahap ini.

## Tahap 2

1. Katalog 138 kebutuhan bukti dari spreadsheet prodi tetap menjadi sumber daftar kerja. Dokumen contoh program studi lain tidak dimasukkan.
2. Tim dapat menghubungkan bukti ke indikator dari detail bukti atau detail indikator. Setiap hubungan baru wajib diberi catatan dasar hubungan. Katalog menampilkan jumlah berkas, tautan, dan indikator per bukti; panel cakupan menunjukkan bukti serta indikator yang belum terhubung.
3. Satu bukti dapat memuat beberapa berkas dan tautan HTTPS. URL yang sama dapat dipakai oleh beberapa bukti. Validator atau ketua prodi memeriksa tautan sebelum bukti dengan tautan tersebut dinyatakan terverifikasi.
4. Penambahan, pelepasan, atau revisi tautan membatalkan persetujuan terkait pada indikator dan syarat perlu. Bukti terverifikasi yang sumbernya berubah kembali berstatus perlu revisi.
5. **Pekerjaan data yang tersisa:** tim prodi perlu memeriksa tiap entri katalog, menetapkan PIC dan validator akun, mengisi sumber asli, lalu menghubungkan bukti ke indikator berdasarkan isi dokumen nyata. Sistem sengaja tidak menebak hubungan dari kemiripan judul.

## Tahap 3

1. Master S1 memuat empat syarat terukur dari DL-09 Tabel 8 baris Sarjana (halaman cetak 25): sekurangnya 1 DT doktor, 100% DT minimal magister, sekurangnya 40% DT Lektor/Lektor Kepala/Guru Besar, dan sekurangnya 20% DT dengan publikasi selaras di jurnal nasional terakreditasi. Ketentuan itu merujuk periode tiga tahun terakhir.
2. Tiga pemeriksaan kelayakan dokumen dicatat sebagai hasil ya/tidak: SK/sertifikat akreditasi aktif, kecukupan serta konsistensi jumlah dosen tetap, dan pemeriksaan EWMP. Sumbernya adalah [FAQ resmi LAMEMBA](https://lamemba.or.id/faq/) bagian Status Terakreditasi Unggul; kecukupan dosen juga disebut dalam DL-09 Tabel 8. Karena sumber tidak memberi ambang angka universal untuk ketiganya, sistem tidak mengarang angka tersebut.
3. Setiap entri menyimpan sumber data, tanggal akhir periode, rentang periode yang dihitung, bukti terverifikasi, pengisi, dan penyetuju. Persentase dihitung dari pembilang/penyebut, bukan diketik sebagai hasil akhir. Pengubah data tidak dapat menyetujui datanya sendiri; perubahan bukti membatalkan persetujuan.
4. Ketua prodi mengonfirmasi tepat tujuh aturan master sebelum simulasi menyimpulkan hasil. Proyeksi dua tahun memerlukan aturan kelayakan dan kualifikasi yang disetujui; publikasi yang belum selesai menahan proyeksi lima tahun tetapi tidak menghalangi proyeksi dua tahun. Seluruh 58 penilaian indikator dan delapan syarat perlu tetap wajib disetujui.
5. **Pekerjaan data yang tersisa:** pilih tanggal acuan, isi jumlah dosen dan publikasi dari rekap yang dapat diaudit, hubungkan bukti, validasi bukti, lalu setujui tiap syarat. Master aturan tidak menyatakan bahwa PS sudah memenuhinya.

## Tahap 4

1. Jalur penilaian indikator ditetapkan: **tim mengusulkan → validator memeriksa → ketua prodi menyetujui**. API dan antarmuka menggunakan pembagian ini sehingga tidak ada penilaian yang tersangkut karena satu orang harus memeriksa sekaligus menyetujui.
2. Perubahan narasi, pemetaan bukti, atau sumber bukti mengubah penilaian terbaru yang sedang diajukan, sudah diperiksa, atau disetujui menjadi **perlu revisi**. Pengusulan dan pemeriksaan harus diulang pada versi terbaru.
3. Penugasan PIC dan validator bukti hanya dapat diubah oleh admin atau ketua prodi. PIC harus akun tim aktif; validator harus akun validator atau ketua prodi aktif. Bila validator telah ditugaskan, validator lain tidak dapat memvalidasi bukti itu.
4. Uji otomatis menelusuri izin tiap peran, revisi pemeriksaan, persetujuan, perubahan narasi/berkas/tautan, dan akses asesor. Asesor hanya bisa membaca indikator dan bukti dari penilaian yang disetujui; akses ke dokumen terkait hilang saat persetujuan dibatalkan.
5. **Uji penerimaan yang tersisa:** jalankan skenario yang sama bersama perwakilan tim, validator, ketua prodi, dan asesor dengan akun serta dokumen nyata sebelum pemakaian resmi.

### Penugasan tim per kriteria

Admin memilih satu atau beberapa dari tujuh kriteria saat membuat akun tim penyusun dan dapat mengubah penugasan itu melalui menu Pengguna. Ruang kerja tim hanya menampilkan kriteria, indikator, narasi, penilaian usulan, kebutuhan bukti, berkas, dan cakupan pemetaan pada kriteria tugasnya. Pembatasan diperiksa di API, termasuk akses lewat tautan detail dan unduhan berkas. Akun tanpa penugasan tidak mendapat data pekerjaan. Perubahan penugasan langsung mengubah akses tanpa perlu membuat akun atau sesi baru. Validator dan ketua prodi tetap melihat lintas kriteria untuk pemeriksaan dan persetujuan; admin, validator, dan ketua prodi mengelola syarat perlu serta simulasi global. Uji otomatis mencakup penugasan, penolakan akses lintas kriteria, perubahan penugasan, dan pencabutan akses.

## Tahap 5

1. Paket asesor ZIP berisi halaman baca, manifest, narasi dan penilaian indikator yang disetujui, berkas bukti terverifikasi, serta tautan sumber yang telah diperiksa. Unduhan ditolak bila tidak ada indikator disetujui atau berkas tercatat hilang.
2. Skrip cadangan membuat snapshot SQLite yang konsisten dengan mode WAL, menyalin unggahan, dan mencatat checksum setiap berkas. Skrip pemulihan memverifikasi checksum serta integritas database dan hanya menerima folder tujuan baru.
3. Uji otomatis membuktikan paket ZIP dapat dibuka, tidak menyertakan indikator yang belum disetujui, dan hilang dari akses asesor ketika persetujuan batal. Uji cadangan/pemulihan mencakup database WAL, berkas, dan kegagalan checksum. Satu cadangan nyata workspace dibuat pada `backups/2026-10-04-stage5`.
4. [Panduan operasional server](OPERASIONAL_SERVER.md) mencatat variabel lingkungan, HTTPS, direktori persisten, cadangan, dan pemulihan.
5. **Keputusan lokal yang tersisa:** FEB/UNM menetapkan server tujuan, domain dan sertifikat HTTPS, penanggung jawab backup, masa simpan, serta jalur distribusi paket asesor. Penempatan produksi belum dilakukan.
