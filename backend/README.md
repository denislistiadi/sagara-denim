# Backend Sagara Denim

API manajemen produksi Sagara Denim. Tahap **M2** mencakup autentikasi, data
master baca, serta pembuatan, perubahan, detail, dan pengarsipan perintah
produksi.

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
│  │  └─ routes/            # health, auth, users, customers, products, orders
│  ├─ core/                 # keamanan, cookie
│  ├─ models/               # model SQLAlchemy
│  ├─ schemas/              # skema Pydantic
│  └─ services/             # logika autentikasi dan perintah produksi
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
contoh mencakup 3 pengguna, 4 pelanggan, 5 model, 4 bahan, dan 8 perintah
produksi, termasuk contoh multi-item, selesai, dan dibatalkan.

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

## Endpoint M2

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
| GET | `/api/production-orders` | Semua peran | Daftar dengan filter |
| POST | `/api/production-orders` | Admin, operator | Buat perintah |
| GET | `/api/production-orders/{id}` | Semua peran | Detail perintah |
| PATCH | `/api/production-orders/{id}` | Admin, operator | Ubah perintah |
| DELETE | `/api/production-orders/{id}` | Admin | Arsipkan perintah |

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

### Aturan penulisan

- Pelanggan, PIC, dan deadline bersifat opsional.
- Satu perintah produksi wajib memiliki minimal satu item model.
- Model produk tidak boleh duplikat dalam satu perintah.
- Total quantity dihitung dari seluruh item.
- Membuat perintah menambahkan entri timeline awal berstatus `menunggu`.
- Perubahan item mengganti seluruh daftar item dalam satu transaksi.
- Kode perintah memakai format `PRD-YYMM-NNN` berdasarkan waktu WIB dan
  dilindungi advisory lock PostgreSQL agar tetap unik saat bersamaan.

## Peran

| Aksi | Admin | Operator | QC |
| --- | --- | --- | --- |
| Lihat perintah produksi | Ya | Ya | Ya |
| Buat dan ubah perintah | Ya | Ya | Tidak |
| Arsipkan perintah | Ya | Tidak | Tidak |
| Lihat data master | Ya | Ya | Ya |
| Kelola pengguna | Ya | Tidak | Tidak |

Arsip memakai **soft delete** melalui kolom `deleted_at`. Perintah yang
diarsipkan tidak muncul di daftar maupun detail, tetapi baris, kode, dan
riwayatnya tetap tersimpan. Kode perintah yang sudah diarsipkan tidak dipakai
ulang.

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

Pastikan database uji `sagara_denim_test` sudah ada, lalu:

```bash
pytest
ruff check .
ruff format --check .
```

Pengujian M2 mencakup:

- login, cookie `httpOnly`, refresh rotation, deteksi pemakaian ulang token,
  logout, dan akses `/me`;
- pembatasan peran pada daftar pengguna dan penulisan perintah produksi;
- pembuatan perintah multi-item dengan pelanggan opsional;
- validasi item kosong, quantity tidak valid, produk nonaktif, dan duplikasi;
- pagination, pencarian, serta filter status, prioritas, dan pelanggan;
- detail berisi item, timeline, dan log produksi;
- perubahan header dan penggantian item;
- pengarsipan soft delete dan kode yang tetap unik.

## Data model M2

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
| `stock_movements` | Mutasi stok masuk, keluar, penyesuaian |

Satu perintah produksi dapat berisi beberapa model. Pelanggan bersifat opsional
agar produksi untuk stok internal tetap dapat dicatat.

## Catatan produksi

Sebelum deploy:

- Ganti `JWT_SECRET` dengan nilai acak minimal 32 karakter.
- Set `COOKIE_SECURE=true` dan jalankan di belakang HTTPS.
- Batasi `CORS_ORIGINS` ke domain aplikasi.
- Jangan memakai kredensial seed demo.
- Jalankan `alembic upgrade head` sebagai bagian dari proses deploy.
