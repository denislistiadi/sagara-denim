# Roadmap Sagara Denim

Dokumen ini merangkum status aplikasi, batas cakupan saat ini, dan prioritas
berikutnya. Kontrak API dan aturan bisnis tetap menjadi sumber kebenaran di
[`backend/README.md`](backend/README.md); perilaku UI ada di
[`frontend/README.md`](frontend/README.md).

## Status saat ini

Aplikasi mencakup alur operasional inti dari pembuatan perintah produksi sampai
laporan:

- Autentikasi cookie `httpOnly`, rotasi refresh token, dan otorisasi tiga peran
  (`admin`, `operator`, `qc`).
- Dashboard produksi, antrean lima tahap, perintah produksi multi-item,
  workflow, production log, pembatalan, rework, dan arsip.
- Inventori bahan dengan mutasi masuk, keluar, penyesuaian, dan riwayat saldo.
- Laporan produksi dengan filter periode, tahap, dan perintah, rekap harian dan
  per tahap, pagination log, serta export CSV.
- Data master pelanggan, produk, dan pengguna.
- 123 tes backend, smoke test E2E alur order sampai export CSV, serta CI untuk
  backend, frontend, dan E2E.

Status ini cukup untuk pilot internal dan penggunaan terbatas. Sebelum dipakai
sebagai sistem produksi penuh, selesaikan minimal item prioritas P0 di bawah.

## Prioritas berikutnya

| Prioritas | Area | Langkah berikutnya | Alasan |
| --- | --- | --- | --- |
| P0 | Observability | Log terstruktur, request ID, metrik endpoint, dan error tracking | Kegagalan produksi harus dapat dilacak tanpa mereproduksi lokal |
| P0 | Backup dan pemulihan | Jadwal backup PostgreSQL, retensi, serta uji restore berkala | Data produksi dan riwayat stok tidak boleh bergantung pada satu volume |
| P0 | Deployment | Pipeline rilis dengan artifact, migrasi terkontrol, dan rollback | CI sudah memverifikasi kode, tetapi belum men-deploy secara otomatis |
| P0 | Keamanan operasional | Manajemen secret, rate limit login, security header, dan pemindaian dependency | Melengkapi kontrol aplikasi yang sudah ada |
| P1 | Pengujian frontend | Tes komponen untuk form, filter, dan guard peran; perluas E2E ke QC dan inventori | E2E saat ini baru mencakup satu alur utama |
| P1 | Aksesibilitas | Audit keyboard, fokus dialog, label, dan kontras | Aplikasi internal tetap harus dapat dipakai semua operator |
| P1 | Performa | Uji beban endpoint daftar/laporan dan tinjau index query | Volume log dan order akan bertambah seiring waktu |
| P1 | Audit trail | Perluas jejak audit ke perubahan data master dan pengguna | Status order dan mutasi stok sudah tercatat; perubahan master belum |
| P2 | Notifikasi | Peringatan deadline dan stok kritis melalui kanal internal | Mengurangi pemantauan manual harian |
| P2 | Laporan | Export terjadwal atau format selain CSV bila kebutuhan operasional muncul | CSV sudah memenuhi kebutuhan saat ini |
| P2 | Deployment frontend | Dockerfile atau konfigurasi platform bila tim memilih container | Belum diperlukan selama frontend dijalankan dengan Node.js langsung |

## Kriteria rilis produksi

Rilis dianggap siap produksi bila:

1. Seluruh item P0 selesai dan diuji di lingkungan yang menyerupai produksi.
2. `pytest`, `ruff`, `typecheck`, `lint`, `build`, dan smoke test E2E lulus di
   CI pada commit yang akan dirilis.
3. Migrasi database dijalankan sebagai langkah deploy dan diuji pada salinan
   data produksi.
4. Backup terbaru tersedia dan prosedur restore sudah diverifikasi.
5. `JWT_SECRET`, kredensial database, dan origin CORS dikelola lewat secret
   manager, bukan file yang masuk repositori.
6. HTTPS aktif, `COOKIE_SECURE=true`, dan akses dokumentasi API dibatasi.

## Di luar cakupan saat ini

- Aplikasi mobile native.
- Integrasi pembayaran, akuntansi, atau e-commerce.
- Perencanaan kebutuhan bahan otomatis dari resep produksi.
- Multi-tenant atau multi-cabang dengan pemisahan data.
- Prediksi produksi berbasis machine learning.
- Notifikasi eksternal (email, WhatsApp, atau push) sebelum kanal internal
  ditetapkan.

Perubahan prioritas harus disertai alasan operasional dan dampak pada kontrak
API, migrasi, serta pengujian.
