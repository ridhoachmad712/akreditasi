# Operasional SISAKPROD

Dokumen ini menyiapkan satu instalasi internal S1 Manajemen FEB UNM. Akun dan dokumen akreditasi merupakan data terbatas; administrator server harus membatasi akses ke database, berkas, dan cadangan.

## Penempatan server

1. Siapkan server dengan Node.js yang mendukung `node:sqlite` (lingkungan pengembangan saat ini memakai Node.js 25), npm, ruang penyimpanan untuk database, unggahan, dan cadangan. Uji versi Node yang dipilih dengan `npm test` sebelum migrasi. Evaluasi kestabilan `node:sqlite` untuk produksi kampus.
2. Letakkan kode aplikasi di direktori tersendiri. Simpan database dan unggahan pada dua direktori persisten **di luar kode aplikasi**, misalnya `D:\SISAKPROD\data` dan `D:\SISAKPROD\uploads`. Akun layanan diberi akses baca/tulis pada kedua direktori itu; pengguna biasa tidak diberi akses langsung.
3. Jalankan `npm ci --omit=dev`, lalu set `NODE_ENV=production`, `SISAKPROD_DATA_DIR`, `SISAKPROD_UPLOAD_DIR`, `PORT=3000`, dan `HOST=127.0.0.1`. Jalankan `npm start` sebagai layanan yang otomatis hidup kembali setelah server reboot.
4. Tempatkan reverse proxy HTTPS di depan aplikasi. Teruskan header `Host` asli dan batasi ukuran permintaan sedikit di atas 15 MB. Buka HTTPS ke pengguna yang berwenang; port aplikasi tetap hanya di loopback atau jaringan privat yang dibatasi firewall. `HOST=0.0.0.0` hanya dipakai bila penempatan container atau jaringan internal memerlukannya dan akses dibatasi di lapisan jaringan.
5. Buat akun admin pada pembukaan pertama, lalu akun tim, validator, ketua prodi, dan asesor secara terpisah. Ketua prodi membuka akses asesor setelah bahan yang disetujui siap. Gunakan TLS, kata sandi unik, pembaruan OS/Node berkala, dan pemantauan kapasitas penyimpanan.

Contoh PowerShell untuk proses aplikasi (atur nilainya sesuai server):

```powershell
$env:NODE_ENV = 'production'
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
$env:SISAKPROD_DATA_DIR = 'D:\SISAKPROD\data'
$env:SISAKPROD_UPLOAD_DIR = 'D:\SISAKPROD\uploads'
npm ci --omit=dev
npm start
```

## Paket asesor

Menu **Paket asesor** tersedia untuk admin, ketua prodi, dan asesor saat akses asesor dibuka. Unduhan ZIP berisi `index.html`, `manifest.json`, narasi dan keputusan indikator yang disetujui, serta salinan berkas dari bukti terverifikasi. Tautan eksternal yang sudah diverifikasi tercantum tetapi memerlukan internet. Perubahan narasi atau bukti membatalkan persetujuan dan mengeluarkan materi tersebut dari paket berikutnya. Jika berkas yang tercatat hilang di penyimpanan, unduhan ditolak sampai dipulihkan.

ZIP adalah salinan pada saat unduh; bagikan versi terbaru setelah perubahan persetujuan. Simpan dan kirim paket melalui saluran kampus yang dibatasi karena isinya dapat memuat data pribadi dan dokumen internal.

## Pencadangan

Jadwalkan waktu tanpa perubahan data, hentikan layanan aplikasi, lalu jalankan:

```powershell
npm run backup -- --output 'D:\SISAKPROD\backups\2026-10-04-001'
```

Skrip menggunakan API backup SQLite untuk menyalin database secara konsisten, menyalin folder unggahan, memeriksa integritas snapshot, dan membuat `manifest.json` berisi ukuran serta SHA-256 setiap berkas. Folder output harus baru. Setelah pesan **Cadangan siap**, hidupkan kembali layanan.

Simpan beberapa generasi cadangan pada lokasi lain yang terenkripsi dan dapat diakses terbatas. Uji pemulihan secara berkala. Jangan hanya menyalin `sisakprod.sqlite` saat aplikasi aktif: database memakai mode WAL dan perubahan terbaru dapat berada di berkas WAL.

## Pemulihan

1. Hentikan layanan aplikasi. Siapkan dua direktori tujuan baru yang belum ada. Jangan menimpa direktori produksi secara langsung.
2. Jalankan perintah berikut. Skrip memeriksa checksum semua berkas dan `PRAGMA integrity_check` sebelum menyalin.

```powershell
npm run restore -- --backup 'D:\SISAKPROD\backups\2026-10-04-001' --data-dir 'D:\SISAKPROD\recovery-data' --upload-dir 'D:\SISAKPROD\recovery-uploads'
```

3. Set `SISAKPROD_DATA_DIR` dan `SISAKPROD_UPLOAD_DIR` ke kedua folder hasil pemulihan, jalankan aplikasi, lalu periksa jumlah indikator, bukti, akun, dan unduh satu berkas uji. Simpan direktori lama sampai hasil pemulihan diterima.

## Pemeriksaan sebelum penggunaan resmi

- Jalankan `npm test` pada versi aplikasi yang akan dipasang.
- Minta admin dan ketua prodi memeriksa master 58 indikator serta tujuh aturan S1 sebelum konfirmasi.
- Uji akun nyata untuk tim, validator, ketua prodi, dan asesor; periksa pembatasan akses serta pengunduhan paket.
- Tentukan penanggung jawab cadangan, lokasi penyimpanan, frekuensi, masa simpan, dan prosedur uji pemulihan sesuai kebijakan FEB/UNM.
