# Sagara Denim — Frontend

Aplikasi Next.js untuk antarmuka manajemen produksi Sagara Denim.
Dokumentasi lengkap ada di [`../README.md`](../README.md) dan panduan backend di
[`../backend/README.md`](../backend/README.md).

```bash
npm install
npm run dev
```

- `npm run typecheck` — TypeScript tanpa emit
- `npm run lint` — ESLint
- `npm run build` — build produksi

## API

Request `/api/*` diteruskan ke FastAPI melalui rewrite di `next.config.ts`.
Atur `API_PROXY_URL` bila backend tidak berjalan di `http://localhost:8000`.
Klien API ada di `src/lib/api/` dan memakai cookie httpOnly, sehingga token tidak
disimpan di JavaScript.
