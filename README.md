# SAGARA DENIM

**Manajemen Produksi Celana Jeans** — design system dan pratinjau antarmuka.

Repositori ini berisi fondasi visual Sagara Denim: token, app shell, komponen dasar,
pola halaman, serta dua halaman pratinjau (Dashboard Produksi dan Order Produksi).
Tahap ini sengaja belum terhubung ke backend; seluruh data masih statis.

## Status

- Tahap: **design system**
- Data: mock lokal di `frontend/src/lib/mock-data.ts`
- Interaksi: state React lokal (buat/hapus order hilang setelah refresh)
- Belum ada: API, database, autentikasi, CRUD persisten
- Halaman Antrean Produksi, Bahan & Aksesoris, dan Laporan masih placeholder

## Teknologi

| Bagian | Pilihan |
| --- | --- |
| Framework | Next.js 16.4 App Router |
| UI | React 19.3, TypeScript |
| Styling | Tailwind CSS v4 + CSS variables |
| Primitif | Radix UI |
| Varian | class-variance-authority, clsx, tailwind-merge |
| Ikon | Material Design Icons (`@mdi/js`) |
| Font | Plus Jakarta Sans (`next/font`) |
| Chart | SVG/CSS kustom, tanpa library chart |

## Struktur

```text
sagara-denim/
├─ frontend/                  # aplikasi Next.js
│  └─ src/
│     ├─ app/                 # rute App Router
│     ├─ components/          # shell, UI primitives, dashboard, order
│     ├─ lib/                 # data mock, navigasi, format, token
│     ├─ styles/              # token & stylesheet per area
│     └─ types/               # tipe domain
├─ backend/                   # placeholder FastAPI (rencana)
└─ .env.example
```

## Menjalankan

```bash
cd frontend
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build produksi |
| `npm run start` | Menjalankan hasil build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript tanpa emit |

> Catatan mesin: paket native `@next/swc-win32-x64-msvc` pernah terunduh terpotong.
> Jika Turbopack gagal dengan pesan "not a valid Win32 application", jalankan
> `npm cache clean --force` lalu `npm install` ulang di `frontend/`.

## Rute

| Rute | Isi |
| --- | --- |
| `/` | Dashboard Produksi |
| `/order-produksi` | Order Produksi (tabel, filter, dialog, toast) |
| `/antrean-produksi` | Placeholder |
| `/bahan` | Placeholder |
| `/laporan` | Placeholder |
| `/design-system` | Ringkasan design system |
| `/design-system/fondasi` | Warna, tipografi, spacing, radius, shadow, ikon |
| `/design-system/komponen` | Galeri komponen dan state |
| `/design-system/pola` | Pola shell, header, toolbar, dialog, state |

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

1. Backend FastAPI + PostgreSQL di `backend/`.
2. Skema order, tahap produksi, bahan, dan pengguna.
3. CRUD persisten, pagination server, dan filter.
4. Autentikasi serta peran (admin produksi, operator, QC).
5. Halaman Antrean Produksi, Bahan & Aksesoris, dan Laporan.
6. API client dengan state loading, error, dan retry.

## Lisensi

Internal Sagara Denim.
