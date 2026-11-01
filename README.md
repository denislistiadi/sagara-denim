# SAGARA DENIM

**Manajemen Produksi Celana Jeans** — fondasi aplikasi produksi Sagara Denim.

Repositori ini berisi design system frontend dan fondasi backend tahap **M1**.
Antarmuka masih memakai data mock; backend sudah memiliki database, seed, dan
autentikasi backend-only. Integrasi UI ke API dilakukan pada M2.

## Status

- Tahap: **backend foundation (M1)**
- Frontend: Next.js dengan data mock di `frontend/src/lib/mock-data.ts`
- Backend: FastAPI + PostgreSQL, migrasi, seed, dan autentikasi
- Auth: JWT akses, refresh token rotasi, cookie httpOnly, peran `admin`,
  `operator`, `qc`
- Belum ada: login UI, CRUD perintah produksi, integrasi dashboard
- Halaman Antrean Produksi, Bahan & Aksesoris, dan Laporan masih placeholder

## Teknologi

| Bagian | Pilihan |
| --- | --- |
| Frontend | Next.js 16.4 App Router |
| UI | React 19.3, TypeScript |
| Styling | Tailwind CSS v4 + CSS variables |
| Primitif | Radix UI |
| Ikon | Material Design Icons (`@mdi/js`) |
| Font | Plus Jakarta Sans (`next/font`) |
| Chart | SVG/CSS kustom, tanpa library chart |
| Backend | FastAPI, Python 3.12+ |
| Database | PostgreSQL 17+, SQLAlchemy 2 async, Alembic |
| Auth | Argon2id, JWT akses, refresh token opak |
| Pengujian | pytest, httpx |

## Struktur

```text
sagara-denim/
├─ frontend/                  # aplikasi Next.js
│  └─ src/
│     ├─ app/                 # rute App Router
│     ├─ components/          # shell, UI primitives, dashboard, order
│     ├─ lib/                 # data mock, navigasi, API client
│     ├─ styles/              # token & stylesheet per area
│     └─ types/               # tipe domain
├─ backend/                   # API FastAPI
│  ├─ app/                    # config, model, schema, service, route
│  ├─ alembic/                # migrasi database
│  └─ tests/                  # pengujian backend
├─ docker-compose.yml         # PostgreSQL + backend
└─ .env.example
```

## Menjalankan

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/macOS
pip install -e ".[dev]"
copy .env.example .env          # Windows
# cp .env.example .env          # Linux/macOS
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

- API: <http://localhost:8000>
- Dokumentasi: <http://localhost:8000/docs>
- Health: <http://localhost:8000/api/health>

Panduan lengkap backend, akun demo, dan alur auth ada di
[`backend/README.md`](backend/README.md).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Request `/api/*` diteruskan
ke FastAPI melalui rewrite Next.js (`API_PROXY_URL`).

### Docker Compose

```bash
docker compose up -d db
docker compose run --rm backend alembic upgrade head
docker compose run --rm backend python -m app.seed
docker compose up backend
```

Database Compose terekspos di `localhost:5433`.

| Script frontend | Fungsi |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build produksi |
| `npm run start` | Menjalankan hasil build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript tanpa emit |

> Catatan mesin: paket native `@next/swc-win32-x64-msvc` pernah terunduh terpotong.
> Jika Turbopack gagal dengan pesan "not a valid Win32 application", jalankan
> `npm cache clean --force` lalu `npm install` ulang di `frontend/`.

## Rute frontend

| Rute | Isi |
| --- | --- |
| `/` | Dashboard Produksi (mock) |
| `/order-produksi` | Order Produksi (mock, akan menjadi Perintah Produksi) |
| `/antrean-produksi` | Placeholder |
| `/bahan` | Placeholder |
| `/laporan` | Placeholder |
| `/design-system` | Ringkasan design system (khusus developer) |
| `/design-system/fondasi` | Warna, tipografi, spacing, radius, shadow, ikon |
| `/design-system/komponen` | Galeri komponen dan state |
| `/design-system/pola` | Pola shell, header, toolbar, dialog, state |

Menu Design System disembunyikan dari sidebar melalui `SHOW_DEV_NAV` di
`frontend/src/components/layout/sidebar.tsx`, tetapi rutenya tetap dapat diakses
langsung oleh developer.

## Endpoint backend M1

| Metode | Path | Akses |
| --- | --- | --- |
| GET | `/api/health` | Publik |
| POST | `/api/auth/login` | Publik |
| POST | `/api/auth/refresh` | Cookie refresh |
| POST | `/api/auth/logout` | Cookie refresh |
| GET | `/api/auth/me` | Sesi aktif |
| GET | `/api/users` | Admin |

## Fondasi visual

- Aksen utama: `#FF5B00` (gradient `#FF6A14 → #FF5B00`)
- Sidebar: `#16181D`, lebar 240px / rail 72px
- Header: 60px, border `#E5E7EB`
- Kanvas: `#F8F9FA`, surface `#FFFFFF`
- Teks: `#111827` / muted `#6B7280` / subtle `#9CA3AF`
- Radius: kartu 18px, section 14px, tombol 14px, nav 10px
- Font: Plus Jakarta Sans (400–800)
- Spacing utama: kelipatan 4px; padding konten 24px desktop, 16px tablet

Semua nilai di atas tersedia sebagai CSS variable di
`frontend/src/styles/tokens.css` dan didokumentasikan di halaman Fondasi.

## Rencana berikutnya

1. **M2** — login UI dan guard, copy “Perintah Produksi”, CRUD header + item
   dengan pelanggan opsional, pagination dan filter server.
2. **M3** — Antrean Produksi, aksi tahap, production log, timeline.
3. **M4** — Bahan & Aksesoris, stok transaksional, low-stock.
4. **M5** — Laporan dengan filter tanggal dan export CSV.
5. **M6** — Dashboard real dari database.

## Lisensi

Internal Sagara Denim.
