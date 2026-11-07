# Baseline Performa dan Kualitas — Stage 0

Dokumen ini mencatat angka pembanding sebelum refactor bertahap. Angka di sini
dipakai untuk menilai apakah stage berikutnya benar-benar memperbaiki performa
tanpa mengubah perilaku.

- Tanggal pengukuran: 8 November 2026
- Branch: `chore/stage-0-baseline` (dari `origin/main` `1e3f61e`)
- Lingkungan lokal: Windows, Python 3.13.0, Node.js 24.19.0, PostgreSQL 18.0
- CI: Python 3.12, Node.js 22, PostgreSQL 17 Alpine

Waktu eksekusi sangat bergantung pada mesin dan cache. **Jumlah query** adalah
angka yang stabil dan menjadi pembanding utama; waktu hanya indikasi kasar.

## Dataset baseline

Skrip `backend/scripts/query_count.py` memakai dataset dari
`backend/scripts/baseline_dataset.py`:

- 20 pelanggan dan 20 produk
- 50 bahan dengan variasi stok habis, kritis, menipis, dan aman
- 60 order: 50 aktif (10 per tahap) + 10 selesai dalam 30 hari terakhir
- 130 log produksi (2 log per order aktif, 1 log per order selesai)
- 2 item per order aktif dan 1 item per order selesai
- Deadline tersebar di sekitar tanggal pengukuran

Skrip selalu memakai `TEST_DATABASE_URL` secara default, membuat ulang skema,
mengisi data, mengukur, lalu menghapus skema. Database utama hanya dapat dipakai
dengan `--database-url` dan `--force`.

## Baseline query count

Perintah:

```powershell
cd backend
.venv\Scripts\python.exe scripts\query_count.py
```

Hasil satu run:

| Layanan | Query | Waktu (ms) | Detail |
|---|---:|---:|---|
| `build_dashboard` | 10 | 39.7 | 5 stok kritis, 5 deadline |
| `list_queue` | 21 | 56.3 | 50 order / 5 tahap |
| `list_orders` | 5 | 20.3 | 60 total, 20 baris |
| `list_materials` | 4 | 8.2 | 50 total, 20 baris |
| `build_production_report` | 7 | 29.2 | 110 log, 20 baris |
| `build_production_report_csv` | 3 | 24.6 | 14.341 karakter, seluruh baris di memori |

Catatan:

- `build_dashboard` lebih tinggi dari perkiraan awal (±8) karena setiap bagian
  dashboard menjalankan query sendiri.
- `build_production_report` lebih tinggi dari perkiraan awal (±5) karena
  ringkasan, harian, tahap, dan daftar log diambil terpisah.
- CSV hanya 3 query, tetapi `.all()` memuat **seluruh** baris hasil filter ke
  memori sebelum CSV dibentuk.
- `list_queue` adalah biaya terbesar: 21 query untuk 5 tahap.

### Target stage berikutnya

| Layanan | Baseline | Target | Stage |
|---|---:|---:|---|
| `build_dashboard` | 10 | ≤10 dengan batas SQL | 1 |
| `list_queue` | 21 | ≤6 | 4 |
| `list_orders` | 5 | ≤5 | — |
| `list_materials` | 4 | ≤3 | 4 (opsional) |
| `build_production_report` | 7 | ≤7 | — |
| `build_production_report_csv` | 3 + memori penuh | 1 query streaming, memori konstan | 4 |

## Baseline coverage backend

Perintah:

```powershell
cd backend
.venv\Scripts\python.exe -m pytest -q --cov=app --cov-report=term-missing
```

Hasil:

- **130 test lulus**
- **Coverage total: 76%** (2.368 statement, 443 miss, 372 branch, 23 partial)
- Durasi: ±48 detik

Modul dengan coverage rendah:

| Modul | Cover | Catatan |
|---|---:|---|
| `app/services/production_workflow.py` | 32% | Transisi QC, rework, dan pembatalan belum teruji |
| `app/seed.py` | 30% | Hanya sebagian alur seed yang dieksekusi |
| `app/services/auth.py` | 41% | Refresh, rotasi token, dan revoke belum teruji |
| `app/services/materials.py` | 49% | Command dan movement belum teruji |
| `app/services/production_orders/commands.py` | 46% | Update, arsip, dan validasi belum teruji |
| `app/services/users.py` | 53% | Guard peran dan update user belum teruji |
| `app/services/reports/queries.py` | 57% | Filter tahap/order dan pagination belum teruji |
| `app/services/catalog.py` | 58% | Guard dan update master data belum teruji |
| `app/services/production_orders/queries.py` | 61% | Detail, queue filter, dan pagination belum teruji |

Modul dengan coverage baik: model (100%), schema (96–100%), `dashboard.py`
(95%), `stock.py` (93%), dan `production_metrics.py` (88%).

## Baseline test frontend

Perintah:

```powershell
cd frontend
npm run test
npm run test:coverage
```

Hasil:

- **52 test lulus** dalam 5 file
- Durasi: ±3 detik
- Coverage `src/lib`: **42,16% statement**, 36,72% branch, 35,66% function,
  41,44% line
- File yang sudah teruji: `date.ts` (100%), `workflow.ts` (92,3%),
  `use-paginated-list.ts` (97,2%), `use-debounced-value.ts` (100%),
  `pagination.ts` (100%)
- Semua modul `src/lib/api/*` masih 0% karena belum ada test komponen/API.

## Baseline pyright

Perintah:

```powershell
cd backend
.venv\Scripts\python.exe -m pyright app
```

Hasil: **21 error, 0 warning** (belum blocking).

| Modul | Error | Penyebab utama |
|---|---:|---|
| `app/services/materials.py` | 13 | Nilai opsional dari schema dipakai langsung; tipe atribut SQLAlchemy |
| `app/services/production_orders/filters.py` | 4 | Tipe list kondisi terlalu sempit (`BinaryExpression` vs `ColumnElement`) |
| `app/services/catalog.py` | 2 | Akses `.lower()` pada nilai opsional |
| `app/services/users.py` | 1 | Akses `.lower()` pada nilai opsional |
| `app/seed.py` | 1 | Index tuple kosong |

Error ini sengaja belum diperbaiki di Stage 0 agar baseline tetap jujur. Pyright
dijadikan blocking pada stage gate akhir setelah error dibereskan.

## Gate Stage 0

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Lint backend | `ruff check .` | Lulus |
| Test backend | `pytest -q` | 130 lulus |
| Coverage backend | `pytest --cov=app` | 76% |
| Tipe Python | `pyright app` | 21 error (belum blocking) |
| Typecheck frontend | `npm run typecheck` | Lulus |
| Lint frontend | `npm run lint` | Lulus |
| Test frontend | `npm run test` | 52 lulus |
| Build frontend | `npm run build` | Lulus |
| Baseline query | `python scripts/query_count.py` | Tercatat di atas |

## Cara mereproduksi

```powershell
# Backend
cd backend
.venv\Scripts\python.exe -m ruff check .
.venv\Scripts\python.exe -m pytest -q --cov=app --cov-report=term-missing
.venv\Scripts\python.exe -m pyright app
.venv\Scripts\python.exe scripts\query_count.py

# Frontend
cd ..\frontend
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run build
```

## Batasan

- Query count diukur pada dataset sintetis, bukan data produksi.
- Waktu eksekusi bukan benchmark; gunakan `EXPLAIN (ANALYZE, BUFFERS)` pada
  salinan data nyata untuk keputusan index.
- Coverage frontend mencakup seluruh `src/lib`, termasuk file yang belum
  diimpor test, sehingga angka total terlihat rendah secara wajar.
