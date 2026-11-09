# Security Policy

## Versi yang didukung

Perbaikan keamanan diterapkan pada commit terbaru di branch `main`. Rilis lama
tidak dijamin menerima backport.

## Melaporkan kerentanan

Jangan membuka issue publik, diskusi, atau pull request untuk kerentanan yang
belum diperbaiki.

Gunakan **GitHub private vulnerability reporting** pada tab **Security** di
repositori ini. Kan alur ini tersedia melalui tombol **Report a vulnerability**
dan hanya dapat dilihat oleh pemilik repositori.

Jika tombol tersebut belum aktif, hubungi pemilik repositori melalui profil
GitHub-nya. Jangan mengirim detail kerentanan melalui issue publik.

## Cakupan

Laporan yang relevan mencakup, antara lain:

- autentikasi, manajemen sesi, dan otorisasi peran;
- kebocoran data melalui API, laporan, atau export CSV;
- injeksi, cross-site scripting, dan cross-site request forgery;
- kelemahan pada konfigurasi cookie, CORS, atau header keamanan;
- kebocoran secret atau kredensial;
- dependency dengan kerentanan yang berdampak pada aplikasi;
- konfigurasi deployment, observability, atau backup yang melemahkan batas
  keamanan.

## Kontrol keamanan saat ini

### Aplikasi

- Kata sandi disimpan sebagai hash Argon2id. Access token JWT berumur pendek
  berada di cookie `httpOnly`; refresh token opak dirotasi dan disimpan sebagai
  hash. Pemakaian ulang refresh token mencabut seluruh sesi pengguna.
- Otorisasi diperiksa per peran (`admin`, `operator`, `qc`) dan per aksi.
- Cookie produksi memakai `Secure` dan `SameSite=Lax`. Request yang mengubah
  state ditolak jika header `Origin` tidak dikenal.
- Caddy menambahkan HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, dan `Permissions-Policy`. API menambahkan header yang sama
  serta CSP `default-src 'none'`.
- Login dibatasi per email (default 5 kegagalan/15 menit) dan per IP (default
  20 kegagalan/15 menit) dengan blokir 15 menit, delay progresif, respons
  generik, dan `Retry-After`. Kunci rate limit disimpan sebagai HMAC, bukan
  email/IP mentah. Script `unlock_login.py` tersedia untuk membuka blokir sah.
- `/docs`, `/redoc`, dan `/openapi.json` dimatikan di produksi. `/api/metrics`
  dilindungi bearer token dan diblokir Caddy dari akses publik.
- Profil produksi menolak start jika `JWT_SECRET` default/lemah,
  `METRICS_TOKEN` kosong, `PUBLIC_ORIGIN` kosong, `COOKIE_SECURE=false`, atau
  `CORS_ORIGINS` berisi origin. Script seed menolak berjalan di produksi.

### Infrastruktur

- Hanya Caddy yang mengekspos port publik. Backend, frontend, database, dan
  Prometheus berada di jaringan internal; database tidak memiliki port host.
  Grafana hanya mendengarkan `127.0.0.1:3001`.
- Database memakai tiga role: `sagara_owner` untuk migrasi, `sagara_app` untuk
  DML runtime, dan `sagara_backup` untuk baca. Runtime tidak memiliki hak DDL.
- Secret disuntikkan saat runtime dari `deploy/.env.production` dengan permission
  `600` atau `400`, tidak pernah masuk image atau repositori.
  `deploy/check_env.sh` menolak placeholder, secret lemah, dan path backup
  relatif sebelum deploy.
- Dump backup memakai mode `600`, checksum SHA-256 wajib diverifikasi sebelum
  restore, dan `restore_db.sh` menolak target non-staging kecuali flag darurat
  `RESTORE_ALLOW_NON_STAGING=1` diberikan secara eksplisit. Direktori backup
  tidak dapat dibaca user biasa.
- Log ditulis sebagai JSON dengan `request_id`; label metrik memakai route
  template dan tidak memuat email, user ID, atau query string.

### Supply chain

- CI menjalankan `pip-audit` dan `npm audit --omit=dev --audit-level=high`.
- Image backend dan frontend dibangun multi-stage, berjalan sebagai non-root,
  tanpa `pip`/`npm` di runtime, dan dipindai Trivy pada severity `HIGH` dan
  `CRITICAL` dengan `ignore-unfixed`. Gate yang sama berlaku untuk image rilis.
- Rilis `v*` dipublikasikan ke GHCR dengan SBOM dan provenance. Action GitHub
  dipin ke commit SHA.
- CI memvalidasi Compose dan Caddyfile serta menjalankan drill backup/restore.

## Batas yang diketahui

- Backup masih lokal di VPS. Selama data pilot, kehilangan VPS berarti
  kehilangan data; backup off-host menjadi gate wajib sebelum data produksi
  nyata.
- Tidak ada audit keamanan eksternal, bug bounty, atau jaminan SLA.
- Postur ini dirancang untuk satu VPS dan jumlah pengguna internal yang
  terbatas, bukan multi-tenant atau skala horizontal.

## Proses

- Kami berupaya mengonfirmasi laporan dalam 3 hari kerja.
- Kami akan menilai dampak, menyiapkan perbaikan, dan memberi tahu pelapor saat
  perbaikan tersedia.
- Mohon beri waktu yang wajar sebelum publikasi detail teknis.
- Saat ini tidak ada program bug bounty atau imbalan finansial.
