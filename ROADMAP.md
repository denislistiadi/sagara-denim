# Roadmap Sagara Denim

Dokumen ini merangkum status aplikasi, batas cakupan saat ini, dan prioritas
berikutnya. Kontrak API dan aturan bisnis tetap menjadi sumber kebenaran di
[`backend/README.md`](backend/README.md); perilaku UI ada di
[`frontend/README.md`](frontend/README.md).

## Status saat ini

Aplikasi mencakup alur operasional inti dari pembuatan perintah produksi sampai
laporan, ditambah pondasi produksi M8:

- Autentikasi cookie `httpOnly`, rotasi refresh token, dan otorisasi tiga peran
  (`admin`, `operator`, `qc`).
- Dashboard produksi, antrean lima tahap, perintah produksi multi-item,
  workflow, production log dengan output/reject/scrap, rework berbasis reject
  QC, rekonsiliasi output final, pembatalan, dan arsip.
- Inventori bahan dengan mutasi masuk, keluar, penyesuaian, dan riwayat saldo.
- Laporan produksi dengan filter periode, tahap, dan perintah, rekap harian dan
  per tahap, pagination log, serta export CSV.
- Data master pelanggan, produk, dan pengguna.
- Observability: JSON log, `X-Request-ID`, metrik Prometheus berlabel route
  template, health live/ready, Prometheus + Grafana + node-exporter, dan alert
  dasar.
- Keamanan operasional: rate limit login per email/IP berbasis PostgreSQL,
  security header di Caddy dan API, proteksi bearer token `/api/metrics`,
  validasi profil produksi, serta audit dependency.
- Backup lokal: dump `pg_dump` + checksum + retensi + metrik, verifikasi restore
  ke database scratch, drill CI, dan restore ke staging lokal.
- Deployment: image backend/frontend multi-stage, Compose produksi dengan
  jaringan terpisah dan role database least-privilege, migrasi one-shot,
  rilis immutable ke GHCR dengan SBOM/provenance dan gate Trivy.
- 188 tes backend, 110 tes frontend Vitest + Testing Library, serta tiga alur
  E2E: produksi, inventori, dan QC read-only.
- CI untuk backend, frontend, E2E, build/scan image, dan drill backup/restore.

Status ini cukup untuk pilot internal di satu VPS. Sebelum data produksi nyata
masuk, penuhi gate off-host backup di bawah.

## Prioritas berikutnya

| Prioritas | Area | Langkah berikutnya | Alasan |
| --- | --- | --- | --- |
| P0 | Backup off-host | Unggah dump + checksum ke object storage S3-compatible dan uji restore dari sana | Backup lokal tidak melindungi dari kehilangan VPS |
| P1 | Aksesibilitas | Audit keyboard, fokus dialog, label, dan kontras | Aplikasi internal tetap harus dapat dipakai semua operator |
| P1 | Performa | Uji beban endpoint daftar/laporan dan tinjau index query | Volume log dan order akan bertambah seiring waktu |
| P1 | Audit trail | Perluas jejak audit ke perubahan data master dan pengguna | Status order dan mutasi stok sudah tercatat; perubahan master belum |
| P1 | Drill operasional | Latihan rollback image dan restore produksi terjadwal | Prosedur yang tidak dilatih tidak dapat diandalkan saat insiden |
| P2 | Notifikasi | Peringatan deadline dan stok kritis melalui kanal internal | Mengurangi pemantauan manual harian |
| P2 | Laporan | Export terjadwal atau format selain CSV bila kebutuhan operasional muncul | CSV sudah memenuhi kebutuhan saat ini |
| P2 | Multi-arch image | Build `linux/arm64` bila VPS atau lingkungan DR memakai ARM | Saat ini rilis fokus `linux/amd64` |

## Kriteria rilis produksi

Rilis dianggap siap untuk pilot produksi bila:

1. Seluruh item P0 M8 selesai dan diuji di lingkungan yang menyerupai produksi.
2. `pytest`, `ruff`, `pip-audit`, `typecheck`, `lint`, `test`, `build`, tiga
   alur E2E, build/scan image, dan drill backup/restore lulus di CI pada commit
   yang akan dirilis.
3. Migrasi database dijalankan sebagai langkah deploy dan diuji pada salinan
   data produksi.
4. Backup terbaru tersedia dan prosedur restore sudah diverifikasi.
5. `JWT_SECRET`, `METRICS_TOKEN`, kredensial database, dan secret lain dikelola
   lewat file environment `600`, bukan masuk repositori.
6. HTTPS aktif, `COOKIE_SECURE=true`, `DOCS_ENABLED=false`, `CORS_ORIGINS=[]`,
   dan `/api/metrics` tidak dapat diakses publik.
7. Uptime monitor eksternal aktif ke `/api/health/ready`.
8. Rollback ke image sebelumnya sudah dicatat dan diuji.

Gate sebelum data produksi nyata: backup off-host aktif dan pernah diuji
restore. Selama data masih pilot, backup lokal di VPS diterima sebagai risiko
yang dicatat.

## Di luar cakupan saat ini

- Aplikasi mobile native.
- Integrasi pembayaran, akuntansi, atau e-commerce.
- Perencanaan kebutuhan bahan otomatis dari resep produksi.
- Multi-tenant atau multi-cabang dengan pemisahan data.
- Prediksi produksi berbasis machine learning.
- Notifikasi eksternal (email, WhatsApp, atau push) sebelum kanal internal
  ditetapkan.
- HA multi-node, Kubernetes, Redis, PITR/WAL archiving, tracing
  OpenTelemetry/Sentry, CDN, dan CSP nonce. Keputusan penundaan dicatat di
  [`docs/architecture.md`](docs/architecture.md).

Perubahan prioritas harus disertai alasan operasional dan dampak pada kontrak
API, migrasi, serta pengujian.
