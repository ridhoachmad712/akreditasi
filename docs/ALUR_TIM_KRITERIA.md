# Alur kerja tim kriteria

Dokumen ini menjelaskan pekerjaan anggota tim penyusun yang ditugaskan admin pada satu atau beberapa kriteria. Halaman tim hanya menampilkan kriteria dan kebutuhan bukti yang berada dalam cakupan penugasannya.

## Objek kerja yang perlu dibedakan

| Objek | Arti | Tempat tim bekerja |
| --- | --- | --- |
| Indikator | Butir yang harus dijelaskan dan dinilai | Kriteria → detail indikator |
| Narasi | Penjelasan untuk satu indikator | Detail indikator, langkah 3 |
| Kebutuhan bukti | Daftar dokumen atau sumber yang diperlukan; satu kebutuhan dapat mendukung beberapa indikator | Detail indikator, langkah 1; katalog Dokumen |
| Berkas atau tautan | Dokumen dan sumber nyata untuk memenuhi kebutuhan bukti | Detail kebutuhan bukti |
| Penilaian internal | Hasil dan alasan disimpan sebagai draf sebelum narasi; setelah narasi lengkap, usulan dikirim untuk diperiksa validator dan disetujui ketua prodi | Detail indikator, langkah 2 |

Dengan pembagian ini, tim menautkan *kebutuhan bukti* pada indikator terlebih dahulu, kemudian mengunggah berkas atau menambah tautan pada kebutuhan tersebut. Unggahan tidak otomatis memilih indikator yang didukungnya. Hubungan indikator dan bukti dikelola dari detail indikator agar tidak ada dua lokasi penyuntingan untuk tim.

## Urutan yang diikuti pengguna

1. **Pilih kriteria tugas.** Ringkasan menunjukkan seluruh kriteria dan subkriteria (dimensi) yang ditugaskan, beserta progres indikatornya. Tim dapat membuka subkriteria untuk melihat semua indikator dan masuk langsung ke detailnya. Instrumen IAU juga memuat daftar lengkap kriteria tugas.
2. **Tahap 1 — siapkan bukti.** Hubungkan satu atau beberapa kebutuhan bukti ke indikator, tulis dasar hubungan, lalu tempel judul dan tautan dokumen yang sudah ada. Jika kebutuhan bukti sudah memiliki sumber, kolom dokumen boleh dikosongkan. Tautan tambahan untuk bukti yang sama dapat ditambahkan dari halaman indikator.
3. **Gunakan katalog untuk rincian atau pengecualian.** Detail kebutuhan bukti menampilkan seluruh sumber dan status pemeriksaan. **Unggah berkas sebagai alternatif** tersedia jika tautan tidak dapat digunakan. Tim dapat membuat kebutuhan baru dalam kriteria tugasnya. Validator memverifikasi bukti.
4. **Tahap 2 — simpan penilaian awal.** Setelah setiap bukti terhubung memiliki sumber, pilih hasil pelampauan SN-Dikti dan tulis alasan beserta kode bukti. Simpan sebagai draf. Narasi belum diperlukan pada tahap ini; draf dapat diperbarui sebelum diajukan.
5. **Tahap 3 — lengkapi narasi dan ajukan.** Tulis narasi di aplikasi atau tautkan dokumen HTTPS yang sudah dikerjakan. Satu sumber narasi aktif untuk setiap indikator. Ketika bukti, draf penilaian, dan narasi tersedia, tombol **Ajukan untuk pemeriksaan** aktif. Tautan narasi masuk ke paket baca asesor sebagai tautan; aplikasi belum menyimpan salinan isi dokumen eksternal.
6. **Ikuti pemeriksaan.** Validator memeriksa sumber dan usulan. Ketua prodi memberi persetujuan akhir. Perubahan narasi, berkas, atau tautan setelah pemeriksaan mengembalikan status terkait ke revisi. Tim memperbarui draf penilaian awal sebelum mengajukan ulang.

## Temuan UX dan keputusan perbaikan

- Sebelumnya tombol **Tambah bukti** bisa disalahartikan sebagai unggah file. Tombol itu sekarang bernama **Buat kebutuhan baru** untuk tim; unggahan dilakukan di detail kebutuhan.
- Untuk tim, langkah 1–3 ditampilkan berurutan dalam satu kolom: bukti, penilaian awal, lalu narasi dan pengajuan.
- Sebelumnya halaman detail bukti juga menjadi tempat menyunting hubungan dengan indikator. Untuk tim, hubungan itu hanya dibaca di halaman bukti dan disunting dari indikator.
- Status **Terverifikasi** hanya dapat ditetapkan validator. Pilihan itu tidak disajikan pada formulir tim.
- Daftar kebutuhan bukti di layar kecil kini memakai kartu agar tindakan Buka tidak tersembunyi akibat tabel yang terlalu lebar.
- Form tautan dokumen tersedia langsung pada detail indikator. Form unggah berkas berada dalam detail bukti sebagai alternatif yang dapat dibuka bila diperlukan.
- Ringkasan tim menampilkan daftar tugas berikutnya; menu Katalog bukti berfungsi untuk rincian sumber dan kebutuhan yang belum ada.
- Tim melihat status bukti sebagai informasi. Penambahan sumber serta pemeriksaan validator mengubah status secara otomatis.

## Batas alur yang perlu dipahami

- Draf penilaian dapat disimpan setelah bukti dan sumber tersedia. Pengajuan memerlukan draf serta narasi, walaupun bukti belum terverifikasi. Persetujuan akhir mensyaratkan seluruh bukti yang tertaut terverifikasi.
- Kebutuhan bukti yang sama dapat mendukung beberapa indikator. Mengubah berkas atau tautannya berpotensi mengembalikan penilaian terkait ke revisi.
- Tim dapat membuat kebutuhan bukti baru hanya pada kriteria tugasnya. Admin tetap perlu menjaga konsistensi kode dan menghindari kebutuhan ganda dalam katalog.
- Tautan HTTPS saat ini adalah rujukan ke dokumen sumber; aplikasi belum mengambil isi Google Docs atau Sheets, memeriksa izin akses, atau menyimpan salinan dokumen eksternal secara otomatis. Hak akses pada dokumen sumber perlu diatur agar validator, ketua prodi, dan asesor yang berwenang dapat membukanya.
