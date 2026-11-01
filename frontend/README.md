# Sagara Denim — Frontend

Aplikasi Next.js untuk antarmuka manajemen produksi Sagara Denim. Tahap **M2**
menghubungkan login, guard sesi, dan pengelolaan Perintah Produksi ke API.
Dokumentasi lengkap ada di [`../README.md`](../README.md) dan panduan backend di
[`../backend/README.md`](../backend/README.md).

## Menjalankan

```bash
npm install
npm run dev
```

Buka <http://localhost:3000>. Request `/api/*` diteruskan ke FastAPI melalui
rewrite di `next.config.ts`. Atur `API_PROXY_URL` bila backend tidak berjalan di
`http://localhost:8000`.

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build produksi |
| `npm run start` | Menjalankan hasil build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript tanpa emit |

## Struktur

```text
src/
├─ app/
│  ├─ layout.tsx              # provider root
│  ├─ login/                  # rute publik
│  └─ (app)/                  # rute terproteksi AuthGate + AppShell
├─ components/
│  ├─ auth/                   # provider, guard, layar login
│  ├─ orders/                 # workspace, form, detail, opsi master
│  ├─ layout/                 # shell, sidebar, header, user menu
│  └─ ui/                     # primitif design system
├─ lib/
│  ├─ api/                    # client, auth, katalog, perintah produksi
│  ├─ labels.ts               # label dan opsi bahasa Indonesia
│  ├─ navigation.ts           # menu dan metadata halaman
│  └─ format.ts               # angka, tanggal, dan waktu WIB
└─ styles/                    # token, shell, auth, orders, komponen
```

## Rute

| Rute | Isi |
| --- | --- |
| `/login` | Masuk; satu-satunya rute publik |
| `/` | Dashboard Produksi (data contoh) |
| `/perintah-produksi` | Daftar, filter, pagination, buat, ubah, arsip |
| `/perintah-produksi/[id]` | Detail, item, timeline status, log produksi |
| `/antrean-produksi`, `/bahan`, `/laporan` | Placeholder |
| `/design-system/*` | Dokumentasi developer, tetap di balik login |

Rute lama `/order-produksi` dialihkan permanen ke `/perintah-produksi` melalui
`next.config.ts`.

## Autentikasi

- Token hanya berada di cookie `httpOnly`; JavaScript tidak membaca atau
  menyimpannya.
- `AuthProvider` memeriksa sesi lewat `/api/auth/me` saat aplikasi dimuat. Jika
  access token kedaluwarsa, sesi diperbarui lewat `/api/auth/refresh`.
- Klien API di `src/lib/api/client.ts` memperbarui access token secara
  transparan saat menerima `401`, lalu mengulang request satu kali.
- Refresh memakai single-flight `navigator.locks` agar banyak request tidak
  memicu rotasi bersamaan.
- Status `403` tidak pernah memicu refresh karena merupakan pembatasan peran.
- Sesi disinkronkan antar-tab dengan `BroadcastChannel`; sesi yang berakhir
  memunculkan pesan di halaman login.
- `AuthGate` mengarahkan pengguna tanpa sesi ke
  `/login?next=<halaman>&reason=expired` bila perlu.

Guard klien adalah lapisan UX. Otorisasi sebenarnya tetap dilakukan API
berdasarkan cookie sesi dan peran pengguna.

## Modul API

| Modul | Fungsi |
| --- | --- |
| `lib/api/client.ts` | Request JSON, error terpadu, refresh, retry, broadcast |
| `lib/api/auth.ts` | Login, refresh, logout, profil aktif |
| `lib/api/catalog.ts` | Pelanggan, produk, dan pilihan PIC |
| `lib/api/orders.ts` | Daftar, detail, buat, ubah, arsip perintah produksi |

Daftar perintah produksi memakai pagination dan filter server-side. Form
mendukung beberapa model dalam satu perintah dengan pelanggan opsional. Detail
menampilkan item, timeline status, dan log produksi secara baca-saja pada M2.
