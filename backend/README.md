# Backend Sagara Denim

API manajemen produksi Sagara Denim berbasis FastAPI. Backend menangani
autentikasi, dashboard, data master pelanggan/produk/pengguna, perintah
produksi beserta workflow dan production log, inventori bahan dengan mutasi
stok, serta laporan produksi dan export CSV.

Dokumen ini adalah sumber kebenaran untuk kontrak API, aturan bisnis, peran,
konfigurasi, dan data model. Panduan menjalankan seluruh aplikasi ada di
[`../README.md`](../README.md), sedangkan dokumentasi UI ada di
[`../frontend/README.md`](../frontend/README.md).

## Teknologi

| Bagian | Pilihan |
| --- | --- |
| Framework | FastAPI |
| Database | PostgreSQL 17+ |
| ORM | SQLAlchemy 2 async |
| Driver | asyncpg |
| Migrasi | Alembic |
| Validasi | Pydantic v2 |
| Kata sandi | Argon2id (`argon2-cffi`) |
| Token | JWT akses + refresh token opak |
| Pengujian | pytest, pytest-asyncio, httpx |

## Struktur

```text
backend/
├─ app/
│  ├─ main.py               # entrypoint FastAPI
│  ├─ config.py             # pengaturan dari env
│  ├─ db.py                 # engine dan sesi async
│  ├─ seed.py               # seed data idempoten
│  ├─ api/
│  │  ├─ deps.py            # dependency sesi, auth, dan peran
│  │  └─ routes/            # health, auth, dashboard, users, customers,
│  │                        # products, orders, materials, reports
│  ├─ core/                 # keamanan dan cookie
│  ├─ models/               # model SQLAlchemy
│  ├─ schemas/              # skema Pydantic
│  └─ services/             # autentikasi, dashboard, katalog, pengguna,
│                           # order, workflow, material, metrik, laporan
├─ alembic/                 # migrasi database
├─ tests/                   # pengujian
├─ Dockerfile
├─ pyproject.toml
└─ .env.example
```

## Menjalankan lokal

Prasyarat: Python 3.12+ dan PostgreSQL 17+ yang berjalan di `localhost:5432`.
Image Docker memakai Python 3.13.

1. Siapkan role dan database (sekali saja). Jalankan sebagai superuser
   PostgreSQL:

   ```sql
   CREATE ROLE sagara LOGIN PASSWORD 'sagara';
   CREATE DATABASE sagara_denim OWNER sagara;
   CREATE DATABASE sagara_denim_test OWNER sagara;
   ```

2. Siapkan virtualenv dan dependency:

   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -e ".[dev]"
   ```

   Linux/macOS:

   ```bash
   source .venv/bin/activate
   ```

3. Salin konfigurasi:

   ```powershell
   Copy-Item .env.example .env
   ```

   Linux/macOS: `cp .env.example .env`.

4. Jalankan migrasi dan seed:

   ```powershell
   alembic upgrade head
   python -m app.seed
   ```

5. Jalankan API:

   ```powershell
   uvicorn app.main:app --reload
   ```

   - API: <http://localhost:8000>
   - Swagger: <http://localhost:8000/docs>
   - ReDoc: <http://localhost:8000/redoc>
   - Health: <http://localhost:8000/api/health>

Seed bersifat idempoten; menjalankannya berulang tidak membuat duplikat. Data
contoh mencakup 3 pengguna, 4 pelanggan, 5 model produk, 5 bahan, dan 8 perintah
produksi, termasuk contoh multi-item, selesai, dan dibatalkan. Seluruh data
contoh bersifat fiktif. Seed menolak berjalan saat `ENVIRONMENT=production`.
Bahan `MTL-DNM-12` sengaja berada di bawah minimum untuk memicu peringatan
restock.

### Docker Compose

Untuk menjalankan database dan API lewat Compose, ikuti
[Mulai cepat](../README.md#mulai-cepat). Di dalam jaringan Compose API memakai
`db:5432`, sedangkan database terekspos ke host di `localhost:5433` agar tidak
bentrok dengan PostgreSQL lokal di `5432`.

## Akun demo

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Admin | `admin@sagara.co.id` | `Admin#2026` |
| Operator | `operator@sagara.co.id` | `Operator#2026` |
| QC | `qc@sagara.co.id` | `QC#2026` |

Nilai ini dapat diubah melalui variabel `SEED_*` sebelum menjalankan seed.
Jangan memakai kredensial demo di produksi.

## Konfigurasi

Semua pengaturan dibaca dari `.env` atau variabel lingkungan melalui
`app/config.py`. Salin `backend/.env.example` menjadi `backend/.env` untuk
pengembangan lokal.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `APP_NAME` | `Sagara Denim API` | Nama aplikasi pada OpenAPI |
| `ENVIRONMENT` | `development` | `development`, `test`, atau `production` |
| `API_PREFIX` | `/api` | Prefix seluruh endpoint |
| `DATABASE_URL` | `postgresql+asyncpg://sagara:sagara@localhost:5432/sagara_denim` | Koneksi database utama |
| `TEST_DATABASE_URL` | `postgresql+asyncpg://sagara:sagara@localhost:5432/sagara_denim_test` | Database pengujian |
| `JWT_SECRET` | Nilai contoh tidak aman | Ganti dengan nilai acak minimal 32 karakter |
| `JWT_ALGORITHM` | `HS256` | Algoritma JWT |
| `JWT_ISSUER` | `sagara-denim` | Klaim `iss` |
| `JWT_AUDIENCE` | `sagara-denim-web` | Klaim `aud` |
| `ACCESS_TOKEN_MINUTES` | `15` | Umur access token |
| `REFRESH_TOKEN_DAYS` | `7` | Umur refresh token |
| `COOKIE_SECURE` | `false` | Wajib `true` di produksi dengan HTTPS |
| `COOKIE_SAMESITE` | `lax` | `lax`, `strict`, atau `none` |
| `ACCESS_COOKIE_NAME` | `sagara_access` | Nama cookie access token |
| `REFRESH_COOKIE_NAME` | `sagara_refresh` | Nama cookie refresh token |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Origin frontend yang diizinkan |
| `SEED_ADMIN_EMAIL` | `admin@sagara.co.id` | Email admin seed |
| `SEED_ADMIN_PASSWORD` | `Admin#2026` | Kata sandi admin seed |
| `SEED_OPERATOR_EMAIL` | `operator@sagara.co.id` | Email operator seed |
| `SEED_OPERATOR_PASSWORD` | `Operator#2026` | Kata sandi operator seed |
| `SEED_QC_EMAIL` | `qc@sagara.co.id` | Email QC seed |
| `SEED_QC_PASSWORD` | `QC#2026` | Kata sandi QC seed |

`TEST_DATABASE_URL` hanya dipakai oleh pengujian, sedangkan `SEED_*` hanya
dipakai oleh `python -m app.seed`. Jika `COOKIE_SAMESITE=none`, browser
mewajibkan `COOKIE_SECURE=true`.

Saat `ENVIRONMENT=production`, aplikasi menolak `JWT_SECRET` default atau
kurang dari 32 karakter. Script seed juga menolak berjalan pada lingkungan
produksi agar kredensial demo tidak pernah masuk ke database produksi.

## Database dan migrasi

Perintah umum, dijalankan dari `backend/`:

```powershell
alembic upgrade head
alembic revision --autogenerate -m "deskripsi perubahan"
alembic downgrade -1
```

Head migrasi saat ini adalah `29e652d588ae`. Migrasi penting:

| Revisi | Perubahan |
| --- | --- |
| `44af95156808` | Kolom nullable `stock_before` dan `stock_after` pada `stock_movements` |
| `29e652d588ae` | Index `ix_production_logs_log_date` pada `production_logs.log_date` |

Dashboard dan CRUD data master memakai tabel yang sudah ada. Baris mutasi lama
tetap valid dengan saldo `null`, sedangkan mutasi baru selalu mengisi kedua
kolom saldo.

## API

Semua endpoint memakai prefix `/api` dan mengirim JSON. Dokumentasi interaktif
tersedia di `/docs` dan `/redoc`; skema OpenAPI di `/openapi.json`.

### Konvensi

- Autentikasi memakai cookie sesi `httpOnly`. Header
  `Authorization: Bearer <access_token>` juga diterima untuk alat bantu.
- Respons daftar memakai `page`, `page_size`, `total`, dan `total_pages`.
- Error mengikuti bentuk `{"detail": ...}`.
  - `401`: sesi tidak ada atau access token kedaluwarsa.
  - `403`: peran tidak berwenang.
  - `404`: resource tidak ditemukan.
  - `409`: konflik data, duplikasi kode, status basi, atau resource terkunci.
  - `422`: validasi payload atau aturan bisnis seperti stok tidak cukup.
- Tanggal memakai format ISO. Tanggal bisnis dan waktu laporan memakai zona WIB.
- Nilai `Decimal` dinormalkan ke dua angka desimal dan dikirim sebagai string.

### Sistem dan autentikasi

| Metode | Path | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/health` | Publik | Status API dan database |
| POST | `/api/auth/login` | Publik | Masuk dan memasang cookie sesi |
| POST | `/api/auth/refresh` | Cookie refresh | Memutar refresh token |
| POST | `/api/auth/logout` | Cookie refresh | Mencabut sesi dan menghapus cookie |
| GET | `/api/auth/me` | Sesi aktif | Profil pengguna aktif |

### Dashboard

| Metode | Path | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/dashboard` | Semua peran | Ringkasan dashboard produksi |

### Pengguna

| Metode | Path | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/users` | Admin | Daftar pengguna dengan filter |
| POST | `/api/users` | Admin | Tambah pengguna |
| PATCH | `/api/users/{user_id}` | Admin | Ubah data, peran, atau status |
| POST | `/api/users/{user_id}/reset-password` | Admin | Tetapkan kata sandi baru |
| DELETE | `/api/users/{user_id}` | Admin | Nonaktifkan pengguna |
| GET | `/api/users/options` | Semua peran | Pilihan PIC aktif |

### Pelanggan

| Metode | Path | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/customers` | Semua peran | Daftar pelanggan dengan filter |
| POST | `/api/customers` | Admin | Tambah pelanggan |
| GET | `/api/customers/{customer_id}` | Semua peran | Detail pelanggan |
| PATCH | `/api/customers/{customer_id}` | Admin | Ubah pelanggan |
| DELETE | `/api/customers/{customer_id}` | Admin | Nonaktifkan pelanggan |

### Produk

| Metode | Path | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/products` | Semua peran | Daftar model produk dengan filter |
| POST | `/api/products` | Admin | Tambah model produk |
| GET | `/api/products/{product_id}` | Semua peran | Detail model produk |
| PATCH | `/api/products/{product_id}` | Admin | Ubah model produk |
| DELETE | `/api/products/{product_id}` | Admin | Nonaktifkan model produk |

### Bahan dan aksesoris

| Metode | Path | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/materials` | Semua peran | Daftar bahan dan ringkasan inventori |
| POST | `/api/materials` | Admin | Tambah bahan dan stok awal |
| GET | `/api/materials/{material_id}` | Semua peran | Detail bahan |
| PATCH | `/api/materials/{material_id}` | Admin | Ubah master atau status aktif |
| GET | `/api/materials/{material_id}/movements` | Semua peran | Riwayat mutasi stok |
| POST | `/api/materials/{material_id}/movements` | Admin, operator | Catat mutasi; penyesuaian khusus admin |

### Perintah produksi

| Metode | Path | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/production-orders` | Semua peran | Daftar dengan filter |
| POST | `/api/production-orders` | Admin, operator | Buat perintah |
| GET | `/api/production-orders/queue` | Semua peran | Antrean per tahap |
| GET | `/api/production-orders/{order_id}` | Semua peran | Detail perintah |
| PATCH | `/api/production-orders/{order_id}` | Admin, operator | Ubah header atau item |
| PATCH | `/api/production-orders/{order_id}/status` | Sesuai state machine | Transisi status |
| POST | `/api/production-orders/{order_id}/logs` | Admin, operator, atau QC | Catat production log |
| DELETE | `/api/production-orders/{order_id}` | Admin | Arsipkan perintah terminal |

### Laporan

| Metode | Path | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/reports/production` | Semua peran | Ringkasan dan daftar log laporan |
| GET | `/api/reports/production/export` | Semua peran | Unduh CSV seluruh hasil filter |

### Filter data master

`GET /api/customers`, `GET /api/products`, dan `GET /api/users` menerima:

| Parameter | Keterangan |
| --- | --- |
| `page` | Halaman, minimal 1, default 1 |
| `page_size` | Ukuran halaman 1–100, default 10 |
| `search` | Kode/nama pelanggan atau produk; nama/email pengguna |
| `active` | `aktif` (default), `nonaktif`, atau `semua` |

Daftar pelanggan dan produk dapat dibaca semua peran; daftar pengguna hanya
untuk admin. `DELETE` pada ketiga resource berarti nonaktifkan
(`is_active = false`), bersifat idempoten, dan bukan hard delete.

### Filter bahan

`GET /api/materials` menerima:

| Parameter | Keterangan |
| --- | --- |
| `page` | Halaman, minimal 1 |
| `page_size` | Ukuran halaman 1–50, default 10 |
| `search` | SKU, nama, atau kategori |
| `category` | Nama kategori persis |
| `stock_status` | `habis`, `kritis`, `menipis`, atau `aman` |
| `low_stock` | `true` untuk semua status selain `aman` |
| `active` | `aktif` (default), `nonaktif`, atau `semua` |

Response selalu memuat `summary` global dari seluruh bahan aktif:
`total_active`, `out_of_stock`, `below_minimum`, dan daftar `categories`.
Ringkasan tidak berubah saat filter daftar dipakai.

`GET /api/materials/{material_id}/movements` menerima `page`, `page_size` (1–50), dan
`movement_type` (`masuk`, `keluar`, `penyesuaian`). Riwayat selalu diurutkan
dari yang terbaru.

### Filter perintah produksi

`GET /api/production-orders` menerima:

| Parameter | Keterangan |
| --- | --- |
| `page` | Halaman, minimal 1 |
| `page_size` | Ukuran halaman 1–50, default 10 |
| `search` | Kode, pelanggan, model, atau catatan |
| `status` | `menunggu`, `cutting`, `jahit`, `finishing`, `qc`, `selesai`, `dibatalkan` |
| `priority` | `tinggi`, `normal`, `rendah` |
| `customer_id` | UUID pelanggan |

`GET /api/production-orders/queue` menerima `search`, `priority`, dan
`limit_per_stage` (1–20, default 6). Response selalu memuat lima tahap aktif:
`menunggu`, `cutting`, `jahit`, `finishing`, dan `qc`. Setiap tahap berisi
`order_count`, `total_quantity`, dan daftar kartu terurut prioritas lalu
deadline. Order `selesai`, `dibatalkan`, dan terarsip tidak ditampilkan.

### Filter laporan

`GET /api/reports/production` menerima:

| Parameter | Keterangan |
| --- | --- |
| `start_date` | Tanggal awal ISO, wajib dan inklusif |
| `end_date` | Tanggal akhir ISO, wajib dan inklusif |
| `stage` | `cutting`, `jahit`, `finishing`, atau `qc`; opsional |
| `order_id` | UUID perintah produksi; opsional, membatasi laporan ke satu order |
| `page` | Halaman log, minimal 1, default 1 |
| `page_size` | Ukuran halaman log 1–100, default 20 |

`GET /api/reports/production/export` menerima filter yang sama tanpa `page` dan
`page_size`, lalu mengembalikan seluruh baris hasil filter. Rentang tanggal
terbalik menghasilkan `422` dengan pesan
`Tanggal awal tidak boleh melebihi tanggal akhir.`

## Aturan domain

### Workflow produksi

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

Aturan transisi:

- Payload wajib memuat `expected_status` dan `to_status`.
- Jika status di database berbeda dari `expected_status`, response `409`.
- Transisi maju mewajibkan minimal satu log pada siklus tahap berjalan.
- Transisi dari status terminal (`selesai`, `dibatalkan`) selalu ditolak.
- Order terarsip tidak dapat ditransisikan atau diberi log.
- Row-level lock dipakai saat transisi dan pencatatan log.

Aturan production log:

- Log hanya dapat dicatat pada `cutting`, `jahit`, `finishing`, atau `qc`.
- Peran log mengikuti tahap: admin/operator untuk tiga tahap produksi,
  admin/QC untuk tahap QC.
- `output_qty + reject_qty` harus lebih dari nol dan tidak boleh melebihi sisa
  kuantitas siklus tahap saat ini.
- `log_date` tidak boleh melewati hari ini (zona WIB).
- Log bersifat append-only; tidak ada endpoint ubah atau hapus.
- Setelah rework dari QC, siklus tahap baru dimulai sehingga log lama pada tahap
  tujuan tidak dihitung untuk progress.

### Penulisan perintah produksi

- Pelanggan, PIC, dan deadline bersifat opsional.
- Satu perintah wajib memiliki minimal satu item model.
- Model produk tidak boleh duplikat dalam satu perintah.
- Total quantity dihitung dari seluruh item.
- Membuat perintah menambahkan entri timeline awal berstatus `menunggu`.
- Perubahan item mengganti seluruh daftar item dalam satu transaksi dan hanya
  diizinkan saat status `menunggu`.
- Header order aktif masih dapat diubah. Order `selesai`/`dibatalkan` terkunci.
- Kode perintah memakai format `PRD-YYMM-NNN` berdasarkan waktu WIB dan
  dilindungi advisory lock PostgreSQL agar tetap unik saat bersamaan.
- Arsip memakai soft delete (`deleted_at`). Hanya order `selesai` atau
  `dibatalkan` yang dapat diarsipkan, dan hanya oleh admin. Order terarsip
  hilang dari daftar dan detail, tetapi baris, kode, dan riwayatnya tetap
  tersimpan. Kode yang sudah diarsipkan tidak dipakai ulang.

### Stok bahan

Status stok dihitung dari saldo dan batas minimum:

| Status | Ambang |
| --- | --- |
| `habis` | Stok ≤ 0 |
| `kritis` | 0 < stok ≤ 50% minimum |
| `menipis` | Stok < minimum |
| `aman` | Stok ≥ minimum |

Aturan stok:

- `stock_qty` tidak dapat diubah lewat endpoint master. Perubahan hanya lewat
  mutasi, dengan constraint database `stock_qty >= 0`.
- Stok awal pada `POST /api/materials` dicatat sebagai mutasi `masuk` dengan
  catatan `Stok awal` bila lebih dari nol.
- `masuk` dan `keluar` memakai `quantity > 0`; stok keluar melebihi saldo
  ditolak `422` beserta sisa stok.
- `penyesuaian` memakai `target_stock >= 0`, wajib alasan minimal 3 karakter,
  dan hanya untuk admin.
- Penyesuaian yang tidak mengubah saldo ditolak `422`. Batas saldo yang
  didukung adalah `9.999.999.999,99`.
- Setiap mutasi baru mencatat `stock_before` dan `stock_after`; baris lama dapat
  bernilai `null`.
- Riwayat mutasi bersifat append-only. Tidak ada endpoint ubah atau hapus.
- Bahan nonaktif menolak mutasi dengan `409`, tetapi saldo dan riwayatnya tetap
  tersimpan. Hanya admin yang dapat mengaktifkannya kembali.
- SKU dan satuan tidak dapat diubah setelah bahan memiliki mutasi (`409`).
- `production_order_id` opsional dan hanya boleh untuk mutasi `keluar`.
  Perintah harus ada dan belum diarsipkan. Tautan ini tidak memotong stok
  otomatis.
- Mutasi memakai row-level lock `SELECT ... FOR UPDATE` agar saldo tetap
  konsisten saat request bersamaan.
- Semua Decimal dinormalkan ke dua angka desimal dan diserialkan sebagai string.

### Laporan produksi

- Dasar perhitungan adalah `production_logs.log_date`, bukan tanggal input.
  Rentang tanggal inklusif dan `start_date` tidak boleh melebihi `end_date`.
- Filter `order_id` membatasi seluruh bagian laporan (ringkasan, rekap harian,
  rekap tahap, daftar log, dan CSV) ke satu perintah produksi. Nilai yang tidak
  ada tidak menghasilkan error; laporan menjadi kosong.
- Ringkasan dihitung dari seluruh rentang filter: total output, total reject,
  rasio reject, jumlah order unik tercatat, jumlah log, dan jumlah hari yang
  memiliki log.
- Rasio reject = `reject / (output + reject) × 100`, dikirim sebagai angka dua
  desimal dengan pembulatan `ROUND_HALF_UP`.
- Rekap harian hanya memuat tanggal yang memiliki log dan diurutkan naik.
  Rekap tahap selalu memuat empat tahap dalam urutan tetap, termasuk nilai nol.
- Daftar log diurutkan dari tanggal log terbaru, lalu `created_at` terbaru.
- Order aktif, selesai, dibatalkan, dan terarsip tetap masuk laporan. Baris
  order terarsip diberi `order_archived: true` dan `Order Diarsipkan: Ya` pada
  CSV.
- Semua peran dapat membaca laporan dan mengekspor CSV; tidak ada aksi tulis.

Format CSV:

- Delimiter `;`, UTF-8 dengan BOM, akhir baris CRLF, dan desimal memakai koma.
- Nama berkas:
  `laporan-produksi-YYYY-MM-DD_YYYY-MM-DD[-stage].csv`.
- Kolom:
  `Tanggal Log;Kode Order;Pelanggan;Tahap;Output;Reject;Rasio Reject (%);Status Order;Order Diarsipkan;Catatan;Dicatat Oleh;Waktu Input (WIB)`.
- Nilai teks yang diawali `=`, `+`, `-`, `@`, tab, atau CR diberi awalan `'`
  untuk mencegah formula injection. Kutip dan baris baru di-escape sesuai
  aturan CSV.
- `Waktu Input (WIB)` memakai format `YYYY-MM-DD HH:MM:SS` zona WIB.

Contoh baris:

```csv
2026-10-26;PRD-2611-019;Toko Denim Jaya;Cutting;120;0;0,00;Selesai;Tidak;Cutting panel depan.;Sinta Maharani;2026-10-26 09:15:00
```

### Dashboard

`GET /api/dashboard` tidak menerima parameter dan mengembalikan:

| Bagian | Isi |
| --- | --- |
| `kpis` | Order aktif, order masuk hari ini, output/reject hari ini, rasio reject, dan On-Time Delivery 30 hari |
| `daily_output` | Tujuh tanggal terakhir, termasuk tanggal tanpa log bernilai nol |
| `reject_breakdown` | Reject empat tahap tetap: `cutting`, `jahit`, `finishing`, `qc` |
| `pipeline` | Lima status aktif (`menunggu`–`qc`) dengan jumlah order dan kuantitas |
| `upcoming_deadlines` | Maksimal lima deadline order aktif terdekat |
| `critical_stock` | Maksimal lima bahan aktif di bawah batas aman |

Definisi perhitungan:

- **Order aktif**: order non-arsip berstatus `menunggu` sampai `qc`.
- **Order masuk hari ini**: order non-arsip dengan `created_at` pada tanggal
  bisnis WIB.
- **Output dan reject hari ini**: jumlah `output_qty`/`reject_qty` dari
  `production_logs.log_date` hari ini; order terarsip tidak dihitung. Rasio
  reject memakai rumus laporan dan bernilai `0.0` bila belum ada output/reject.
- **On-Time Delivery 30 hari**: order `selesai` non-arsip yang memiliki
  `deadline` dan `completed_at`, dengan tanggal selesai WIB dalam 30 hari
  kalender terakhir (termasuk hari ini). Order tepat waktu bila tanggal selesai
  WIB tidak melewati deadline. Nilainya `null` bila belum ada order selesai
  yang memenuhi syarat.
- **Output harian**: tujuh hari kalender terakhir, selalu berisi tujuh titik.
- **Komposisi reject**: empat tahap tetap dalam urutan `cutting`, `jahit`,
  `finishing`, `qc`, termasuk nilai nol.
- **Pipeline**: lima status aktif tetap (`menunggu` sampai `qc`) beserta jumlah
  order dan total kuantitas; order terarsip tidak dihitung.
- **Deadline terdekat**: maksimal lima order aktif non-arsip yang memiliki
  deadline, diurutkan deadline lalu prioritas. `is_overdue` bernilai benar bila
  deadline sudah lewat dari tanggal bisnis.
- **Stok kritis**: maksimal lima bahan aktif berstatus `habis`, `kritis`, atau
  `menipis`, diurutkan berdasarkan tingkat keparahan, persentase stok, lalu nama.

### Data master dan pengguna

- Pelanggan dan produk dapat dibaca semua peran, termasuk detail. Penulisan
  (tambah, ubah, nonaktifkan) hanya untuk admin.
- Daftar pengguna dan seluruh aksi pengguna hanya untuk admin. Endpoint
  `/api/users/options` tetap tersedia untuk semua peran sebagai pilihan PIC.
- Nonaktif memakai `is_active = false`, bukan hard delete. Data dan riwayat
  order tetap tersimpan, hilang dari filter default, dan tidak muncul di pilihan
  order baru. Admin dapat mengaktifkannya kembali.
- Kode pelanggan dan produk unik tanpa membedakan huruf besar/kecil, dirapikan,
  dan diubah menjadi huruf besar. Duplikasi menghasilkan `409`.
- Field opsional yang kosong disimpan sebagai `null`. Email pelanggan dan
  pengguna divalidasi. Perubahan minimal memuat satu field dan kode/nama tidak
  boleh diubah menjadi `null`.
- Kata sandi pengguna minimal 8 karakter serta harus memuat huruf dan angka.
  Admin menetapkan kata sandi baru lewat reset; tidak ada undangan lewat email.
- Deaktivasi pengguna, perubahan peran, dan reset kata sandi mencabut seluruh
  refresh token pengguna tersebut. Admin tidak dapat menonaktifkan atau mengubah
  peran akun sendiri; reset sandi akun sendiri diizinkan.
- Endpoint pengguna tidak pernah mengembalikan hash kata sandi.

## Autentikasi dan peran

### Token dan cookie

- Login menghasilkan access token JWT (15 menit) dan refresh token opak
  (7 hari).
- Keduanya dikirim sebagai cookie `httpOnly`, `SameSite=Lax`.
  - `sagara_access` berlaku untuk seluruh path `/`.
  - `sagara_refresh` dibatasi ke path `/api/auth`.
- Refresh token disimpan sebagai hash SHA-256 di tabel `refresh_tokens`.
- Setiap refresh mencabut token lama dan menerbitkan token baru (rotasi).
- Pemakaian ulang token yang sudah dicabut dianggap indikasi pencurian sesi dan
  mencabut seluruh sesi aktif pengguna tersebut.
- Logout mencabut refresh token dan menghapus kedua cookie.
- Endpoint juga menerima header `Authorization: Bearer <access_token>` untuk
  kebutuhan alat bantu dan pengujian.

### Matriks peran

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

Frontend melakukan guard untuk pengalaman pengguna, tetapi API tetap menjadi
batas otorisasi sebenarnya berdasarkan cookie sesi dan peran.

## Pengujian

Pastikan database uji `sagara_denim_test` sudah ada, lalu dari `backend/`
jalankan:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check .
```

Cakupan pengujian utama:

- **Autentikasi dan otorisasi**: login, cookie `httpOnly`, refresh rotation,
  deteksi pemakaian ulang token, logout, `/me`, dan pembatasan peran.
- **Perintah produksi dan workflow**: pembuatan multi-item, validasi item,
  pagination/filter, queue lima tahap, transisi dan `expected_status`, log per
  tahap, rework, pembatalan, progress per siklus, serta arsip soft delete.
- **Bahan dan stok**: filter dan ringkasan inventori, status stok, stok awal,
  normalisasi/duplikasi SKU, penguncian SKU/satuan, matriks peran mutasi, saldo
  sebelum/sesudah, stok tidak cukup, penyesuaian, dan riwayat mutasi.
- **Laporan dan CSV**: ringkasan, rasio reject, batas tanggal inklusif, filter
  tahap, filter perintah, urutan rekap, pagination log, order terarsip, format
  CSV, BOM, delimiter, CRLF, escape, dan sanitasi formula.
- **Dashboard**: KPI, batas hari WIB, output tujuh hari, reject per tahap,
  pipeline, deadline, stok kritis, dan On-Time Delivery 30 hari.
- **Data master dan pengguna**: CRUD pelanggan/produk, filter status, pencarian,
  pagination, normalisasi kode, duplikasi case-insensitive, kebijakan kata
  sandi, proteksi akun sendiri, dan pencabutan refresh token.

Saat ini 130 tes backend lulus, `ruff check .` bersih, dan `pip-audit` tidak
menemukan kerentanan. Workflow
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) menjalankan `ruff`,
`pytest`, dan `pip-audit` pada setiap push ke `main` serta pull request, bersama
pemeriksaan frontend dan smoke test E2E.

## Model data

| Tabel | Isi |
| --- | --- |
| `users` | Akun, peran, dan status aktif |
| `refresh_tokens` | Hash refresh token, masa berlaku, pencabutan |
| `customers` | Pelanggan; opsional pada perintah produksi |
| `products` | Model, ukuran, dan warna |
| `production_orders` | Header perintah produksi (SPK) + `deleted_at` |
| `production_order_items` | Model dan jumlah per item |
| `order_status_history` | Audit perubahan status |
| `production_logs` | Output dan reject per tahap |
| `materials` | Stok bahan dan batas minimum |
| `stock_movements` | Mutasi stok masuk, keluar, penyesuaian + saldo sebelum/sesudah |

Satu perintah produksi dapat berisi beberapa model. Pelanggan, PIC, dan deadline
bersifat opsional agar produksi untuk stok internal tetap dapat dicatat.
Riwayat status dan production log bersifat append-only.

## Operasional produksi

Checklist sebelum deploy:

1. Set `ENVIRONMENT=production`.
2. Ganti `JWT_SECRET` dengan nilai acak minimal 32 karakter.
3. Jalankan di belakang HTTPS dan set `COOKIE_SECURE=true`.
4. Batasi `CORS_ORIGINS` ke origin frontend yang sebenarnya.
5. Jangan menjalankan seed demo atau memakai kredensial contoh.
6. Jalankan `alembic upgrade head` sebelum aplikasi menerima trafik.
7. Batasi akses `/docs`, `/redoc`, dan `/openapi.json` bila tidak diperlukan.
8. Arahkan health check ke `/api/health`.
9. Siapkan process manager atau reverse proxy, backup database, dan pemantauan
   log di level operasional.

Jika frontend dan API berada pada origin berbeda, pastikan CORS mengizinkan
origin tersebut, cookie memakai atribut yang sesuai, dan `COOKIE_SAMESITE`
dipilih dengan benar. Konfigurasi same-origin melalui rewrite Next.js lebih
sederhana dan direkomendasikan.

## Troubleshooting

| Gejala | Penyebab umum | Tindakan |
| --- | --- | --- |
| `password authentication failed` | Role/password atau `DATABASE_URL` salah | Periksa role PostgreSQL dan URL koneksi |
| `database "sagara_denim_test" does not exist` | Database uji belum dibuat | Buat database uji atau jalankan init-test-db melalui Compose |
| Alembic menolak migrasi | Database belum berada di revisi yang diharapkan | Jalankan `alembic upgrade head` dan periksa revisi aktif |
| Login berhasil tetapi cookie tidak terkirim | `COOKIE_SECURE` aktif di HTTP atau origin/CORS salah | Sesuaikan `COOKIE_SECURE`, `COOKIE_SAMESITE`, dan `CORS_ORIGINS` |
| Transisi mengembalikan `409` | `expected_status` sudah basi | Muat ulang detail order lalu ulangi aksi |
| Mutasi stok mengembalikan `422` | Saldo tidak cukup, target tidak berubah, atau payload tidak valid | Periksa saldo, target, dan alasan penyesuaian |

## Tautan

- [README utama](../README.md)
- [README frontend](../frontend/README.md)
- [Roadmap](../ROADMAP.md)
- [Security policy](../SECURITY.md)
- [Lisensi](../LICENSE)
- [Swagger lokal](http://localhost:8000/docs)
