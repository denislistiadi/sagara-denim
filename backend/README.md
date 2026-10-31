# Backend Sagara Denim (rencana)

Folder ini disiapkan untuk **FastAPI + PostgreSQL** pada tahap aplikasi penuh.
Belum ada kode backend pada tahap design system.

## Rencana struktur

```text
backend/
├─ app/
│  ├─ main.py            # entrypoint FastAPI
│  ├─ api/               # router: orders, materials, reports, auth
│  ├─ core/              # konfigurasi, keamanan, database
│  ├─ models/            # model SQLAlchemy
│  ├─ schemas/           # skema Pydantic
│  └─ services/          # logika bisnis produksi
├─ alembic/              # migrasi database
├─ tests/
├─ pyproject.toml
└─ .env.example
```

## Rencana endpoint awal

- `GET/POST /api/orders` — daftar dan pembuatan order produksi
- `GET/PATCH/DELETE /api/orders/{id}` — detail dan perubahan order
- `GET /api/orders/{id}/timeline` — riwayat tahap produksi
- `GET /api/materials` — stok bahan dan aksesoris
- `GET /api/reports/production` — rekap output dan reject

## Batasan

- Autentikasi dan peran belum dirancang.
- Kontrak API akan mengikuti tipe di `frontend/src/types/index.ts`.
- Data frontend saat ini statis; integrasi akan mengganti `mock-data.ts` dengan
  pemanggilan API dan state loading/error.
