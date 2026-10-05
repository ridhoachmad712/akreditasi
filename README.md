# Ruang Unggul

Ruang Unggul adalah aplikasi web lokal untuk menyiapkan Akreditasi Unggul Program Studi S1 Manajemen FEB UNM. Proyek ini menyediakan katalog 138 kebutuhan bukti dari spreadsheet kerja, struktur 7 kriteria dan 21 dimensi IAU, master 58 indikator, narasi per indikator, pemeriksaan berjenjang, syarat perlu, serta simulasi kesiapan internal. Acuan pemetaan saat ini adalah Peraturan LAMEMBA Nomor 2 Tahun 2025 dan DL-09 versi 27 November 2025. [Rencana kerja lima tahap](docs/RENCANA_KERJA.md) mencatat urutan pengembangan.

## Menjalankan

Persyaratan: Node.js 25 atau versi yang mendukung `node:sqlite` dan npm.

```powershell
npm install
npm start
```

Buka `http://localhost:3000`. Pada pembukaan pertama, buat akun admin dengan username dan kata sandi minimal 8 karakter. Admin kemudian membuat akun tim penyusun, validator, dan ketua prodi pada menu Pengguna. Saat membuat akun tim penyusun, admin memilih satu atau beberapa kriteria tugas. Tombol **Edit** mengubah nama, username, peran, kata sandi, dan kriteria tugas. Tombol **Hapus** mencabut akses serta melepas penugasan PIC/validator aktif, tetapi mempertahankan narasi, bukti, dan riwayat; akun dapat **Dipulihkan**. Admin tidak dapat menghapus akun sendiri. Untuk akun lama, username dibuat otomatis dari bagian sebelum `@` pada email lama; jika ada yang sama, sistem menambahkan nomor. Port dapat diubah dengan variabel lingkungan `PORT`.

Database disimpan di `data/sisakprod.sqlite` dan berkas di `uploads/`. Keduanya harus dicadangkan bersama. Lokasi dapat diubah melalui `SISAKPROD_DATA_DIR` dan `SISAKPROD_UPLOAD_DIR`.

Menu admin dikelompokkan menjadi **Dokumen**, **Penilaian**, dan **Administrasi**. Pada **Administrasi → Pengaturan tampilan**, admin dapat mengganti nama aplikasi, subjudul, judul dan deskripsi halaman masuk, warna utama, font (termasuk Inter dan Open Sans lokal), teks footer, serta logo PNG/JPG/WebP maksimal 2 MB. Logo disimpan di folder `uploads/` sehingga ikut dalam cadangan. Warna utama perlu cukup gelap agar teks putih pada tombol tetap terbaca.

Menu **Paket asesor** menyediakan arsip ZIP baca untuk materi yang sudah disetujui. Cadangan dan pemulihan tersedia melalui `npm run backup` serta `npm run restore`; perintah dan rencana server dijelaskan di [panduan operasional](docs/OPERASIONAL_SERVER.md). Secara bawaan server hanya mendengarkan `127.0.0.1`; atur `HOST` bila ditempatkan di balik jaringan atau container yang memerlukannya.

## Alur penggunaan

1. Master 58 indikator IAU dari DL-09 tersedia pada `data/iau-indicators-2025.json` dan telah dimuat sebagai **draft** pada database proyek. Instalasi baru dapat memuatnya melalui tombol **Muat 58 indikator DL-09** pada halaman Instrumen. Admin/ketua prodi meninjau teks, dimensi, rujukan PDF, dan 8 penanda syarat perlu sebelum menekan **Konfirmasi pemetaan**. Impor hanya tersedia ketika belum ada indikator, sehingga tidak menimpa narasi atau penilaian pengguna.
2. Tim penyusun hanya melihat kriteria yang ditugaskan beserta indikator dan kebutuhan buktinya. Ringkasan menunjukkan tugas berikutnya. Pada detail indikator, tim memilih teks narasi atau tautan dokumen narasi, lalu menghubungkan kebutuhan bukti sekaligus menautkan dokumen HTTPS yang sudah dikerjakan di Google Drive, Docs, Sheets, atau sumber lain. Unggah berkas tersedia sebagai alternatif pada detail bukti. Validator/ketua prodi memeriksa tautan dan memvalidasi bukti; panel **Cakupan pemetaan** untuk tim hanya menghitung kriteria tugasnya.
3. Setelah daftar periksa narasi, hubungan bukti, dan sumber lengkap, tim mengajukan penilaian pada kriteria tugas dengan alasan. Verifikasi bukti dapat menyusul sebelum persetujuan akhir. Validator yang berbeda memeriksa; ketua prodi yang berbeda menyetujui.
4. Tujuh aturan master S1 sudah tersedia. Admin atau validator mengisi jumlah dosen, pembilang/penyebut persentase, pemeriksaan kelayakan, sumber data, tanggal acuan, dan bukti. Ketua prodi mengonfirmasi master serta menyetujui setiap nilai setelah buktinya terverifikasi. Simulasi dan syarat perlu merupakan ruang kerja lintas kriteria untuk admin, validator, dan ketua prodi.
5. Simulasi menghitung indikator yang melampaui SN-Dikti. Proyeksi **Unggul 5 tahun** memerlukan sedikitnya 52 indikator, seluruh 8 indikator syarat perlu, kelayakan, kualifikasi, dan publikasi/luaran. Proyeksi **Unggul 2 tahun** memerlukan sedikitnya 40 indikator, seluruh 8 indikator syarat perlu, kelayakan, dan kualifikasi. Hasil hanya muncul setelah semua 58 penilaian disetujui dan himpunan aturan dikonfirmasi.

## Batas saat ini

- Master 58 indikator sudah dimuat, tetapi status instrumen tetap **draft** sampai admin/ketua prodi memeriksanya. Master tujuh aturan S1 telah dimuat dari DL-09 Tabel 8 dan FAQ resmi LAMEMBA; nilai aktual, periode acuan, dan bukti masih perlu diisi penanggung jawab prodi.
- Akun tim penyusun yang belum mendapat penugasan tidak melihat indikator atau bukti. Admin perlu menetapkan kriteria sebelum akun tersebut mulai bekerja.
- Konfirmasi himpunan aturan adalah keputusan ketua prodi. Aplikasi memeriksa kesesuaian tujuh aturan master; hasil simulasi tetap proyeksi internal, bukan keputusan LAMEMBA.
- Data awal 138 bukti adalah daftar kebutuhan, belum berisi dokumen fisik. Hubungan bukti ke indikator belum dipetakan.
- Dokumen DOCX contoh dari program studi lain hanya dipakai sebagai referensi fitur, tanpa impor baris atau tautan ke database ini.
- Ekspor format pengajuan LAMEMBA, integrasi login kampus, dan penyimpanan objek terkelola belum tersedia.
- `node:sqlite` pada Node.js 25 masih berstatus pengembangan aktif. Untuk penggunaan produksi berskala kampus, evaluasi database dan penempatan server perlu dilakukan sebelum migrasi data resmi.
- Akses asesor adalah peran baca terbatas dan paket ZIP hanya memuat materi yang disetujui. Ketua prodi tetap perlu membuka akses asesor secara sengaja setelah materi nyata diperiksa.

## Sumber

- [FAQ resmi LAMEMBA: syarat Unggul 2 dan 5 tahun](https://lamemba.or.id/faq/)
- [DL-09 Panduan Penilaian Akreditasi Unggul 27 November 2025](https://drive.google.com/file/d/1AFxMWSIRfPM_xw3UTtmWu4cYS9mI21es/view) (tautan dari [KPM ITS](https://www.its.ac.id/kpm/spme/lam-emba/))
- [Pengumuman LAMEMBA yang merujuk Peraturan Nomor 2 Tahun 2025](https://lamemba.or.id/en/pengumuman-tentang-pengumpulan-dokumen-pemantauan-dan-evaluasi/)
- Spreadsheet kerja tim akreditasi yang diberikan pada percakapan ini.
