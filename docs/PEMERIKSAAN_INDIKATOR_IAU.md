# Pemeriksaan Master Indikator IAU

Master: [`data/iau-indicators-2025.json`](../data/iau-indicators-2025.json). Sumber: [DL-09 Panduan Penilaian Akreditasi Unggul 27 November 2025](https://drive.google.com/file/d/1AFxMWSIRfPM_xw3UTtmWu4cYS9mI21es/view), ditautkan oleh [KPM ITS](https://www.its.ac.id/kpm/spme/lam-emba/). SHA-256 berkas PDF yang dipakai untuk transkripsi: `2b9d79bf79e26a0287e3c1b5652edd1e22b5561e78bd6c4e43eff8e4e25d8f59`.

Master memuat **58 indikator** dalam **21 dimensi**. Kode SISAKPROD memakai bentuk `Kx.Dy.nn`; kode ini adalah identitas internal, sedangkan teks dan rujukan PDF menjadi acuan substansi. Tabel 1 DL-09 dipakai untuk memeriksa jumlah per dimensi, Tabel 6 untuk teks indikator, dan Tabel 7 untuk delapan indikator syarat perlu. Teks Kinerja Akademik Mahasiswa diambil dari uraian lengkap pada PDF halaman 10–11 karena Tabel 6 pada PDF halaman 22 hanya menampilkan deskripsi dimensi.

| Kriteria | Jumlah dimensi | Jumlah indikator | Indikator syarat perlu |
| --- | ---: | ---: | ---: |
| K1 Orientasi Strategis | 4 | 15 | 4 |
| K2 Tata Pamong dan Tata Kelola | 2 | 5 | 1 |
| K3 Pengelolaan Mahasiswa | 5 | 9 | 0 |
| K4 Dosen dan Tenaga Kependidikan | 4 | 10 | 0 |
| K5 Keuangan dan Sarana Prasarana | 2 | 4 | 0 |
| K6 Pendidikan dan Pengajaran | 2 | 7 | 1 |
| K7 Penelitian dan PKM | 2 | 8 | 2 |
| **Jumlah** | **21** | **58** | **8** |

Delapan kode syarat perlu yang harus cocok dengan Tabel 7:

1. `K1.D1.01` — pencapaian misi.
2. `K1.D2.01` — pencapaian visi.
3. `K1.D3.01` — pencapaian tujuan.
4. `K1.D3.02` — pencapaian sasaran.
5. `K2.D1.03` — sistem manajemen mutu internal.
6. `K6.D1.01` — penggunaan peta kurikulum.
7. `K7.D1.03` — kerja sama/keterlibatan penelitian.
8. `K7.D2.03` — kerja sama/keterlibatan pengabdian kepada masyarakat.

## Langkah pemeriksaan dalam aplikasi

1. Masuk sebagai admin atau ketua prodi dan buka **Instrumen IAU** di `http://localhost:3000`.
2. Bandingkan teks, dimensi, delapan penanda syarat perlu, serta halaman sumber dengan DL-09. Jika ada koreksi redaksi, buka indikator lalu simpan perubahan. Perubahan akan menjaga status instrumen sebagai `draft`.
3. Setelah seluruh pemetaan benar, pilih **Konfirmasi pemetaan**. Aplikasi memeriksa jumlah 58, semua rujukan terisi, serta kecocokan kode/dimensi/delapan penanda sebelum mengubah status ke `confirmed`.

Konfirmasi master tidak menilai capaian PS dan tidak menautkan bukti secara otomatis. Tahap berikutnya adalah pemetaan 138 kebutuhan bukti prodi ke indikator yang relevan.
