# Alur kerja tim kriteria

Dokumen ini menjelaskan pekerjaan anggota tim penyusun yang ditugaskan admin pada satu atau beberapa kriteria. Halaman tim hanya menampilkan kriteria dan kebutuhan bukti yang berada dalam cakupan penugasannya.

## Objek kerja yang perlu dibedakan

| Objek | Arti | Tempat tim bekerja |
| --- | --- | --- |
| Indikator | Butir yang harus dijelaskan dan dinilai | Kriteria → detail indikator |
| Narasi | Penjelasan untuk satu indikator | Detail indikator, langkah 1 |
| Kebutuhan bukti | Daftar dokumen atau sumber yang diperlukan; satu kebutuhan dapat mendukung beberapa indikator | Detail indikator, langkah 2; katalog Dokumen |
| Berkas atau tautan | Dokumen dan sumber nyata untuk memenuhi kebutuhan bukti | Detail kebutuhan bukti |
| Penilaian internal | Usulan hasil beserta alasan; diperiksa validator lalu disetujui ketua prodi | Detail indikator, langkah 3 |

Dengan pembagian ini, tim menautkan *kebutuhan bukti* pada indikator terlebih dahulu, kemudian mengunggah berkas atau menambah tautan pada kebutuhan tersebut. Unggahan tidak otomatis memilih indikator yang didukungnya. Hubungan indikator dan bukti dikelola dari detail indikator agar tidak ada dua lokasi penyuntingan untuk tim.

## Urutan yang diikuti pengguna

1. **Pilih kriteria tugas.** Ringkasan menunjukkan seluruh kriteria dan subkriteria (dimensi) yang ditugaskan, beserta progres indikatornya. Tim dapat membuka subkriteria untuk melihat semua indikator dan masuk langsung ke detailnya. Instrumen IAU juga memuat daftar lengkap kriteria tugas.
2. **Siapkan narasi pada indikator.** Pilih menulis teks di aplikasi atau menautkan dokumen narasi HTTPS yang sudah dikerjakan, misalnya Google Docs. Satu sumber narasi aktif untuk setiap indikator. Nomor versi dan waktu perubahan tampil di halaman. Tautan narasi masuk ke paket baca asesor sebagai tautan; aplikasi belum menyimpan salinan isi dokumen eksternal.
3. **Hubungkan kebutuhan bukti dan sumbernya dalam satu halaman.** Cari kode atau judul kebutuhan bukti, tulis dasar hubungan, lalu tempel judul serta tautan dokumen yang sudah ada. Satu tindakan menyimpan hubungan dan tautan. Jika kebutuhan yang dipilih sudah memiliki sumber, kolom dokumen boleh dikosongkan. Tautan tambahan untuk bukti yang sudah terhubung juga dapat ditempel dari halaman indikator.
4. **Gunakan katalog untuk rincian atau pengecualian.** Detail kebutuhan bukti tetap menampilkan seluruh sumber, status pemeriksaan, dan pilihan **Unggah berkas sebagai alternatif** jika tautan tidak dapat digunakan. Jika kebutuhan belum ada, tim dapat membuatnya dalam kriteria tugas. Status **Sumber tersedia** muncul otomatis setelah tautan atau berkas ditambahkan; validator memverifikasi bukti.
5. **Periksa kelengkapan dan ajukan.** Daftar periksa pada indikator menunjukkan narasi, hubungan bukti, dan sumber untuk setiap bukti. Ketiganya harus lengkap sebelum tombol pengajuan aktif; verifikasi validator dapat menyusul. Tim memilih hasil pelampauan dan menulis alasan serta kode bukti. Selama usulan diproses atau disetujui, formulir pengajuan ulang disembunyikan. Setelah revisi, tim memperbaiki isi dan mengajukan ulang.
6. **Ikuti pemeriksaan.** Validator memeriksa sumber dan usulan. Ketua prodi memberi persetujuan akhir. Perubahan narasi, berkas, atau tautan setelah pemeriksaan mengembalikan status terkait ke revisi sehingga keputusan lama tidak dipakai tanpa pemeriksaan ulang.

## Temuan UX dan keputusan perbaikan

- Sebelumnya tombol **Tambah bukti** bisa disalahartikan sebagai unggah file. Tombol itu sekarang bernama **Buat kebutuhan baru** untuk tim; unggahan dilakukan di detail kebutuhan.
- Sebelumnya penilaian berdampingan dengan bukti sehingga tampak bisa dimulai tanpa memahami urutannya. Untuk tim, langkah 1–3 ditampilkan berurutan dalam satu kolom.
- Sebelumnya halaman detail bukti juga menjadi tempat menyunting hubungan dengan indikator. Untuk tim, hubungan itu hanya dibaca di halaman bukti dan disunting dari indikator.
- Status **Terverifikasi** hanya dapat ditetapkan validator. Pilihan itu tidak disajikan pada formulir tim.
- Daftar kebutuhan bukti di layar kecil kini memakai kartu agar tindakan Buka tidak tersembunyi akibat tabel yang terlalu lebar.
- Form tautan dokumen tersedia langsung pada detail indikator. Form unggah berkas berada dalam detail bukti sebagai alternatif yang dapat dibuka bila diperlukan.
- Ringkasan tim menampilkan daftar tugas berikutnya; menu Katalog bukti berfungsi untuk rincian sumber dan kebutuhan yang belum ada.
- Tim melihat status bukti sebagai informasi. Penambahan sumber serta pemeriksaan validator mengubah status secara otomatis.

## Batas alur yang perlu dipahami

- Pengajuan penilaian dapat dilakukan ketika narasi, hubungan bukti, dan sumbernya tersedia, walaupun bukti belum terverifikasi. Alasannya wajib diisi. Persetujuan akhir mensyaratkan seluruh bukti yang tertaut terverifikasi.
- Kebutuhan bukti yang sama dapat mendukung beberapa indikator. Mengubah berkas atau tautannya berpotensi mengembalikan penilaian terkait ke revisi.
- Tim dapat membuat kebutuhan bukti baru hanya pada kriteria tugasnya. Admin tetap perlu menjaga konsistensi kode dan menghindari kebutuhan ganda dalam katalog.
- Tautan HTTPS saat ini adalah rujukan ke dokumen sumber; aplikasi belum mengambil isi Google Docs atau Sheets, memeriksa izin akses, atau menyimpan salinan dokumen eksternal secara otomatis. Hak akses pada dokumen sumber perlu diatur agar validator, ketua prodi, dan asesor yang berwenang dapat membukanya.
