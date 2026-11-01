# SAGARA DENIM

**Manajemen Produksi Celana Jeans** — aplikasi produksi Sagara Denim.

Repositori ini berisi aplikasi Next.js dan API FastAPI tahap **M2**. Login,
guard sesi, dan pengelolaan **Perintah Produksi** sudah terhubung ke backend.
Dashboard, antrean produksi, bahan, dan laporan masih memakai data contoh atau
placeholder.

## Status

- Tahap: **M2 — autentikasi dan Perintah Produksi**
- Frontend: login/logout, guard sesi, daftar dengan filter dan pagination
  server, form multi-item, detail timeline dan log, arsip khusus admin
- Backend: autentikasi JWT + refresh rotasi, data master baca, CRUD perintah
  produksi, soft delete
- Peran: `admin`, `operator`, `qc`
- Belum ada: transisi status, stok transaksional, laporan, dashboard real, dan
  CRUD data master
- Halaman Antrean Produksi, Bahan & Aksesoris, dan Laporan masih placeholder
- Design System tetap tersembunyi dari sidebar, tetapi rutenya tersedia untuk
  developer di balik login

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
| Auth | Argon2id, JWT akses, refresh token rotasi |
| Pengujian | pytest, httpx |

## Struktur

```text
sagara-denim/
├─ frontend/                  # aplikasi Next.js
│  └─ src/
│     ├─ app/                 # rute App Router dan route group (app)
│     ├─ components/          # shell, auth, UI primitives, dashboard, orders
│     ├─ lib/                 # API client, label, navigasi, format
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
ke FastAPI melalui rewrite Next.js (`API_PROXY_URL`). Login memakai akun demo
yang dijelaskan di [`backend/README.md`](backend/README.md).

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
| `/login` | Halaman masuk; satu-satunya rute publik |
| `/` | Dashboard Produksi (data contoh) |
| `/perintah-produksi` | Daftar, filter, pagination, buat, ubah, arsip |
| `/perintah-produksi/[id]` | Detail, item, timeline status, log produksi |
| `/antrean-produksi` | Placeholder |
| `/bahan` | Placeholder |
| `/laporan` | Placeholder |
| `/design-system` | Ringkasan design system (khusus developer) |
| `/design-system/fondasi` | Warna, tipografi, spacing, radius, shadow, ikon |
| `/design-system/komponen` | Galeri komponen dan state |
| `/design-system/pola` | Pola shell, header, toolbar, dialog, state |

Rute lama `/order-produksi` dan turunannya dialihkan permanen ke
`/perintah-produksi` melalui `frontend/next.config.ts`.

Rute aplikasi yang dilindungi berada di route group `(app)` dan dijaga
`AuthGate`. Menu Design System disembunyikan dari sidebar melalui `SHOW_DEV_NAV`
di `frontend/src/components/layout/sidebar.tsx`, tetapi rutenya tetap dapat
diakses langsung oleh developer setelah login.

## Endpoint backend M2

| Metode | Path | Akses |
| --- | --- | --- |
| GET | `/api/health` | Publik |
| POST | `/api/auth/login` | Publik |
| POST | `/api/auth/refresh` | Cookie refresh |
| POST | `/api/auth/logout` | Cookie refresh |
| GET | `/api/auth/me` | Sesi aktif |
| GET | `/api/users` | Admin |
| GET | `/api/users/options` | Semua peran |
| GET | `/api/customers` | Semua peran |
| GET | `/api/products` | Semua peran |
| GET | `/api/production-orders` | Semua peran |
| POST | `/api/production-orders` | Admin, operator |
| GET | `/api/production-orders/{id}` | Semua peran |
| PATCH | `/api/production-orders/{id}` | Admin, operator |
| DELETE | `/api/production-orders/{id}` | Admin |

Daftar perintah produksi mendukung `page`, `page_size` (maksimal 50), `search`,
`status`, `priority`, dan `customer_id`. Pencarian mencakup kode, pelanggan,
model, dan catatan.

## Autentikasi dan peran

- Access token JWT berlaku 15 menit; refresh token opak berlaku 7 hari.
- Keduanya disimpan sebagai cookie `httpOnly`; JavaScript tidak pernah membaca
  atau menyimpan token.
  - `sagara_access` berlaku untuk path `/`.
  - `sagara_refresh` dibatasi ke path `/api/auth`.
- Refresh memutar token. Pemakaian ulang token yang sudah dicabut mencabut
  seluruh sesi pengguna.
- Klien API memperbarui access token secara transparan satu kali, memakai
  single-flight `navigator.locks`, dan menyinkronkan sesi antar-tab melalui
  `BroadcastChannel`.
- `AuthGate` adalah guard UX di sisi klien. API tetap menjadi batas keamanan
  sebenarnya.

| Aksi | Admin | Operator | QC |
| --- | --- | --- | --- |
| Lihat perintah produksi | Ya | Ya | Ya |
| Buat dan ubah perintah | Ya | Ya | Tidak |
| Arsipkan perintah | Ya | Tidak | Tidak |
| Lihat data master | Ya | Ya | Ya |

Arsip memakai soft delete (`deleted_at`). Perintah yang diarsipkan hilang dari
daftar dan detail, tetapi kode serta riwayatnya tetap tersimpan di database.

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

1. **M3** — Antrean Produksi, transisi status, production log, dan timeline
   interaktif.
2. **M4** — Bahan & Aksesoris, stok transaksional, dan peringatan stok rendah.
3. **M5** — Laporan dengan filter tanggal dan export CSV.
4. **M6** — Dashboard real dari database dan master data CRUD.

## Lisensi

Internal Sagara Denim.
