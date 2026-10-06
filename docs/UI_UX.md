# Arah UI/UX SISAKPROD

Antarmuka memakai [contoh Dashboard HeroUI](https://heroui.com/) sebagai referensi visual dan [anti-slop](https://github.com/miqdadbadjuber/anti-slop) sebagai pemeriksaan kualitas. Aplikasi tetap menggunakan JavaScript dan CSS yang sudah ada; belum ada migrasi ke React atau dependensi HeroUI.

## Prinsip tampilan

- Kanvas abu sangat muda, navigasi atas dan panel putih, teks gelap, serta satu warna utama yang dapat diatur untuk tindakan utama dan navigasi aktif. Pada desktop, logo, menu, dan akun sejajar; pada layar kecil, kelompok menu berada di baris berikutnya dan menyesuaikan lebar layar. Navigasi dan seluruh halaman kerja memakai batas lebar bersama 1264 px (isi 1200 px pada desktop) tanpa sidebar.
- Tipografi sans yang jelas, judul singkat, angka ringkasan mudah dipindai, ruang kosong cukup tanpa hiasan yang tidak membantu tugas.
- Status memakai warna yang konsisten: biru untuk informasi, hijau untuk terverifikasi/disetujui, kuning untuk menunggu, merah untuk revisi.
- Formulir dan tombol memiliki fokus keyboard yang tampak; menu dapat digeser pada layar kecil, tabel dapat digulir mendatar.
- Daftar bukti ditampilkan 20 entri per halaman agar 138 kebutuhan bukti tidak memenuhi satu layar panjang. Pencarian dan filter tetap berlaku sebelum pembagian halaman.
- Ringkasan tim kriteria menampilkan tiga angka agregat (perlu tindakan, menunggu pemeriksaan, disetujui). Setiap kriteria menjadi judul kelompok tanpa panel luar; subkriteria (dimensi) tampil sebagai kartu langsung di bawahnya. Kartu menampilkan jumlah indikator dan status yang perlu perhatian, lalu melebar saat dibuka untuk menampilkan indikator dan akses ke detailnya.
- Judul panel dan informasi ringkas dapat membungkus tanpa bertumpuk. Angka pada kartu status memiliki posisi yang konsisten meskipun label terdiri dari dua baris.
- Pencarian dan filter katalog mengikuti lebar layar; tombol **Cari** dan **Reset** berada dalam satu kelompok. Teks panjang pada daftar dapat membungkus agar tidak mendorong tombol keluar layar.
- Halaman detail indikator memakai satu area kerja yang dipusatkan, dengan tombol kembali dekat judul dan tiga langkah bukti, penilaian awal, lalu narasi dalam urutan vertikal. Penilaian awal disimpan sebagai draf; tombol pengajuan berada setelah narasi.
- Menu atas dikelompokkan menjadi **Dokumen**, **Penilaian**, dan **Administrasi** sesuai peran. Admin mendapat halaman **Pengaturan tampilan** untuk nama dan subjudul aplikasi, logo, warna utama, font, teks halaman masuk, dan footer. Pengaturan diterapkan pada halaman masuk dan seluruh halaman kerja.
- Pilihan font mencakup Inter dan Open Sans yang disimpan lokal, serta font sistem, Segoe UI, dan Arial.
- Ikon garis digunakan konsisten pada kelompok menu, ringkasan, dan katalog bukti. Progres pada ringkasan memisahkan pemetaan instrumen, verifikasi bukti, dan persetujuan penilaian agar cakupan instrumen tidak disalahartikan sebagai kesiapan akreditasi. Kartu dimensi tim menampilkan jumlah indikator yang mulai dikerjakan; detail indikator menunjukkan tahapan bukti, penilaian, dan narasi.

## Alur utama

Ringkasan menunjukkan data aktual dan tautan pekerjaan sesuai peran. Admin dapat masuk ke instrumen, bukti, dan simulasi. Tim penyusun hanya masuk ke kriteria dan bukti yang ditugaskan. Validator dan ketua prodi mendapat arah kerja sesuai tugas pemeriksaan dan persetujuan. Tombol **Buka** pada kriteria menuju bagian kriteria yang dipilih.
