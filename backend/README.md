# Backend Sagara Denim

API manajemen produksi Sagara Denim. Tahap **M6** mencakup autentikasi, data
master baca/tulis, CRUD perintah produksi, papan antrean per tahap, state machine
transisi status, production log, **Bahan & Aksesoris** dengan stok transaksional
dan riwayat mutasi, **Laporan Produksi** dengan filter tanggal/tahap dan export
CSV, ringkasan **Dashboard** dari database, serta CRUD pelanggan, produk, dan
pengguna. M4 menambah migrasi saldo sebelum/sesudah mutasi; M5 menambah index
tanggal log untuk laporan. M6 tidak menambah migrasi maupun dependency.

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
│  │  └─ routes/            # health, auth, dashboard, users, customers, products, orders, materials, reports
│  ├─ core/                 # keamanan, cookie
│  ├─ models/               # model SQLAlchemy
│  ├─ schemas/              # skema Pydantic
│  └─ services/             # autentikasi, dashboard, katalog, pengguna, order, workflow, material, metrik, laporan
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

## Endpoint M6

| Metode | Path | Akses | Fungsi |
| --- | --- | --- | --- |
| GET | `/api/health` | Publik | Status API dan database |
| POST | `/api/auth/login` | Publik | Masuk dan pasang cookie sesi |
| POST | `/api/auth/refresh` | Cookie refresh | Putar refresh token |
| POST | `/api/auth/logout` | Cookie refresh | Cabut sesi dan hapus cookie |
| GET | `/api/auth/me` | Sesi aktif | Profil pengguna |
| GET | `/api/dashboard` | Semua peran | Ringkasan dashboard produksi |
| GET | `/api/users` | Admin | Daftar pengguna dengan filter |
| POST | `/api/users` | Admin | Tambah pengguna |
| PATCH | `/api/users/{id}` | Admin | Ubah data/peran/status pengguna |
| POST | `/api/users/{id}/reset-password` | Admin | Tetapkan kata sandi baru |
| DELETE | `/api/users/{id}` | Admin | Nonaktifkan pengguna |
| GET | `/api/users/options` | Semua peran | Pilihan PIC |
| GET | `/api/customers` | Semua peran | Daftar pelanggan dengan filter |
| POST | `/api/customers` | Admin | Tambah pelanggan |
| GET | `/api/customers/{id}` | Semua peran | Detail pelanggan |
| PATCH | `/api/customers/{id}` | Admin | Ubah pelanggan |
| DELETE | `/api/customers/{id}` | Admin | Nonaktifkan pelanggan |
| GET | `/api/products` | Semua peran | Daftar model produk dengan filter |
| POST | `/api/products` | Admin | Tambah model produk |
| GET | `/api/products/{id}` | Semua peran | Detail model produk |
| PATCH | `/api/products/{id}` | Admin | Ubah model produk |
| DELETE | `/api/products/{id}` | Admin | Nonaktifkan model produk |
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

Daftar pelanggan/products dapat dibaca semua peran; daftar pengguna hanya admin.
`DELETE` pada ketiga resource berarti nonaktifkan (`is_active = false`) dan
bersifat idempoten, bukan hard delete.

### Ringkasan dashboard

`GET /api/dashboard` tidak menerima parameter dan mengembalikan:

| Bagian | Isi |
| --- | --- |
| `kpis` | Order aktif, order masuk hari ini, output/reject hari ini, rasio reject, dan On-Time Delivery 30 hari |
| `daily_output` | Tujuh tanggal terakhir, termasuk tanggal tanpa log bernilai nol |
| `reject_breakdown` | Reject empat tahap tetap: `cutting`, `jahit`, `finishing`, `qc` |
| `pipeline` | Lima status aktif (`menunggu`–`qc`) dengan jumlah order dan kuantitas |
| `upcoming_deadlines` | Maksimal lima deadline order aktif terdekat |
| `critical_stock` | Maksimal lima bahan aktif di bawah batas aman |

Tanggal bisnis memakai WIB. Output dan reject dihitung dari
`production_logs.log_date`; order terarsip dikecualikan. On-Time Delivery
menghitung order `selesai` non-arsip yang memiliki deadline dan `completed_at`,
dengan tanggal selesai WIB dalam 30 hari kalender terakhir. Order tepat waktu
bila tanggal selesai WIB tidak melewati deadline. Rasio bernilai `null` bila
belum ada order yang memenuhi syarat.

### Aturan data master dan pengguna

- Kode pelanggan dan produk unik tanpa membedakan huruf besar/kecil; input
  dirapikan dan diubah menjadi huruf besar. Duplikasi menghasilkan `409`.
- Field opsional kosong disimpan sebagai `null`; email divalidasi. Perubahan
  wajib memuat minimal satu field dan tidak boleh mengosongkan kode/nama.
- Kata sandi pengguna minimal 8 karakter serta memuat huruf dan angka. Reset
  sandi memakai kata sandi baru yang ditentukan admin.
- Deaktivasi pengguna, perubahan peran, dan reset sandi mencabut seluruh refresh
  token pengguna. Admin tidak dapat menonaktifkan atau mengubah peran akun
  sendiri; reset sandi akun sendiri diizinkan.
- Endpoint pengguna tidak pernah mengembalikan hash kata sandi.

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

### Filter laporan produksi

`GET /api/reports/production` menerima:

| Parameter | Keterangan |
| --- | --- |
| `start_date` | Tanggal awal ISO, inklusif |
| `end_date` | Tanggal akhir ISO, inklusif |
| `stage` | `cutting`, `jahit`, `finishing`, atau `qc`; opsional |
| `page` | Halaman log, minimal 1, default 1 |
| `page_size` | Ukuran halaman log 1–100, default 20 |

`GET /api/reports/production/export` menerima filter yang sama tanpa `page` dan
`page_size`, lalu mengembalikan seluruh baris hasil filter. Rentang tanggal
terbalik menghasilkan `422` dengan pesan
`Tanggal awal tidak boleh melebihi tanggal akhir.`

Dasar perhitungan adalah `production_logs.log_date`. Ringkasan mencakup seluruh
rentang filter, rekap harian hanya memuat tanggal yang memiliki log dan
diurutkan naik, sedangkan rekap tahap selalu memuat empat tahap dalam urutan
tetap. Rasio reject dihitung `reject / (output + reject) × 100`, dikirim sebagai
angka dua desimal dengan pembulatan `ROUND_HALF_UP`. Daftar log diurutkan dari
tanggal log terbaru, lalu `created_at` terbaru.

Order aktif, selesai, dibatalkan, dan terarsip tetap masuk laporan. Baris order
terarsip diberi `order_archived: true` dan `Order Diarsipkan: Ya` pada CSV.

Contoh response ringkas:

```json
{
  "filters": {
    "start_date": "2026-10-26",
    "end_date": "2026-11-01",
    "stage": null
  },
  "summary": {
    "total_output": 1487,
    "total_reject": 10,
    "reject_ratio": 0.67,
    "orders_logged": 6,
    "logs_count": 16,
    "days_count": 6
  },
  "daily": [
    {
      "date": "2026-10-26",
      "output_qty": 120,
      "reject_qty": 0,
      "reject_ratio": 0.0,
      "logs_count": 1
    }
  ],
  "stages": [
    {
      "stage": "cutting",
      "output_qty": 542,
      "reject_qty": 2,
      "reject_ratio": 0.37,
      "logs_count": 6
    }
  ],
  "logs": {
    "items": [],
    "total": 16,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

### Format CSV laporan

- Delimiter `;`, UTF-8 dengan BOM, akhir baris CRLF, dan desimal memakai koma.
- Kolom:
  `Tanggal Log;Kode Order;Pelanggan;Tahap;Output;Reject;Rasio Reject (%);Status Order;Order Diarsipkan;Catatan;Dicatat Oleh;Waktu Input (WIB)`.
- Nama berkas:
  `laporan-produksi-YYYY-MM-DD_YYYY-MM-DD[-stage].csv`.
- Nilai teks yang diawali `=`, `+`, `-`, `@`, tab, atau CR diberi awalan `'`
  untuk mencegah formula injection. Kutip dan baris baru di-escape sesuai aturan
  CSV.
- `Waktu Input (WIB)` memakai format `YYYY-MM-DD HH:MM:SS` zona WIB.

Contoh:

```csv
2026-10-26;PRD-2611-019;Toko Denim Jaya;Cutting;120;0;0,00;Selesai;Tidak;Cutting panel depan.;Sinta Maharani;2026-10-26 09:15:00
```

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
| Tambah/ubah/nonaktifkan pelanggan dan produk | Ya | Tidak | Tidak |
| Lihat daftar pengguna | Ya | Tidak | Tidak |
| Tambah/ubah/reset sandi/nonaktifkan pengguna | Ya | Tidak | Tidak |
| Lihat bahan dan riwayat stok | Ya | Ya | Ya |
| Tambah/ubah master bahan | Ya | Tidak | Tidak |
| Aktifkan/nonaktifkan bahan | Ya | Tidak | Tidak |
| Catat stok masuk/keluar | Ya | Ya | Tidak |
| Penyesuaian stok | Ya | Tidak | Tidak |
| Lihat dan export laporan produksi | Ya | Ya | Ya |
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

Pengujian M3–M6 mencakup:

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
  tautan opsional ke perintah produksi aktif;
- ringkasan laporan, rasio reject dua desimal, dan batas tanggal inklusif;
- filter tahap pada ringkasan, rekap harian, rekap tahap, dan daftar log;
- rekap harian terurut naik, rekap tahap empat baris tetap, serta pagination dan
  urutan log;
- penyertaan order terarsip dan dibatalkan beserta penandanya;
- validasi rentang tanggal, tahap, pagination, dan autentikasi laporan;
- format CSV: header 12 kolom, BOM, delimiter `;`, CRLF, koma desimal, escape
  teks, sanitasi formula, filter tahap, dan hasil kosong;
- akses baca/export untuk admin, operator, dan QC;
- ringkasan dashboard: KPI order/output/reject, batas hari WIB, output tujuh
  hari yang diisi nol, reject empat tahap, pipeline lima status, deadline
  terdekat, stok kritis, dan On-Time Delivery 30 hari;
- CRUD pelanggan/produk: akses baca semua peran, tulis khusus admin, filter
  status, pencarian, pagination, normalisasi kode, duplikasi case-insensitive,
  validasi field, dan nonaktifkan tanpa hard delete;
- CRUD pengguna: daftar khusus admin, pembuatan dengan kebijakan kata sandi,
  perubahan peran/status, proteksi akun sendiri, reset sandi, dan pencabutan
  refresh token pada deaktivasi, perubahan peran, serta reset sandi.

Saat ini 121 tes backend lulus dan `ruff check .` bersih.

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

M5 menambah migrasi `29e652d588ae_add_production_log_date_index` yang membuat
index `ix_production_logs_log_date` pada `production_logs.log_date` untuk
mempercepat filter dan agregasi laporan berbasis tanggal.

M6 tidak mengubah skema database. Dashboard dan CRUD data master memakai tabel
yang sudah ada; head migrasi tetap `29e652d588ae`.

## Catatan produksi

Sebelum deploy:

- Ganti `JWT_SECRET` dengan nilai acak minimal 32 karakter.
- Set `COOKIE_SECURE=true` dan jalankan di belakang HTTPS.
- Batasi `CORS_ORIGINS` ke domain aplikasi.
- Jangan memakai kredensial seed demo.
- Jalankan `alembic upgrade head` sebagai bagian dari proses deploy.
