# Backend Sagara Denim

API manajemen produksi Sagara Denim. Tahap **M4** mencakup autentikasi, data
master baca, CRUD perintah produksi, papan antrean per tahap, state machine
transisi status, production log, serta **Bahan & Aksesoris** dengan stok
transaksional, riwayat mutasi, dan peringatan stok rendah. M4 menambah satu
migrasi database untuk saldo sebelum/sesudah mutasi.

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
│  │  └─ routes/            # health, auth, users, customers, products, orders, materials
│  ├─ core/                 # keamanan, cookie
│  ├─ models/               # model SQLAlchemy
│  ├─ schemas/              # skema Pydantic
│  └─ services/             # autentikasi, order, workflow, material, dan metrik produksi
├─ alembic/                 # migrasi database
├─ tests/                   # pengujian
├─ Dockerfile
├─ pyproject.toml
└─ .env.example
```

## Menjalankan lokal

Prasyarat: Python 3.12+, PostgreSQL 17+ yang berjalan di `localhost:5432`.

1. Siapkan role dan database (sekali saja):

   ```sql
   CREATE ROLE sagara LOGIN PASSWORD 'sagara';
   CREATE DATABASE sagara_denim OWNER sagara;
   CREATE DATABASE sagara_denim_test OWNER sagara;
   ```

2. Siapkan virtualenv dan dependency:

   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate        # Windows
   # source .venv/bin/activate   # Linux/macOS
   pip install -e ".[dev]"
   ```

3. Salin konfigurasi:

   ```bash
   copy .env.example .env        # Windows
   # cp .env.example .env        # Linux/macOS
   ```

4. Jalankan migrasi dan seed:

   ```bash
   alembic upgrade head
   python -m app.seed
   ```

5. Jalankan API:

   ```bash
   uvicorn app.main:app --reload
   ```

   - API: <http://localhost:8000>
   - Dokumentasi: <http://localhost:8000/docs>
   - Health: <http://localhost:8000/api/health>

Seed bersifat idempoten; menjalankannya berulang tidak membuat duplikat. Data
contoh mencakup 3 pengguna, 4 pelanggan, 5 model, 5 bahan, dan 8 perintah
produksi, termasuk contoh multi-item, selesai, dan dibatalkan. Bahan
`MTL-DNM-12` sengaja berada di bawah minimum untuk memicu peringatan restock.

## Menjalankan dengan Docker Compose

Dari root repositori:

```bash
docker compose up -d db
docker compose run --rm backend alembic upgrade head
docker compose run --rm backend python -m app.seed
docker compose up backend
```

Database di Docker terekspos di `localhost:5433` agar tidak bentrok dengan
PostgreSQL lokal di `5432`. Backend memakai `db:5432` di dalam jaringan Compose.

## Akun demo

| Peran | Email | Kata sandi |
| --- | --- | --- |
| Admin | `admin@sagara.co.id` | `Admin#2026` |
| Operator | `operator@sagara.co.id` | `Operator#2026` |
| QC | `qc@sagara.co.id` | `QC#2026` |

Nilai ini dapat diubah melalui variabel `SEED_*` sebelum menjalankan seed.

## Endpoint M4

| Metode | Path | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/health` | Publik | Status API dan database |
| POST | `/api/auth/login` | Publik | Masuk dan pasang cookie sesi |
| POST | `/api/auth/refresh` | Cookie refresh | Putar refresh token |
| POST | `/api/auth/logout` | Cookie refresh | Cabut sesi dan hapus cookie |
| GET | `/api/auth/me` | Sesi aktif | Profil pengguna |
| GET | `/api/users` | Admin | Daftar pengguna |
| GET | `/api/users/options` | Semua peran | Pilihan PIC |
| GET | `/api/customers` | Semua peran | Pelanggan aktif |
| GET | `/api/products` | Semua peran | Model produk aktif |
| GET | `/api/materials` | Semua peran | Daftar bahan dan ringkasan inventori |
| POST | `/api/materials` | Admin | Tambah bahan dan stok awal |
| GET | `/api/materials/{id}` | Semua peran | Detail bahan |
| PATCH | `/api/materials/{id}` | Admin | Ubah master atau status aktif |
| GET | `/api/materials/{id}/movements` | Semua peran | Riwayat mutasi stok |
| POST | `/api/materials/{id}/movements` | Admin, operator | Catat mutasi; penyesuaian khusus admin |
| GET | `/api/production-orders` | Semua peran | Daftar dengan filter |
| POST | `/api/production-orders` | Admin, operator | Buat perintah |
| GET | `/api/production-orders/queue` | Semua peran | Antrean per tahap |
| GET | `/api/production-orders/{id}` | Semua peran | Detail perintah |
| PATCH | `/api/production-orders/{id}` | Admin, operator | Ubah header/item |
| PATCH | `/api/production-orders/{id}/status` | Sesuai state machine | Transisi status |
| POST | `/api/production-orders/{id}/logs` | Admin, operator, atau QC | Catat log |
| DELETE | `/api/production-orders/{id}` | Admin | Arsipkan perintah terminal |

### Filter daftar perintah produksi

`GET /api/production-orders` menerima:

| Parameter | Keterangan |
| --- | --- |
| `page` | Halaman, minimal 1 |
| `page_size` | Ukuran halaman 1–50, default 10 |
| `search` | Kode, pelanggan, model, atau catatan |
| `status` | `menunggu`, `cutting`, `jahit`, `finishing`, `qc`, `selesai`, `dibatalkan` |
| `priority` | `tinggi`, `normal`, `rendah` |
| `customer_id` | UUID pelanggan |

### Filter antrean produksi

`GET /api/production-orders/queue` menerima:

| Parameter | Keterangan |
| --- | --- |
| `search` | Kode, pelanggan, model, atau catatan |
| `priority` | `tinggi`, `normal`, `rendah` |
| `limit_per_stage` | Jumlah kartu per tahap, 1–20, default 6 |

Response selalu memuat lima tahap aktif: `menunggu`, `cutting`, `jahit`,
`finishing`, dan `qc`. Setiap tahap berisi `order_count`, `total_quantity`, dan
daftar kartu terurut prioritas lalu deadline. Order `selesai`, `dibatalkan`, dan
yang sudah diarsipkan tidak ditampilkan.

### Filter daftar bahan

`GET /api/materials` menerima:

| Parameter | Keterangan |
| --- | --- |
| `page` | Halaman, minimal 1 |
| `page_size` | Ukuran halaman 1–50, default 10 |
| `search` | SKU, nama, atau kategori |
| `category` | Nama kategori persis |
| `stock_status` | `habis`, `kritis`, `menipis`, `aman` |
| `low_stock` | `true` untuk semua status selain `aman` |
| `active` | `aktif` (default), `nonaktif`, atau `semua` |

Response selalu memuat `summary` global dari seluruh bahan aktif: `total_active`,
`out_of_stock`, `below_minimum`, dan daftar `categories`. Ringkasan tidak
berubah saat filter daftar dipakai.

`GET /api/materials/{id}/movements` menerima `page`, `page_size` (1–50), dan
`movement_type` (`masuk`, `keluar`, `penyesuaian`). Riwayat selalu diurutkan
dari yang terbaru.

### Aturan stok M4

- Status stok: `habis` bila saldo ≤ 0; `kritis` bila 0 < saldo ≤ 50% minimum;
  `menipis` bila saldo < minimum; `aman` bila saldo ≥ minimum.
- `stock_qty` tidak dapat diubah lewat endpoint master. Perubahan hanya lewat
  mutasi, dengan constraint database `stock_qty >= 0`.
- Stok awal pada `POST /api/materials` dicatat sebagai mutasi `masuk` dengan
  catatan `Stok awal` bila lebih dari nol.
- `masuk` dan `keluar` memakai `quantity > 0`; stok keluar melebihi saldo
  ditolak `422` beserta sisa stok. `penyesuaian` memakai `target_stock >= 0`,
  wajib alasan minimal 3 karakter, dan hanya untuk admin.
- Penyesuaian yang tidak mengubah saldo ditolak `422`. Batas saldo yang
  didukung adalah `9.999.999.999,99`.
- Setiap mutasi baru mencatat `stock_before` dan `stock_after`; baris lama dari
  seed sebelum M4 dapat bernilai `null`.
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

### Aturan penulisan

- Pelanggan, PIC, dan deadline bersifat opsional.
- Satu perintah produksi wajib memiliki minimal satu item model.
- Model produk tidak boleh duplikat dalam satu perintah.
- Total quantity dihitung dari seluruh item.
- Membuat perintah menambahkan entri timeline awal berstatus `menunggu`.
- Perubahan item mengganti seluruh daftar item dalam satu transaksi dan hanya
  diizinkan saat status `menunggu`.
- Header order aktif masih dapat diubah. Order `selesai`/`dibatalkan` terkunci.
- Kode perintah memakai format `PRD-YYMM-NNN` berdasarkan waktu WIB dan
  dilindungi advisory lock PostgreSQL agar tetap unik saat bersamaan.

## Workflow produksi M3

State machine yang diizinkan:

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
- Jika status di database sudah berbeda dari `expected_status`, response `409`.
- Transisi maju mewajibkan minimal satu log pada siklus tahap berjalan.
- Transisi dari status terminal (`selesai`, `dibatalkan`) selalu ditolak.
- Order yang sudah diarsipkan tidak dapat ditransisikan atau diberi log.
- Row-level lock dipakai saat transisi dan pencatatan log.

Aturan production log:

- Log hanya dapat dicatat pada `cutting`, `jahit`, `finishing`, atau `qc`.
- Peran log mengikuti tahap: admin/operator untuk tiga tahap produksi, admin/QC
  untuk tahap QC.
- `output_qty + reject_qty` harus lebih dari nol dan tidak boleh melebihi sisa
  kuantitas siklus tahap saat ini.
- `log_date` tidak boleh melewati hari ini (zona WIB).
- Log bersifat append-only pada M3; belum ada edit atau hapus log.
- Setelah rework dari QC, siklus tahap baru dimulai sehingga log lama pada tahap
  tujuan tidak dihitung untuk progress.

## Peran

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
| Lihat bahan dan riwayat stok | Ya | Ya | Ya |
| Tambah/ubah master bahan | Ya | Tidak | Tidak |
| Aktifkan/nonaktifkan bahan | Ya | Tidak | Tidak |
| Catat stok masuk/keluar | Ya | Ya | Tidak |
| Penyesuaian stok | Ya | Tidak | Tidak |
| Kelola pengguna | Ya | Tidak | Tidak |

Arsip memakai **soft delete** melalui kolom `deleted_at`. Hanya order `selesai`
atau `dibatalkan` yang dapat diarsipkan. Perintah yang diarsipkan tidak muncul
di daftar maupun detail, tetapi baris, kode, dan riwayatnya tetap tersimpan.
Kode perintah yang sudah diarsipkan tidak dipakai ulang.

## Alur autentikasi

- Login menghasilkan **access token JWT** (15 menit) dan **refresh token opak**
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

## Pengujian

Pastikan database uji `sagara_denim_test` sudah ada, lalu dari direktori
`backend/` jalankan:

```bash
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m ruff check .
```

Pengujian M4 mencakup:

- regresi autentikasi: login, cookie `httpOnly`, refresh rotation, deteksi
  pemakaian ulang token, logout, dan akses `/me`;
- pembatasan peran pada daftar pengguna dan penulisan perintah produksi;
- pembuatan perintah multi-item, validasi item/kuantitas/produk, pagination,
  pencarian, serta filter status, prioritas, dan pelanggan;
- queue lima tahap dengan pencarian, filter prioritas, batas kartu per tahap,
  dan urutan prioritas lalu deadline;
- transisi maju beserta pengisian `started_at`/`completed_at`;
- kewajiban minimal satu log tahap sebelum transisi maju dan penolakan log
  yang melebihi sisa kuantitas;
- penyelesaian dan rework QC ke `jahit`/`finishing` dengan alasan wajib;
- aturan pembatalan per peran dan status, termasuk alasan wajib;
- konflik `expected_status` yang mengembalikan `409`;
- progress yang reset ke 0 setelah rework dan menghitung ulang per siklus;
- matriks peran log (operator untuk Cutting/Jahit/Finishing, QC untuk QC);
- guard perubahan item setelah produksi berjalan dan arsip hanya untuk order
  terminal oleh admin;
- regresi CRUD perintah produksi dan pengarsipan soft delete;
- daftar bahan dengan filter pencarian, kategori, status, low stock, status
  aktif, pagination, dan ringkasan inventori global;
- status `habis`/`kritis`/`menipis`/`aman`, termasuk minimum nol;
- pembuatan bahan oleh admin, normalisasi SKU, duplikasi SKU, dan stok awal;
- penolakan `stock_qty` langsung serta penguncian SKU/satuan setelah mutasi;
- matriks peran stok: operator hanya masuk/keluar, QC read-only, penyesuaian
  khusus admin;
- saldo sebelum/sesudah, stok tidak cukup, penyesuaian tanpa perubahan, bahan
  nonaktif, dan validasi payload mutasi;
- riwayat mutasi dengan filter tipe, pagination, nilai saldo `null` lama, dan
  tautan opsional ke perintah produksi aktif.

Saat ini 64 tes backend lulus dan `ruff check .` bersih.

## Data model

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

Satu perintah produksi dapat berisi beberapa model. Pelanggan bersifat opsional
agar produksi untuk stok internal tetap dapat dicatat.

M4 menambah migrasi `44af95156808_add_stock_movement_balances` yang menambahkan
kolom nullable `stock_before` dan `stock_after` pada `stock_movements`. Baris
lama tetap valid; mutasi baru selalu mengisi kedua kolom tersebut.

## Catatan produksi

Sebelum deploy:

- Ganti `JWT_SECRET` dengan nilai acak minimal 32 karakter.
- Set `COOKIE_SECURE=true` dan jalankan di belakang HTTPS.
- Batasi `CORS_ORIGINS` ke domain aplikasi.
- Jangan memakai kredensial seed demo.
- Jalankan `alembic upgrade head` sebagai bagian dari proses deploy.
