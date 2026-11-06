# SAGARA DENIM

**Manajemen Produksi Celana Jeans** — aplikasi internal Sagara Denim untuk
mengelola perintah produksi, antrean per tahap, stok bahan dan aksesoris,
laporan produksi, serta data master pelanggan, produk, dan pengguna.

Repositori ini berisi frontend Next.js dan API FastAPI yang terhubung ke
PostgreSQL. Sesi memakai cookie `httpOnly`, dan akses dibatasi untuk peran
`admin`, `operator`, serta `qc`.

## Cakupan

| Modul | Rute | Akses | Kemampuan |
| --- | --- | --- | --- |
| Dashboard | `/` | Semua peran | KPI produksi, output tujuh hari, reject per tahap, pipeline, deadline, stok kritis |
| Perintah Produksi | `/perintah-produksi` | Semua peran; tulis admin/operator | Daftar/filter, form multi-item, detail, timeline, log, transisi, arsip |
| Antrean Produksi | `/antrean-produksi` | Semua peran | Papan lima tahap dengan pencarian dan filter prioritas |
| Bahan & Aksesoris | `/bahan` | Semua peran; master admin, mutasi admin/operator | Inventori, status stok, master bahan, mutasi masuk/keluar/penyesuaian, riwayat |
| Laporan Produksi | `/laporan` | Semua peran | Filter periode/tahap, rekap harian/tahap, log, export CSV |
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

## Teknologi

| Bagian | Pilihan |
| --- | --- |
| Frontend | Next.js 16.4 App Router, React 19.3, TypeScript |
| UI | Tailwind CSS v4, Radix UI, Material Design Icons |
| Backend | FastAPI, Python 3.12+, Pydantic v2 |
| Database | PostgreSQL 17+, SQLAlchemy 2 async, Alembic |
| Autentikasi | Argon2id, JWT akses, refresh token opak dengan rotasi |
| Pengujian | pytest, pytest-asyncio, httpx; typecheck, lint, build frontend |

## Struktur repositori

```text
sagara-denim/
├─ frontend/                  # aplikasi Next.js
│  └─ src/
│     ├─ app/                 # rute App Router dan route group (app)
│     ├─ components/          # shell, auth, UI, dashboard, order, bahan, laporan, katalog, pengguna
│     ├─ lib/                 # API client, workflow, label, navigasi, format
│     ├─ styles/              # token dan stylesheet per area
│     └─ types/               # tipe domain
├─ backend/                   # API FastAPI
│  ├─ app/                    # config, model, schema, service, route
│  ├─ alembic/                # migrasi database
│  └─ tests/                  # pengujian backend
├─ docker-compose.yml         # PostgreSQL + backend
├─ .env.example               # referensi env Compose dan frontend
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
- Health: <http://localhost:8000/api/health>
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
source .venv/bin/activate
cp .env.example .env
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

## Konfigurasi

| File | Kegunaan |
| --- | --- |
| `.env` (root) | `JWT_SECRET` untuk Compose; opsional saat pengembangan |
| `backend/.env` | Seluruh konfigurasi backend; salin dari `backend/.env.example` |
| `frontend/.env.local` | `API_PROXY_URL` dan opsional `NEXT_PUBLIC_API_URL` |

Nilai penting:

- `DATABASE_URL` dan `TEST_DATABASE_URL` menunjuk ke PostgreSQL.
- `JWT_SECRET` wajib diganti dengan nilai acak minimal 32 karakter sebelum produksi.
- `COOKIE_SECURE=true` dan HTTPS wajib dipakai di produksi.
- `CORS_ORIGINS` harus dibatasi ke origin aplikasi.
- `API_PROXY_URL` dibaca server Next.js untuk rewrite `/api`; `NEXT_PUBLIC_API_URL`
  dikosongkan agar request tetap same-origin dan cookie dapat dipakai.

Rujukan lengkap: [konfigurasi backend](backend/README.md#konfigurasi) dan
[konfigurasi frontend](frontend/README.md#konfigurasi).

## Dokumentasi

| Dokumen | Isi |
| --- | --- |
| [`backend/README.md`](backend/README.md) | Kontrak API, aturan bisnis, autentikasi, peran, data model, migrasi, dan operasional |
| [`frontend/README.md`](frontend/README.md) | Rute, arsitektur UI, API client, alur layar, guard, design system, dan build |
| <http://localhost:8000/docs> | Swagger UI dari OpenAPI |
| <http://localhost:8000/redoc> | ReDoc dari OpenAPI |

## Pengujian

Backend, dari `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check .
```

Frontend, dari `frontend/`:

```powershell
npm run typecheck
npm run lint
npm run build
```

Baseline verifikasi saat README ini diperbarui: 121 tes backend lulus,
`ruff check .` bersih, serta typecheck, lint, dan build frontend lulus.
Cakupan dan detail pengujian ada di
[`backend/README.md`](backend/README.md#pengujian) dan
[`frontend/README.md`](frontend/README.md#verifikasi).

## Keamanan dan produksi

Checklist minimum sebelum deploy:

- Ganti `JWT_SECRET` dengan nilai acak minimal 32 karakter.
- Jalankan aplikasi di belakang HTTPS dan set `COOKIE_SECURE=true`.
- Batasi `CORS_ORIGINS` ke domain frontend yang dipakai.
- Jangan memakai kredensial seed demo di produksi.
- Jalankan `alembic upgrade head` sebagai bagian dari proses deploy.
- Build frontend dengan `API_PROXY_URL` yang benar dan pertahankan cookie
  same-origin bila memungkinkan.
- Batasi akses `/docs`, `/redoc`, dan `/openapi.json` bila tidak diperlukan.

Detail hardening dan operasional ada di
[`backend/README.md`](backend/README.md#operasional-produksi).

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

Internal Sagara Denim.
