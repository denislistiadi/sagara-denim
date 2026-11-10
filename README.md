# SAGARA DENIM

[![CI](https://github.com/denislistiadi/sagara-denim/actions/workflows/ci.yml/badge.svg)](https://github.com/denislistiadi/sagara-denim/actions/workflows/ci.yml)

**Manajemen Produksi Celana Jeans** — aplikasi internal Sagara Denim untuk
mengelola perintah produksi, antrean per tahap, stok bahan dan aksesoris,
laporan produksi, serta data master pelanggan, produk, dan pengguna.

Repositori ini berisi frontend Next.js dan API FastAPI yang terhubung ke
PostgreSQL. Sesi memakai cookie `httpOnly`, dan akses dibatasi untuk peran
`admin`, `operator`, serta `qc`.

Untuk produksi, seluruh stack dijalankan dengan Docker Compose di satu VPS
Linux di belakang Caddy. Hanya Caddy yang mengekspos port publik; backend,
frontend, database, dan Prometheus berada di jaringan internal.

**Status:** source-available, bukan open source. Lihat [lisensi](#lisensi).

## Cakupan

| Modul | Rute | Akses | Kemampuan |
| --- | --- | --- | --- |
| Dashboard | `/` | Semua peran | KPI produksi, output tujuh hari, reject per tahap, pipeline, deadline, stok kritis, akses cepat |
| Perintah Produksi | `/perintah-produksi` | Semua peran; tulis admin/operator | Daftar/filter, form multi-item, detail, timeline, log, transisi, arsip, tautan ke laporan perintah |
| Antrean Produksi | `/antrean-produksi` | Semua peran | Papan lima tahap dengan pencarian dan filter prioritas |
| Bahan & Aksesoris | `/bahan` | Semua peran; master admin, mutasi admin/operator | Inventori, status stok, master bahan, mutasi masuk/keluar/penyesuaian, riwayat |
| Laporan Produksi | `/laporan` | Semua peran | Filter periode/tahap/perintah, rekap harian/tahap, log, export CSV |
| Pelanggan | `/pelanggan` | Semua peran; tulis admin | CRUD data master dengan nonaktivasi |
| Produk | `/produk` | Semua peran; tulis admin | CRUD model produk dengan nonaktivasi |
| Pengguna | `/pengguna` | Admin | Manajemen akun, peran, reset sandi, nonaktivasi |
| Design System | `/design-system` | Developer | Dokumentasi token dan komponen untuk developer |

Semua rute selain `/login` berada di balik autentikasi. Detail rute dan
perilaku UI ada di [`frontend/README.md`](frontend/README.md).

## Arsitektur

```text
Browser
  │  cookie httpOnly (akses + refresh)
  ▼
Next.js 16 App Router
  │  rewrite /api/* → API_PROXY_URL
  ▼
FastAPI /api
  │  SQLAlchemy 2 async + asyncpg
  ▼
PostgreSQL 17
```

Frontend, backend, dan database dapat dijalankan terpisah saat pengembangan.
Docker Compose menyediakan database dan API; frontend tetap dijalankan dengan
npm. Export CSV memakai cookie sesi yang sama dan jalur refresh otomatis.

Di produksi, Caddy menjadi satu-satunya edge publik:

```text
Browser
  │ HTTPS (cookie httpOnly)
  ▼
Caddy (TLS, header keamanan, access log JSON)
  ├─ /api/*  → FastAPI :8000
  └─ /*      → Next.js standalone :3000
                    │
                    ▼
              PostgreSQL 17
```

Prometheus men-scrape metrik backend dari jaringan internal; Grafana hanya
mendengarkan `127.0.0.1:3001`. Detail keputusan dan batas keamanan ada di
[`docs/architecture.md`](docs/architecture.md).

## Teknologi

| Bagian | Pilihan |
| --- | --- |
| Frontend | Next.js 16.4 App Router, React 19.3, TypeScript |
| UI | Tailwind CSS v4, Radix UI, Material Design Icons |
| Backend | FastAPI, Python 3.12+, Pydantic v2 |
| Database | PostgreSQL 17+, SQLAlchemy 2 async, Alembic |
| Autentikasi | Argon2id, JWT akses, refresh token opak dengan rotasi |
| Observability | JSON log, request ID, Prometheus, Grafana, node-exporter |
| Deployment | Docker Compose, Caddy, GHCR, Trivy, SBOM/provenance |
| Pengujian | pytest, pytest-asyncio, httpx; Vitest + Testing Library; typecheck, lint, build frontend; Playwright E2E |

## Struktur repositori

```text
sagara-denim/
├─ .github/workflows/         # CI, gate image/backup, rilis GHCR
├─ deploy/                    # Compose produksi, Caddy, observability, bootstrap DB
├─ docs/                      # arsitektur dan runbook operasional
├─ frontend/                  # aplikasi Next.js
│  ├─ e2e/                    # E2E Playwright: produksi, inventori, QC
│  └─ src/
│     ├─ app/                 # rute App Router dan route group (app)
│     ├─ components/          # shell, auth, UI, dashboard, order, bahan, laporan, katalog, pengguna
│     ├─ lib/                 # API client, workflow, label, navigasi, format
│     ├─ styles/              # token dan stylesheet per area
│     └─ types/               # tipe domain
├─ backend/                   # API FastAPI
│  ├─ app/                    # config, model, schema, service, route
│  ├─ alembic/                # migrasi database
│  ├─ scripts/                # backup, restore, verifikasi, unlock login
│  └─ tests/                  # pengujian backend
├─ docker-compose.yml         # PostgreSQL + backend untuk pengembangan
├─ ROADMAP.md                 # status dan prioritas berikutnya
└─ README.md
```

## Mulai cepat

Prasyarat:

- Python 3.12+ dan PostgreSQL 17+ untuk menjalankan backend tanpa Docker.
- Node.js 20.9+ dan npm untuk frontend.
- Docker Compose opsional untuk database dan API.

### Opsi 1 — Docker Compose (database + API)

Dari root repositori:

```powershell
Copy-Item .env.example .env
docker compose up -d db
docker compose run --rm backend alembic upgrade head
docker compose run --rm backend python -m app.seed
docker compose up backend
```

- API: <http://localhost:8000>
- Swagger: <http://localhost:8000/docs>
- Health: <http://localhost:8000/api/health/ready>
- Metrik (tanpa token di luar produksi): <http://localhost:8000/api/metrics>
- PostgreSQL dari host: `localhost:5433` (di dalam Compose: `db:5432`)

`.env` root dipakai Compose untuk `JWT_SECRET`; nilai contoh hanya untuk
pengembangan. Frontend tetap dijalankan terpisah dengan npm.

### Opsi 2 — Lokal tanpa Docker

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

Linux/macOS:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

Pembuatan role dan database PostgreSQL dijelaskan di
[`backend/README.md`](backend/README.md#menjalankan-lokal).

### Frontend

Dari terminal terpisah:

```powershell
cd frontend
npm install
npm run dev
```

Buka <http://localhost:3000>. Request `/api/*` diteruskan ke FastAPI melalui
rewrite Next.js. Jika API tidak berjalan di `http://localhost:8000`, atur
`API_PROXY_URL` di `frontend/.env.local`.

### Akun demo

Seed membuat akun untuk ketiga peran. Kredensial dan cara menggantinya ada di
[`backend/README.md`](backend/README.md#akun-demo).

Seluruh pelanggan, produk, bahan, dan perintah produksi pada seed bersifat
fiktif. Seed hanya untuk pengembangan dan pengujian; script menolak berjalan
saat `ENVIRONMENT=production`.

### Cara pakai singkat

1. Buka <http://localhost:3000/login>, lalu masuk memakai akun demo sesuai
   peran.
2. Dashboard menampilkan KPI, output tujuh hari, reject per tahap, pipeline,
   deadline, dan stok kritis.
3. Buat perintah produksi di `/perintah-produksi`, lalu proses melalui antrean
   lima tahap di `/antrean-produksi`. Operator mencatat log tahap produksi;
   QC menyelesaikan atau mengembalikan order dari tahap QC.
4. Pantau stok dan riwayat mutasi di `/bahan`, lalu lihat atau export laporan
   produksi di `/laporan`.
5. Admin mengelola pelanggan, produk, dan pengguna di `/pelanggan`, `/produk`,
   serta `/pengguna`.

Hak akses tiap rute dirangkum pada tabel [Cakupan](#cakupan). Aturan workflow,
validasi, dan perhitungan stok ada di
[`backend/README.md`](backend/README.md#aturan-domain); detail layar dan alur UI
ada di [`frontend/README.md`](frontend/README.md).

## Konfigurasi

| File | Kegunaan |
| --- | --- |
| `.env` (root) | `JWT_SECRET` untuk Compose pengembangan; opsional |
| `backend/.env` | Seluruh konfigurasi backend; salin dari `backend/.env.example` |
| `frontend/.env.local` | `API_PROXY_URL` dan opsional `NEXT_PUBLIC_API_URL` |
| `deploy/.env.production` | Domain, image GHCR, secret, database, backup, dan Grafana |
| `deploy/.env.local` | Staging lokal dari backup produksi |

Nilai penting:

- `DATABASE_URL` dan `TEST_DATABASE_URL` menunjuk ke PostgreSQL.
- `JWT_SECRET` wajib diganti dengan nilai acak minimal 32 karakter sebelum
  produksi.
- `METRICS_TOKEN` wajib diisi di produksi; `/api/metrics` menolak request tanpa
  bearer token dan Caddy memblokirnya dari publik.
- `COOKIE_SECURE=true` dan HTTPS wajib dipakai di produksi.
- `CORS_ORIGINS` kosong di produksi karena browser memakai satu origin.
- `PUBLIC_ORIGIN` wajib berisi origin HTTPS tunggal.
- `BACKUP_HOST_DIR` dan `BACKUP_METRICS_HOST_DIR` wajib berupa path absolut di
  VPS, misalnya `/opt/sagara-backups` dan `/opt/sagara-backups/metrics`.
- `API_PROXY_URL` dibaca server Next.js untuk rewrite `/api`;
  `NEXT_PUBLIC_API_URL` dikosongkan agar request tetap same-origin dan cookie
  dapat dipakai.

Rujukan lengkap: [konfigurasi backend](backend/README.md#konfigurasi) dan
[konfigurasi frontend](frontend/README.md#konfigurasi).

## Deployment produksi

Rilis dibuat dari tag `v*`:

```bash
git tag -a v1.2.3 -m "Rilis 1.2.3"
git push origin v1.2.3
```

Workflow [`release.yml`](.github/workflows/release.yml) membangun image backend
dan frontend `linux/amd64`, memindainya dengan Trivy, lalu mendorong ke GHCR
dengan tag semver, `sha-<commit>`, dan `latest` untuk tag non-prerelease. SBOM
dan provenance melekat pada image. Deploy tetap manual dan memakai digest:

```bash
cp deploy/.env.production.example deploy/.env.production
chmod 600 deploy/.env.production
./deploy/check_env.sh deploy/.env.production

export COMPOSE="docker compose --env-file deploy/.env.production -f deploy/compose.prod.yml"
$COMPOSE --profile ops pull
$COMPOSE up -d db
$COMPOSE --profile ops run --rm migrate
$COMPOSE up -d backend frontend caddy
$COMPOSE --profile monitoring up -d prometheus grafana node-exporter
```

Urutan rilis, rollback, backup, restore, dan observability dijelaskan di
[`docs/operations.md`](docs/operations.md).

## Dokumentasi

| Dokumen | Isi |
| --- | --- |
| [`backend/README.md`](backend/README.md) | Kontrak API, aturan bisnis, autentikasi, peran, data model, migrasi, dan operasional |
| [`frontend/README.md`](frontend/README.md) | Rute, arsitektur UI, API client, alur layar, guard, design system, dan build |
| [`docs/architecture.md`](docs/architecture.md) | Keputusan arsitektur, jaringan, keamanan, observability, dan siklus data |
| [`docs/operations.md`](docs/operations.md) | Runbook deploy, rilis, rollback, backup, restore, dan insiden |
| [`ROADMAP.md`](ROADMAP.md) | Status aplikasi, prioritas berikutnya, dan kriteria rilis produksi |
| [`SECURITY.md`](SECURITY.md) | Kebijakan pelaporan dan kontrol keamanan yang diterapkan |
| [`LICENSE`](LICENSE) | Lisensi proprietary source-available |
| <http://localhost:8000/docs> | Swagger UI dari OpenAPI |
| <http://localhost:8000/redoc> | ReDoc dari OpenAPI |

## Pengujian

Backend, dari `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m pip_audit
```

Frontend, dari `frontend/`:

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm audit --omit=dev --audit-level=high
```

E2E, dari `frontend/` dengan backend berjalan dan database sudah di-seed:

```powershell
npx playwright install chromium
npm run test:e2e
```

Playwright menjalankan dev server Next.js sendiri dan menguji tiga alur:
produksi (order, log, transisi, laporan, export CSV), inventori (bahan baru,
stok masuk/keluar, saldo, riwayat), dan QC read-only (navigasi, daftar order,
detail, serta bahan tanpa aksi tulis). Kredensial default memakai akun seed dan
dapat diganti melalui `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_QC_EMAIL`,
dan `E2E_QC_PASSWORD`.

Baseline verifikasi saat README ini diperbarui: 185 tes backend lulus, 97 tes
frontend (13 file) lulus, `ruff check .` bersih, typecheck/lint/build frontend
lulus, dan tiga alur E2E lulus. Workflow
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) menjalankan backend,
frontend, E2E, build/scan image, serta drill backup/restore pada setiap push ke
`main` dan pull request. Cakupan dan detail pengujian ada di
[`backend/README.md`](backend/README.md#pengujian) dan
[`frontend/README.md`](frontend/README.md#verifikasi).

## Keamanan dan produksi

Checklist minimum sebelum deploy:

- Gunakan `deploy/.env.production` dengan permission `600`; jangan pernah
  commit secret.
- Jalankan `./deploy/check_env.sh`; script menolak placeholder, secret lemah,
  path backup relatif, dan origin non-HTTPS.
- Set `ENVIRONMENT=production`; aplikasi menolak `JWT_SECRET` default,
  `METRICS_TOKEN` kosong, `PUBLIC_ORIGIN` kosong, `COOKIE_SECURE=false`, atau
  `CORS_ORIGINS` tidak kosong.
- Jangan menjalankan seed demo di produksi.
- Deploy image immutable dari GHCR dengan digest, bukan `latest`.
- Jalankan migrasi one-shot sebagai `sagara_owner`; runtime memakai
  `sagara_app`.
- Pastikan `/api/metrics` diblokir publik dan Grafana hanya `127.0.0.1`.
- Jadwalkan backup harian, verifikasi checksum, dan jalankan drill restore.
- Aktifkan uptime monitor eksternal ke `/api/health/ready`.

Detail kontrol, batas, dan pelaporan ada di [`SECURITY.md`](SECURITY.md).
Runbook operasional ada di [`docs/operations.md`](docs/operations.md).

## Troubleshooting

| Gejala | Tindakan |
| --- | --- |
| Backend gagal terhubung ke database | Pastikan PostgreSQL berjalan. Compose memakai port host `5433`, sedangkan setup lokal default `5432`. |
| Database uji tidak ditemukan | Buat `sagara_denim_test` atau jalankan `backend/docker/init-test-db.sql` melalui Compose. |
| Login berhasil tetapi sesi langsung hilang | Periksa `COOKIE_SECURE`, `COOKIE_SAMESITE`, `CORS_ORIGINS`, dan `API_PROXY_URL`. Jangan memakai `COOKIE_SECURE=true` di atas HTTP. |
| Frontend menampilkan error koneksi API | Pastikan API berjalan dan `API_PROXY_URL` menunjuk ke alamat yang benar, lalu restart dev server. |
| Turbopack gagal di Windows dengan "not a valid Win32 application" | Jalankan `npm cache clean --force`, lalu `npm install` ulang di `frontend/`. |

Troubleshooting khusus backend dan frontend tersedia di masing-masing README.

## Lisensi

Proyek ini **source-available, bukan open source**. Copyright (c) 2026 Sagara
Denim. Seluruh hak dilindungi.

Kode boleh dilihat, dikloning, dan dijalankan secara lokal hanya untuk
evaluasi. Penggunaan produksi, penggunaan komersial, modifikasi, dan
redistribusi memerlukan izin tertulis dari Sagara Denim. Nama dan logo Sagara
Denim tidak dilisensikan untuk penggunaan pihak lain.

Kontribusi eksternal tidak diterima tanpa perjanjian tertulis. Teks lengkap ada
di [`LICENSE`](LICENSE).
