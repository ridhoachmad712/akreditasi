# Menjalankan SISAKPROD dengan MySQL Hostinger

Panduan ini untuk aplikasi Node.js SISAKPROD pada Hostinger Cloud Hosting. MySQL tersedia melalui **Websites → Dashboard → Databases → Management**. Tombol **Connect** pada dashboard Node.js hanya menampilkan penyedia database eksternal dan tidak diperlukan untuk MySQL Hostinger.

## 1. Siapkan database dan folder unggahan

1. Pada **Databases → Management**, buat satu database MySQL baru beserta pengguna dan kata sandinya. Catat **nama database lengkap**, **username lengkap**, dan **database host** yang ditampilkan hPanel. Prefix akun Hostinger adalah bagian dari nama database dan username.
2. Melalui SSH, jalankan `echo "$HOME"` untuk mengetahui direktori akun. Buat folder unggahan di luar `hbuilds` dan `public_html`, misalnya `mkdir -p "$HOME/sisakprod-uploads"`. Pastikan akun aplikasi bisa menulis ke folder tersebut.
3. Jangan simpan kata sandi database dalam kode, GitHub, atau dokumen proyek.

## 2. Isi environment variables aplikasi Node.js

Buka **Website Dashboard → Environment variables** dan isi:

| Nama | Nilai |
| --- | --- |
| `DB_DRIVER` | `mysql` |
| `DB_HOST` | Host database dari hPanel; pada banyak instalasi Hostinger nilainya `localhost` |
| `DB_PORT` | `3306`, kecuali hPanel memberi port lain |
| `DB_USER` | Username database lengkap dari hPanel |
| `DB_PASSWORD` | Kata sandi pengguna database |
| `DB_NAME` | Nama database lengkap dari hPanel |
| `SISAKPROD_UPLOAD_DIR` | Path absolut folder tetap, misalnya `/home/u123456789/sisakprod-uploads` |
| `NODE_ENV` | `production` |

Gunakan **Apply changes** setelah nilai diperiksa. Jangan gunakan `SISAKPROD_DATA_DIR` untuk mode MySQL; variabel itu khusus SQLite. Kode akan menolak mode produksi tanpa `DB_DRIVER`, serta menolak folder unggahan di dalam folder aplikasi pada mode MySQL.

## 3. Deploy dan periksa

1. Deploy kode yang sudah mendukung MySQL. Pada database kosong, aplikasi membuat tabel, tujuh kriteria, 21 dimensi, 138 kebutuhan bukti, dan tujuh aturan S1 secara otomatis. Admin kemudian memuat master 58 indikator melalui menu Instrumen IAU.
2. Buka `/api/setup-status`; respons `needsSetup: true` menandakan database masih belum memiliki admin. Segera buat akun admin pertama dari halaman aplikasi.
3. Masuk sebagai admin. Periksa tujuh kriteria, 138 bukti awal, dan pengaturan tampilan. Muat 58 indikator dan periksa jumlah serta rujukannya.
4. Uji persistensi: ubah nama aplikasi atau buat akun uji, restart aplikasi dari hPanel, lalu pastikan perubahan masih ada. Uji tautan bukti dan satu unggahan berkas kecil; unduh lagi berkas setelah restart.
5. Periksa **Runtime logs** bila aplikasi gagal berjalan. Kesalahan `DB_*` berarti variabel lingkungan atau hak akses database perlu diperiksa. Jangan membuat akun admin baru pada database yang berbeda untuk mengatasi masalah koneksi.

## Cadangan dan pemulihan

Cadangkan **database MySQL dan folder unggahan** sebagai satu pasangan. Gunakan fitur **Backups** di hPanel untuk database dan periksa apakah folder unggahan di luar folder deploy ikut dalam cadangan file. Jika tidak, unduh atau cadangkan folder unggahan secara terpisah. Simpan salinan tambahan di tempat terbatas di luar hosting. Uji pemulihan pada lingkungan uji sebelum diperlukan dalam keadaan darurat.

`npm run backup` dan `npm run restore` hanya untuk SQLite dan sengaja menolak `DB_DRIVER=mysql`.

## Pengembangan lokal

Tanpa `DB_DRIVER` dalam mode pengembangan, aplikasi tetap memakai SQLite untuk pengujian cepat. Untuk menguji MySQL lokal, buat database kosong, isi `DB_DRIVER=mysql` dan `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, lalu jalankan `npm start`. Jangan arahkan pengujian ke database produksi.
