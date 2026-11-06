# SAGARA DENIM

**Manajemen Produksi Celana Jeans** — aplikasi produksi Sagara Denim.

Repositori ini berisi aplikasi Next.js dan API FastAPI tahap **M6**. Login,
guard sesi, pengelolaan **Perintah Produksi**, antrean produksi, transisi
status, production log, **Bahan & Aksesoris** dengan stok transaksional,
**Laporan Produksi** dengan filter tanggal/tahap dan export CSV, dashboard real
dari database, serta CRUD data master pelanggan, produk, dan pengguna sudah
terhubung ke backend.

## Status

- Tahap: **M6 — Dashboard real dan CRUD data master**
- Frontend M3: login/logout, guard sesi, daftar dengan filter dan pagination
  server, form multi-item, detail timeline dan log, papan antrean lima tahap,
  stepper produksi, dialog transisi dan log, serta guard item/arsip
- Frontend M4: ringkasan inventori, banner restock, daftar dan filter bahan,
  form master, detail bahan, aksi stok masuk/keluar/penyesuaian, dan riwayat
  mutasi dengan pagination
- Frontend M5: filter periode dan tahap, ringkasan output/reject/rasio/order,
  rekap harian, rekap tahap, tabel log, serta export CSV
- Frontend M6: dashboard live, halaman pelanggan, halaman produk, dan halaman
  pengguna khusus admin dengan form, reset sandi, serta aktivasi/nonaktivasi
- Backend: autentikasi JWT + refresh rotasi, data master baca, CRUD perintah
  produksi, soft delete, queue per tahap, state machine transisi, production log
  append-only, API bahan dan mutasi stok dengan saldo sebelum/sesudah, agregasi
  laporan produksi dan CSV, ringkasan dashboard, serta CRUD data master
- Peran: `admin`, `operator`, `qc`
- Progress dihitung per siklus tahap dan kembali ke 0 setelah rework
- Stok bahan hanya berubah lewat mutasi; riwayat mutasi bersifat permanen
- Laporan produksi memakai `production_logs.log_date`, mencakup order aktif,
  selesai, dibatalkan, dan terarsip
- Semua peran dapat membaca dan mengekspor laporan
- Pelanggan dan produk dapat dibaca semua peran, tetapi hanya admin yang dapat
  menulis; daftar pengguna hanya untuk admin
- Nonaktif data master memakai `is_active` tanpa hard delete
- M6 tidak menambah dependency maupun migrasi; head tetap `29e652d588ae`
- Design System tetap tersembunyi dari sidebar, tetapi rutenya tersedia untuk
  developer di balik login
- M4 menambah migrasi `44af95156808` untuk saldo mutasi stok; M5 menambah
  migrasi `29e652d588ae` untuk index `production_logs.log_date`

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
│     ├─ components/          # shell, auth, UI primitives, dashboard, orders, materials, reports, catalog, users
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
| `/` | Dashboard Produksi live dari database |
| `/perintah-produksi` | Daftar, filter, pagination, buat, ubah, arsip |
| `/perintah-produksi/[id]` | Detail, item, stepper, aksi workflow, timeline, log |
| `/antrean-produksi` | Papan kanban order aktif per tahap produksi |
| `/bahan` | Daftar bahan, ringkasan inventori, filter, form master, dan aksi stok |
| `/bahan/[id]` | Detail bahan, saldo, aksi mutasi, dan riwayat stok |
| `/pelanggan` | Daftar, filter, tambah, ubah, dan nonaktifkan pelanggan |
| `/produk` | Daftar, filter, tambah, ubah, dan nonaktifkan model produk |
| `/pengguna` | Daftar, tambah, ubah, reset sandi, dan nonaktifkan pengguna (admin) |
| `/laporan` | Laporan produksi: filter periode/tahap, rekap, log, export CSV |
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

## Endpoint backend M6

| Metode | Path | Akses |
| --- | --- | --- |
| GET | `/api/health` | Publik |
| POST | `/api/auth/login` | Publik |
| POST | `/api/auth/refresh` | Cookie refresh |
| POST | `/api/auth/logout` | Cookie refresh |
| GET | `/api/auth/me` | Sesi aktif |
| GET | `/api/dashboard` | Semua peran |
| GET | `/api/users` | Admin |
| POST | `/api/users` | Admin |
| PATCH | `/api/users/{id}` | Admin |
| POST | `/api/users/{id}/reset-password` | Admin |
| DELETE | `/api/users/{id}` | Admin (nonaktifkan) |
| GET | `/api/users/options` | Semua peran |
| GET | `/api/customers` | Semua peran |
| POST | `/api/customers` | Admin |
| GET | `/api/customers/{id}` | Semua peran |
| PATCH | `/api/customers/{id}` | Admin |
| DELETE | `/api/customers/{id}` | Admin (nonaktifkan) |
| GET | `/api/products` | Semua peran |
| POST | `/api/products` | Admin |
| GET | `/api/products/{id}` | Semua peran |
| PATCH | `/api/products/{id}` | Admin |
| DELETE | `/api/products/{id}` | Admin (nonaktifkan) |
| GET | `/api/materials` | Semua peran |
| POST | `/api/materials` | Admin |
| GET | `/api/materials/{id}` | Semua peran |
| PATCH | `/api/materials/{id}` | Admin |
| GET | `/api/materials/{id}/movements` | Semua peran |
| POST | `/api/materials/{id}/movements` | Admin, operator; penyesuaian khusus admin |
| GET | `/api/production-orders` | Semua peran |
| POST | `/api/production-orders` | Admin, operator |
| GET | `/api/production-orders/queue` | Semua peran |
| GET | `/api/production-orders/{id}` | Semua peran |
| PATCH | `/api/production-orders/{id}` | Admin, operator |
| PATCH | `/api/production-orders/{id}/status` | Sesuai state machine |
| POST | `/api/production-orders/{id}/logs` | Admin, operator, atau QC |
| DELETE | `/api/production-orders/{id}` | Admin |
| GET | `/api/reports/production` | Semua peran |
| GET | `/api/reports/production/export` | Semua peran |

Daftar pelanggan dan produk mendukung `page`, `page_size` (maksimal 100, default
10), `search`, dan `active` (`aktif` default, `nonaktif`, `semua`). Daftar
pelanggan mencari kode dan nama; daftar produk mencari kode dan nama. Detail
mengembalikan data lengkap termasuk `created_at` dan `updated_at`.

Daftar pengguna hanya dapat diakses admin dan mendukung `page`, `page_size`
(maksimal 100, default 10), `search` (nama atau email), serta `active` dengan
nilai yang sama. Endpoint ini tidak pernah mengembalikan hash kata sandi.

Daftar bahan mendukung `page`, `page_size` (maksimal 50), `search`, `category`,
`stock_status`, `low_stock`, dan `active` (`aktif`, `nonaktif`, `semua`).
Riwayat mutasi mendukung `page`, `page_size`, dan `movement_type`.

Daftar perintah produksi mendukung `page`, `page_size` (maksimal 50), `search`,
`status`, `priority`, dan `customer_id`. Pencarian mencakup kode, pelanggan,
model, dan catatan.

Endpoint queue mengembalikan lima tahap aktif (`menunggu` sampai `qc`) beserta
jumlah order, total kuantitas, dan kartu terurut prioritas lalu deadline.
Parameter yang tersedia: `search`, `priority`, dan `limit_per_stage` (1–20,
default 6).

Endpoint laporan produksi menerima `start_date` dan `end_date` berformat ISO
(inklusif), `stage` (`cutting`, `jahit`, `finishing`, atau `qc`), serta `page`
dan `page_size` (1–100, default 20) untuk daftar log. Export memakai filter yang
sama tanpa pagination dan selalu memuat seluruh baris hasil filter.

## Dashboard M6

Dashboard memakai satu endpoint `GET /api/dashboard` yang dapat dibaca semua
peran. Tanggal bisnis dan waktu pembuatan dikirim dalam zona WIB.

- **Order aktif**: order non-arsip berstatus `menunggu` sampai `qc`.
- **Order masuk hari ini**: order non-arsip dengan `created_at` pada tanggal
  bisnis WIB.
- **Output dan reject hari ini**: jumlah `output_qty`/`reject_qty` dari
  `production_logs.log_date` hari ini; order terarsip tidak dihitung. Rasio
  reject memakai `reject / (output + reject) × 100` dan dibulatkan dua desimal.
- **On-Time Delivery 30 hari**: order `selesai` non-arsip yang memiliki
  `deadline` dan `completed_at`, dengan tanggal selesai WIB berada dalam 30 hari
  kalender terakhir (termasuk hari ini). Order dihitung tepat waktu bila tanggal
  selesai WIB tidak melewati deadline. Nilainya `null` bila belum ada order
  selesai yang memenuhi syarat.
- **Output harian**: tujuh hari kalender terakhir, selalu berisi tujuh titik dan
  tanggal tanpa log diisi nol.
- **Komposisi reject**: empat tahap tetap (`cutting`, `jahit`, `finishing`,
  `qc`) dalam urutan tersebut, termasuk nilai nol.
- **Pipeline**: lima status aktif tetap (`menunggu` sampai `qc`) beserta jumlah
  order dan total kuantitas; order terarsip tidak dihitung.
- **Deadline terdekat**: maksimal lima order aktif non-arsip yang memiliki
  deadline, diurutkan deadline lalu prioritas. `is_overdue` bernilai benar bila
  deadline sudah lewat dari tanggal bisnis.
- **Stok kritis**: maksimal lima bahan aktif berstatus `habis`, `kritis`, atau
  `menipis`, diurutkan berdasarkan tingkat keparahan, persentase stok, lalu nama.

## Data master M6

- Pelanggan dan produk dapat dibaca semua peran, termasuk detail. Penulisan
  (tambah, ubah, nonaktifkan) hanya untuk admin.
- Daftar pengguna dan seluruh aksi pengguna hanya untuk admin. Endpoint
  `/api/users/options` tetap tersedia untuk semua peran sebagai pilihan PIC.
- Nonaktif memakai `is_active = false`, bukan hard delete. Data dan riwayat
  order tetap tersimpan, hilang dari filter default, dan tidak muncul di pilihan
  order baru. Admin dapat mengaktifkannya kembali.
- Kode pelanggan dan produk unik tanpa membedakan huruf besar/kecil, dirapikan
  dan diubah menjadi huruf besar. Duplikasi menghasilkan `409`.
- Field opsional yang kosong disimpan sebagai `null`. Email pelanggan dan
  pengguna divalidasi. Perubahan minimal memuat satu field dan kode/nama tidak
  boleh diubah menjadi `null`.
- Kata sandi pengguna minimal 8 karakter serta harus memuat huruf dan angka.
  Admin menetapkan kata sandi baru lewat reset; tidak ada undangan lewat email.
- Deaktivasi pengguna, perubahan peran, dan reset kata sandi mencabut seluruh
  refresh token pengguna tersebut. Admin tidak dapat menonaktifkan atau mengubah
  peran akun sendiri; reset sandi akun sendiri diizinkan dan frontend langsung
  mengeluarkan sesi.

## Laporan produksi M5

- Dasar perhitungan adalah `production_logs.log_date`, bukan tanggal input.
  Rentang tanggal bersifat inklusif dan `start_date` tidak boleh melebihi
  `end_date`.
- Ringkasan selalu dihitung dari seluruh rentang filter: total output, total
  reject, rasio reject, jumlah order unik tercatat, jumlah log, dan jumlah hari
  yang memiliki log.
- Rasio reject = `reject / (output + reject) × 100`, dikirim sebagai angka dua
  desimal dengan pembulatan `ROUND_HALF_UP`.
- Rekap harian hanya memuat tanggal yang memiliki log dan diurutkan naik. Rekap
  tahap selalu memuat empat tahap dalam urutan tetap, termasuk nilai nol.
- Daftar log diurutkan dari tanggal log terbaru, lalu waktu input terbaru.
- Order `selesai`, `dibatalkan`, dan terarsip tetap masuk laporan. Baris order
  terarsip ditandai `Diarsipkan` dan tidak menautkan ke halaman detail.
- Semua peran (`admin`, `operator`, `qc`) dapat membaca laporan dan mengekspor
  CSV; tidak ada aksi tulis pada modul laporan.

### Format CSV

- Delimiter `;`, encoding UTF-8 dengan BOM, akhir baris CRLF, dan desimal memakai
  koma agar cocok dengan Excel Indonesia.
- Nama berkas:
  `laporan-produksi-YYYY-MM-DD_YYYY-MM-DD[-stage].csv`.
- Kolom: `Tanggal Log;Kode Order;Pelanggan;Tahap;Output;Reject;Rasio Reject (%);Status Order;Order Diarsipkan;Catatan;Dicatat Oleh;Waktu Input (WIB)`.
- Nilai teks yang diawali `=`, `+`, `-`, `@`, tab, atau CR diberi awalan `'`
  untuk mencegah formula injection saat dibuka di spreadsheet.
- Export memakai cookie sesi yang sama dengan halaman; access token diperbarui
  otomatis bila kedaluwarsa.

Contoh baris:

```csv
2026-10-26;PRD-2611-019;Toko Denim Jaya;Cutting;120;0;0,00;Selesai;Tidak;Cutting panel depan.;Sinta Maharani;2026-10-26 09:15:00
```

## Stok bahan M4

Status stok dihitung dari saldo dan batas minimum:

| Status | Ambang |
| --- | --- |
| `habis` | Stok ≤ 0 |
| `kritis` | 0 < stok ≤ 50% minimum |
| `menipis` | Stok < minimum |
| `aman` | Stok ≥ minimum |

Aturan penting:

- `stock_qty` tidak pernah diubah langsung. Semua perubahan saldo berasal dari
  mutasi `masuk`, `keluar`, atau `penyesuaian`; database juga menolak saldo
  negatif.
- Stok awal saat bahan dibuat dicatat sebagai mutasi masuk “Stok awal” bila
  nilainya lebih dari nol.
- Stok masuk dan keluar memakai `quantity` lebih dari nol. Stok keluar melebihi
  saldo ditolak `422` dengan sisa stok pada pesan.
- Penyesuaian hanya untuk admin, memakai `target_stock`, dan wajib memiliki
  alasan minimal 3 karakter. Target yang sama dengan saldo saat ini ditolak
  `422`.
- Setiap mutasi menyimpan `stock_before` dan `stock_after`. Riwayat tidak dapat
  diubah atau dihapus.
- Bahan nonaktif tetap tampil dengan filter `nonaktif`/`semua`, menyimpan saldo
  dan riwayat, tetapi menolak mutasi baru (`409`). Hanya admin yang dapat
  mengaktifkannya kembali.
- SKU dan satuan terkunci setelah bahan memiliki mutasi.
- Mutasi stok keluar boleh ditautkan ke perintah produksi aktif. Tautan ini
  hanya referensi; stok tidak dipotong otomatis oleh workflow produksi.
- API menormalkan seluruh nilai Decimal menjadi dua angka desimal dan
  mengirimkannya sebagai string JSON.

## Alur produksi M3

Urutan tahap: `menunggu → cutting → jahit → finishing → qc → selesai`.
Status `dibatalkan` dapat dicapai dari tahap aktif sesuai peran.

| Dari | Ke | Peran | Syarat |
| --- | --- | --- | --- |
| `menunggu` | `cutting` | Admin, operator | — |
| `menunggu` | `dibatalkan` | Admin, operator | Alasan wajib |
| `cutting` | `jahit` | Admin, operator | Minimal satu log Cutting |
| `cutting` | `dibatalkan` | Admin | Alasan wajib |
| `jahit` | `finishing` | Admin, operator | Minimal satu log Jahit |
| `jahit` | `dibatalkan` | Admin | Alasan wajib |
| `finishing` | `qc` | Admin, operator | Minimal satu log Finishing |
| `finishing` | `dibatalkan` | Admin | Alasan wajib |
| `qc` | `selesai` | Admin, QC | Minimal satu log QC |
| `qc` | `jahit` | Admin, QC | Alasan wajib + log QC |
| `qc` | `finishing` | Admin, QC | Alasan wajib + log QC |
| `qc` | `dibatalkan` | Admin | Alasan wajib |

Aturan penting:

- Transisi memakai `expected_status`. Jika data sudah berubah, backend
  mengembalikan `409` dan frontend memuat ulang detail.
- Production log bersifat **append-only** pada M3. Satu log wajib memiliki
  output atau reject lebih dari nol, tanggal tidak boleh melewati hari ini, dan
  total output + reject tidak boleh melebihi sisa kuantitas tahap.
- Progress dihitung dari siklus tahap berjalan. Setelah rework dari QC, log lama
  tidak dihitung lagi dan progress tahap tujuan dimulai dari 0.
- Item order terkunci setelah status bukan `menunggu`. Header masih dapat
  diubah selama order aktif, tetapi order `selesai`/`dibatalkan` tidak dapat
  diubah.
- Arsip hanya tersedia untuk order terminal dan hanya untuk admin.
- QC tidak dapat mencatat log tahap produksi biasa; operator tidak dapat
  mencatat log QC atau menyelesaikan order.

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
| Buat perintah | Ya | Ya | Tidak |
| Ubah header order aktif | Ya | Ya | Tidak |
| Ubah item saat `menunggu` | Ya | Ya | Tidak |
| Transisi maju hingga QC | Ya | Ya | Tidak |
| Catat log cutting/jahit/finishing | Ya | Ya | Tidak |
| Selesaikan atau rework dari QC | Ya | Tidak | Ya |
| Batalkan saat `menunggu` | Ya | Ya | Tidak |
| Batalkan setelah produksi berjalan | Ya | Tidak | Tidak |
| Arsipkan order terminal | Ya | Tidak | Tidak |
| Lihat data master | Ya | Ya | Ya |
| Tambah/ubah/nonaktifkan pelanggan dan produk | Ya | Tidak | Tidak |
| Lihat daftar pengguna | Ya | Tidak | Tidak |
| Tambah/ubah/reset sandi/nonaktifkan pengguna | Ya | Tidak | Tidak |
| Lihat bahan dan riwayat stok | Ya | Ya | Ya |
| Tambah/ubah master bahan | Ya | Tidak | Tidak |
| Aktifkan/nonaktifkan bahan | Ya | Tidak | Tidak |
| Catat stok masuk/keluar | Ya | Ya | Tidak |
| Penyesuaian stok | Ya | Tidak | Tidak |
| Lihat dan export laporan produksi | Ya | Ya | Ya |

Arsip memakai soft delete (`deleted_at`). Hanya order `selesai` atau
`dibatalkan` yang dapat diarsipkan. Perintah yang diarsipkan hilang dari daftar
dan detail, tetapi kode serta riwayatnya tetap tersimpan di database.

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

## Pengujian

Backend (dari `backend/`, dengan database uji `sagara_denim_test`):

```bash
.\.venv\Scripts\python.exe -m ruff check .
.\.venv\Scripts\python.exe -m pytest -q
```

Frontend (dari `frontend/`):

```bash
npm run typecheck
npm run lint
npm run build
```

Status M6: **121 tes backend lulus**, `ruff check .` bersih, serta typecheck,
lint, dan build frontend lulus. Cakupan utama: regresi seluruh M3–M5, ringkasan
dashboard (KPI, batas WIB, output tujuh hari, reject per tahap, pipeline,
deadline, stok kritis, dan On-Time Delivery), CRUD pelanggan/produk dengan
filter status, pencarian, pagination, validasi kode unik dan soft deactivate,
serta CRUD pengguna dengan kebijakan kata sandi, proteksi akun sendiri, dan
pencabutan refresh token.

## Rencana berikutnya

Tahap M6 selesai. Rencana tahap berikutnya belum ditetapkan.

## Lisensi

Internal Sagara Denim.
