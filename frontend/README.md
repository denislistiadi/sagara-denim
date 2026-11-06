# Frontend Sagara Denim

Antarmuka Next.js untuk manajemen produksi Sagara Denim. Frontend menangani
dashboard, perintah produksi, antrean per tahap, bahan dan aksesoris, laporan
produksi, data master pelanggan/produk, serta manajemen pengguna.

Dokumen ini adalah sumber kebenaran untuk rute, arsitektur UI, API client,
guard, design system, dan build frontend. Kontrak API dan aturan bisnis ada di
[`../backend/README.md`](../backend/README.md); panduan seluruh aplikasi ada di
[`../README.md`](../README.md).

## Teknologi

| Bagian | Pilihan |
| --- | --- |
| Framework | Next.js 16.4 App Router |
| UI | React 19.3, TypeScript 5 |
| Styling | Tailwind CSS v4 + CSS variables |
| Primitif | Radix UI |
| Ikon | Material Design Icons (`@mdi/js`) |
| Font | Plus Jakarta Sans melalui `next/font` |
| Chart | SVG/CSS kustom, tanpa library chart |
| Data | `fetch` + API client internal, tanpa state library eksternal |
| Pengujian | Playwright E2E, TypeScript, ESLint |

## Prasyarat

- Node.js 20.9+ dan npm.
- Backend berjalan di `http://localhost:8000` dan database sudah di-seed.
- Browser modern dengan dukungan `BroadcastChannel` dan `navigator.locks`
  (dipakai untuk sinkronisasi sesi; fitur lain tetap berjalan tanpa keduanya).

## Menjalankan

```powershell
cd frontend
npm install
npm run dev
```

Buka <http://localhost:3000>. Request `/api/*` diteruskan ke FastAPI melalui
rewrite di `next.config.ts`.

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build produksi |
| `npm run start` | Menjalankan hasil build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript tanpa emit |
| `npm run test:e2e` | Smoke test Playwright; menjalankan dev server bila perlu |
| `npm run test:e2e:ui` | Playwright mode UI untuk pengembangan |

## Konfigurasi

Buat `frontend/.env.local` bila perlu. File ini diabaikan Git.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `API_PROXY_URL` | `http://localhost:8000` | Dibaca server Next.js untuk rewrite `/api/:path*`; tidak dikirim ke browser |
| `NEXT_PUBLIC_API_URL` | Kosong | Base URL API untuk request browser; kosong berarti memakai origin Next.js |

Perilaku penting:

- Dengan `NEXT_PUBLIC_API_URL` kosong, browser memanggil `/api/*` pada origin
  yang sama. Cookie sesi tetap same-origin dan rewrite Next.js meneruskan
  request ke FastAPI.
- Jika `NEXT_PUBLIC_API_URL` diisi, browser memanggil API secara langsung.
  Backend harus mengizinkan origin frontend melalui `CORS_ORIGINS` dan cookie
  harus dikonfigurasi untuk skenario tersebut.
- `API_PROXY_URL` dibaca oleh `next.config.ts` saat build. Setelah mengubahnya,
  restart `npm run dev` atau build ulang untuk produksi.
- `NEXT_PUBLIC_API_URL` di-inline saat build. Perubahan nilai ini memerlukan
  build ulang.
- Jangan menyimpan token di JavaScript. Access dan refresh token hanya berada
  di cookie `httpOnly` yang dikelola backend.

Nilai contoh tersedia di [`.env.example`](../.env.example) root. Detail backend
ada di [konfigurasi backend](../backend/README.md#konfigurasi).

## Struktur dan modul UI

```text
src/
├─ app/
│  ├─ layout.tsx              # provider root, font, metadata
│  ├─ login/                  # rute publik
│  └─ (app)/                  # rute terproteksi AuthGate + AppShell
├─ components/
│  ├─ auth/                   # provider, guard, layar login
│  ├─ dashboard/              # KPI, chart, pipeline, deadline, stok kritis
│  ├─ orders/                 # workspace, form, detail, stepper, aksi, dialog
│  ├─ queue/                  # papan kanban dan kartu antrean
│  ├─ materials/              # daftar, detail, form, aksi stok, riwayat
│  ├─ reports/                # filter, ringkasan, rekap, log, export
│  ├─ catalog/                # pelanggan, produk, form, tabel, dialog status
│  ├─ users/                  # pengguna, form, reset sandi, tabel
│  ├─ layout/                 # shell, sidebar, header, user menu
│  └─ ui/                     # primitif design system
├─ lib/
│  ├─ api/                    # client, auth, dashboard, katalog, pengguna,
│  │                          # order, bahan, laporan
│  ├─ labels.ts               # label dan opsi bahasa Indonesia
│  ├─ materials.ts            # guard peran dan helper status stok
│  ├─ users.ts                # guard admin dan kebijakan kata sandi
│  ├─ navigation.ts           # menu dan metadata halaman
│  ├─ workflow.ts             # aturan transisi, ringkasan log, guard
│  └─ format.ts               # angka, kuantitas, tanggal, waktu WIB
├─ styles/                    # token, shell, auth, orders, queue, materials,
│                             # reports, dashboard
└─ types/                     # tipe domain

e2e/                          # smoke test Playwright
playwright.config.ts          # konfigurasi browser dan dev server
```

| Modul | Tanggung jawab |
| --- | --- |
| `components/auth` | `AuthProvider`, `AuthGate`, bootstrap sesi, dan layar login |
| `components/layout` | App shell, sidebar, header, dan menu pengguna |
| `components/dashboard` | KPI dan panel dashboard dari `GET /api/dashboard` |
| `components/orders` | Daftar, form multi-item, detail, timeline, stepper, transisi, log, arsip |
| `components/queue` | Papan lima tahap, pencarian, filter prioritas, dan kartu order |
| `components/materials` | Inventori, master bahan, detail saldo, mutasi, dan riwayat |
| `components/reports` | Filter periode/tahap/perintah, KPI, rekap, tabel log, dan export |
| `components/catalog` | Pelanggan dan produk: tabel, form, filter, dan nonaktivasi |
| `components/users` | Pengguna admin-only: form, peran, status, dan reset sandi |
| `lib/api/client.ts` | Request JSON, `ApiError`, refresh otomatis, retry, broadcast |
| `lib/workflow.ts` | Sumber aturan transisi dan guard workflow di sisi klien |

## Rute dan akses

| Rute | Akses | Isi |
| --- | --- | --- |
| `/login` | Publik | Masuk; satu-satunya rute publik |
| `/` | Semua peran | Dashboard produksi live dari `GET /api/dashboard` |
| `/perintah-produksi` | Semua peran; tulis admin/operator | Daftar, filter, pagination, buat/ubah, arsip (admin) |
| `/perintah-produksi/[id]` | Semua peran; aksi sesuai peran | Detail, item, stepper, aksi workflow, timeline, log |
| `/antrean-produksi` | Semua peran | Papan kanban lima tahap produksi |
| `/bahan` | Semua peran; master admin, mutasi admin/operator | Daftar, ringkasan inventori, restock, filter, form master, mutasi |
| `/bahan/[id]` | Semua peran; mutasi admin/operator | Detail, saldo, mutasi, penyesuaian (admin), dan riwayat stok |
| `/pelanggan` | Semua peran; tulis admin | Daftar, filter, tambah, ubah, dan nonaktifkan pelanggan |
| `/produk` | Semua peran; tulis admin | Daftar, filter, tambah, ubah, dan nonaktifkan produk |
| `/pengguna` | Admin | Daftar, tambah, ubah, reset sandi, dan nonaktifkan pengguna |
| `/laporan` | Semua peran | Filter periode/tahap/perintah, KPI, rekap, log, dan export CSV |
| `/design-system` | Developer | Ringkasan design system |
| `/design-system/fondasi` | Developer | Warna, tipografi, spacing, radius, shadow, ikon |
| `/design-system/komponen` | Developer | Galeri komponen dan state |
| `/design-system/pola` | Developer | Pola shell, header, toolbar, dialog, dan state |

Rute aplikasi yang dilindungi berada di route group `(app)`, memakai
`AuthGate` dan `AppShell`. Halaman di group tersebut memakai
`export const instant = false;` agar navigasi tetap memvalidasi sesi.

Rute lama `/order-produksi` dan turunannya dialihkan permanen ke
`/perintah-produksi` melalui `next.config.ts`.

Menu Design System disembunyikan dari sidebar melalui `SHOW_DEV_NAV` di
`components/layout/sidebar.tsx`, tetapi rutenya tetap dapat dibuka langsung oleh
developer setelah login.

## Arsitektur dan alur data

- `app/layout.tsx` memasang font Plus Jakarta Sans, metadata, `AuthProvider`,
  `TooltipProvider`, dan `ToastProvider`.
- `app/(app)/layout.tsx` membungkus halaman terproteksi dengan `AuthGate` dan
  `AppShell`.
- Halaman modul mengelola state filter, pagination, dialog, dan pemuatan data di
  sisi klien. Server tetap menjadi sumber kebenaran; tidak ada cache data global
  eksternal.
- `lib/api/*` memisahkan kontrak per domain. Tipe frontend mempertahankan nilai
  Decimal sebagai `string`, lalu helper di `lib/format.ts` mengubahnya ke angka
  hanya setelah data tervalidasi.
- Tanggal dan waktu yang ditampilkan memakai format Indonesia/WIB melalui
  helper yang sama agar konsisten dengan backend.
- Pola UI utama: skeleton saat pemuatan awal, empty state yang informatif,
  banner error tanpa menghilangkan filter aktif, dan dialog yang tidak menutup
  saat request gagal.

## API client dan autentikasi

| Modul | Fungsi |
| --- | --- |
| `lib/api/client.ts` | Request JSON, error terpadu, refresh, retry, broadcast sesi |
| `lib/api/auth.ts` | Login, refresh, logout, dan profil aktif |
| `lib/api/dashboard.ts` | Ringkasan dashboard |
| `lib/api/catalog.ts` | CRUD pelanggan/produk dan pilihan katalog |
| `lib/api/users.ts` | CRUD pengguna, reset sandi, dan nonaktivasi |
| `lib/api/orders.ts` | CRUD perintah, queue, transisi status, dan log produksi |
| `lib/api/materials.ts` | Daftar/detail bahan, master, dan mutasi stok |
| `lib/api/reports.ts` | Laporan produksi dan unduhan CSV |

Perilaku autentikasi:

- Token hanya berada di cookie `httpOnly`; JavaScript tidak membacanya.
- `AuthProvider` memeriksa sesi lewat `/api/auth/me` saat aplikasi dimuat dan
  memperbarui access token lewat `/api/auth/refresh` bila kedaluwarsa.
- Request yang menerima `401` mencoba refresh satu kali, lalu mengulang request
  satu kali. `ApiError` membawa status dan detail untuk ditampilkan UI.
- Refresh memakai single-flight `navigator.locks` agar banyak request tidak
  memicu rotasi bersamaan.
- Status `403` tidak memicu refresh karena merupakan pembatasan peran.
- Sesi disinkronkan antar-tab melalui `BroadcastChannel`; sesi yang berakhir
  memunculkan pesan di halaman login.
- `AuthGate` mengarahkan pengguna tanpa sesi ke
  `/login?next=<halaman>&reason=expired` bila perlu.
- `apiDownload` memakai jalur refresh yang sama untuk unduhan CSV, sehingga
  export tetap berhasil setelah access token kedaluwarsa.
- `skipAuthRefresh` dipakai pada login dan bootstrap sesi agar tidak memicu
  refresh yang tidak perlu.

Guard frontend adalah lapisan UX. Otorisasi sebenarnya tetap dilakukan API
berdasarkan cookie sesi dan peran pengguna.

## Alur UI per modul

### Dashboard

- Halaman `/` memuat data live saat dibuka dan menampilkan skeleton saat
  pemuatan awal. Kegagalan API menampilkan empty state dengan tombol coba lagi,
  bukan data contoh.
- Empat KPI: order aktif, output hari ini, reject rate, dan On-Time Delivery
  30 hari. Nilai On-Time Delivery tampil sebagai `—` bila belum ada order selesai
  yang memenuhi syarat.
- Output harian tujuh hari, komposisi reject empat tahap, pipeline lima status,
  deadline terdekat, dan stok kritis mengikuti kontrak `GET /api/dashboard`.
- Tombol “Lihat Perintah Produksi”, tautan panel, dan navigasi “Akses cepat”
  mengarah ke Laporan Produksi, Pelanggan, dan Produk.

### Perintah produksi dan antrean

- Daftar memakai filter status, prioritas, pelanggan, pencarian, dan pagination
  server-side. Form mendukung beberapa model dalam satu perintah dengan
  pelanggan, PIC, dan deadline opsional.
- Detail menampilkan item, stepper `menunggu → selesai`, timeline, log, dan aksi
  yang tersedia sesuai peran serta status.
- Item terkunci setelah status bukan `menunggu`; form edit hanya mengirim data
  header pada kondisi tersebut.
- Order `selesai`/`dibatalkan` tidak dapat diubah dan hanya dapat diarsipkan
  oleh admin.
- Papan antrean menampilkan kolom `Menunggu`, `Cutting`, `Jahit`, `Finishing`,
  dan `QC` beserta jumlah order dan total kuantitas per tahap.
- Pencarian antrean mencakup kode, model, pelanggan, dan catatan. Kartu
  menampilkan deadline, PIC, dan progress; klik kartu membuka detail.
- Papan dapat digeser horizontal pada layar sempit.

### Bahan dan aksesoris

- Ringkasan inventori dan banner restock memakai data global bahan aktif, bukan
  hasil filter tabel.
- Filter daftar mencakup pencarian, kategori, status stok, kebutuhan restock,
  dan status aktif/nonaktif.
- Admin dapat menambah bahan, mengubah master, mengaktifkan/nonaktifkan bahan,
  serta mencatat stok masuk, keluar, dan penyesuaian.
- Operator hanya dapat mencatat stok masuk dan keluar pada bahan aktif; QC hanya
  membaca daftar, detail, dan riwayat.
- Form menampilkan stok awal saat membuat bahan dan mengunci SKU/satuan setelah
  bahan memiliki mutasi.
- Detail bahan menampilkan saldo, unit, status, minimum, jumlah mutasi,
  progress, dan waktu pembaruan terakhir.
- Dialog mutasi menampilkan pratinjau saldo setelah aksi dan menolak saldo
  negatif sebelum request dikirim. Riwayat dimuat ulang setelah mutasi berhasil.
- Bahan nonaktif menampilkan banner khusus; tombol mutasi disembunyikan dan
  admin dapat mengaktifkannya kembali.

### Laporan produksi

- Halaman `/laporan` terbuka dengan periode tujuh hari terakhir. Periode memakai
  rentang inklusif; tanggal awal yang melebihi tanggal akhir ditolak sebelum
  request dikirim.
- Filter tahap berisi “Semua tahap”, Cutting, Jahit, Finishing, dan QC. Saat
  satu tahap dipilih, rekap tahap disembunyikan karena semua baris sudah
  mewakili tahap tersebut.
- Detail order menyediakan tautan “Lihat Laporan” yang membuka `/laporan`
  dengan `order_id`, `order_code`, `start_date` (tanggal order dibuat dalam
  WIB), dan `end_date` (hari ini). Saat `order_id` aktif, banner “Filter
  perintah aktif” tampil dan seluruh KPI, rekap, tabel, serta export dibatasi
  ke order tersebut.
- Tombol “Tampilkan semua” pada banner menghapus filter perintah dan kembali ke
  `/laporan`. Tombol “Atur ulang” mengembalikan periode tujuh hari terakhir,
  tahap “Semua tahap”, filter perintah, dan ukuran halaman 20.
- Empat KPI menampilkan total output, total reject, rasio reject, dan jumlah
  order unik yang memiliki log.
- Rekap harian hanya menampilkan tanggal yang memiliki log dan menyertakan baris
  total periode. Rekap tahap selalu menampilkan empat tahap, termasuk nilai nol.
- Tabel log mendukung pagination 20/50/100 baris dan menampilkan status order,
  pelanggan, tahap, output, reject, rasio, pencatat, dan catatan.
- Order terarsip tetap tampil dengan badge `Diarsipkan` dan kode tanpa tautan
  detail; order aktif menaut ke `/perintah-produksi/[id]`.
- Empty state muncul saat tidak ada log pada filter aktif dan tombol export
  dinonaktifkan.
- Export mengunduh berkas melalui `Blob` dan anchor sementara, bukan tautan
  langsung, agar cookie sesi dan refresh otomatis tetap dipakai. Backend
  mengirim seluruh baris hasil filter tanpa mengikuti pagination tabel.
- Filter, KPI, dan panel rekap bertumpuk pada layar sempit; tabel lebar dapat
  digeser horizontal di dalam panel.

### Pelanggan dan produk

- `/pelanggan` dan `/produk` dapat dibuka semua peran; tombol tambah, ubah, dan
  nonaktifkan hanya tampil untuk admin.
- Pencarian memakai debounce 300 ms, filter status default `aktif`, dan
  pagination 10 baris di server.
- Form menormalkan kode menjadi huruf besar, memvalidasi panjang field dan email,
  serta menampilkan pesan API tanpa menutup dialog saat gagal.
- Nonaktifkan memakai dialog konfirmasi; data tetap tersimpan dan dapat
  diaktifkan kembali dari filter `nonaktif` atau `semua`.

### Pengguna

- `/pengguna` hanya dapat diakses admin; peran lain yang membuka langsung melihat
  empty state “Akses terbatas”, dan API tetap menolak dengan `403`.
- Admin dapat menambah akun, mengubah nama/email/peran/status, mereset sandi,
  serta mengaktifkan atau menonaktifkan akun.
- Form tambah mewajibkan kata sandi minimal 8 karakter yang memuat huruf dan
  angka beserta konfirmasinya.
- Peran dan status akun sendiri tidak dapat diubah. Reset sandi akun sendiri
  diizinkan, lalu frontend memanggil logout agar pengguna masuk kembali dengan
  kata sandi baru.
- Deaktivasi, perubahan peran, dan reset sandi menampilkan konsekuensi
  pencabutan sesi pada dialog.

## Guard dan konsistensi

- `lib/workflow.ts` menjadi sumber aturan transisi, ringkasan log tahap,
  progress siklus, serta guard ubah/arsip di sisi klien.
- Item order terkunci setelah status bukan `menunggu`. Form edit hanya mengirim
  data header pada kondisi tersebut.
- Order `selesai`/`dibatalkan` tidak dapat diubah dan hanya dapat diarsipkan
  oleh admin.
- Transisi yang bentrok mengembalikan `409`: dialog ditutup, toast menjelaskan
  data sudah berubah, lalu detail dimuat ulang.
- Dialog transisi dan log dipasang hanya saat terbuka sehingga state form selalu
  bersih tanpa reset di effect.
- Form bahan dan dialog status juga dipasang hanya saat terbuka; form mutasi
  di-mount ulang setiap kali dibuka agar saldo awal selalu segar.
- Aksi stok mengikuti peran dan status aktif bahan: admin/operator untuk
  masuk/keluar, admin untuk penyesuaian, dan tidak ada aksi pada bahan nonaktif.
- SKU dan satuan dinonaktifkan di form setelah `movement_count > 0`; API tetap
  menolak perubahan dengan `409`.
- Mutasi yang gagal karena stok tidak cukup, bahan nonaktif, atau payload tidak
  valid menampilkan pesan API di dialog tanpa menutup form.
- Semua guard frontend bersifat UX; API tetap memvalidasi peran, status, saldo,
  dan kuantitas.

## Design system

- Aksen utama: `#FF5B00` (gradient `#FF6A14 → #FF5B00`).
- Sidebar: `#16181D`, lebar 240px / rail 72px.
- Header: 60px, border `#E5E7EB`.
- Kanvas: `#F8F9FA`, surface `#FFFFFF`.
- Teks: `#111827` / muted `#6B7280` / subtle `#9CA3AF`.
- Radius: kartu 18px, section 14px, tombol 14px, nav 10px.
- Font: Plus Jakarta Sans (400–800).
- Spacing utama: kelipatan 4px; padding konten 24px desktop, 16px tablet.

Nilai tersebut tersedia sebagai CSS variable di `src/styles/tokens.css` dan
didokumentasikan di halaman Fondasi. Halaman Komponen dan Pola menjadi rujukan
pola UI; menu sidebar untuk dokumentasi ini dikendalikan `SHOW_DEV_NAV`.

## Verifikasi

Dari `frontend/`:

```powershell
npm run typecheck
npm run lint
npm run build
```

Ketiganya harus lulus sebelum perubahan frontend digabung. Perilaku utama juga
diuji lewat smoke test Playwright:

```powershell
npx playwright install chromium
npm run test:e2e
```

Prasyarat E2E: backend berjalan di `http://localhost:8000` dan database sudah
di-seed. Playwright menjalankan dev server Next.js di `http://localhost:3000`
secara otomatis. Bila ingin memakai server yang sudah berjalan, set
`E2E_BASE_URL`; kredensial admin dapat diganti melalui `E2E_ADMIN_EMAIL` dan
`E2E_ADMIN_PASSWORD`. Alur yang diuji membuat order, mencatat log, melakukan
transisi status, membuka laporan terfilter, lalu mengunduh CSV.

Workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) menjalankan
tes backend, typecheck/lint/build frontend, dan E2E pada setiap push ke `main`
serta pull request. Baseline saat README ini diperbarui: 123 tes backend lulus,
`ruff check .` bersih, seluruh pemeriksaan frontend lulus, dan smoke test E2E
lulus.

## Build dan deploy

```powershell
npm ci
npm run build
npm run start
```

- Gunakan Node.js 20.9+.
- Set `API_PROXY_URL` dan `NEXT_PUBLIC_API_URL` sebelum build. Keduanya
  memengaruhi hasil build; build ulang setelah nilainya berubah.
- `npm run start` menjalankan hasil build pada port default 3000.
- Konfigurasi same-origin melalui rewrite Next.js direkomendasikan agar cookie
  sesi tetap sederhana. Jika API dipanggil langsung, sesuaikan `CORS_ORIGINS`
  backend dan atribut cookie.
- Tidak ada Dockerfile frontend di repositori ini; deployment frontend mengikuti
  platform atau reverse proxy yang dipakai tim.
- Gunakan `/api/health` pada backend untuk health check API. Halaman `/login`
  dapat dipakai untuk memastikan frontend merespons.

## Troubleshooting

| Gejala | Penyebab umum | Tindakan |
| --- | --- | --- |
| Turbopack gagal dengan "not a valid Win32 application" | Paket native `@next/swc-win32-x64-msvc` terunduh tidak lengkap | `npm cache clean --force`, lalu `npm install` ulang |
| `502` atau API tidak dapat dihubungi | Backend mati atau `API_PROXY_URL` salah | Jalankan backend dan periksa nilai `API_PROXY_URL` |
| Login berhasil tetapi kembali ke halaman login | Cookie tidak terkirim, `COOKIE_SECURE=true` di HTTP, atau CORS salah | Periksa konfigurasi cookie backend, `CORS_ORIGINS`, dan mode same-origin |
| Perubahan env tidak berpengaruh | Dev server belum restart atau build belum ulang | Restart `npm run dev`, atau build ulang untuk produksi |
| E2E gagal saat login atau memuat data | Backend tidak berjalan atau database belum di-seed | Jalankan API di `http://localhost:8000`, lalu `alembic upgrade head` dan `python -m app.seed` |
| E2E gagal dengan “Executable doesn't exist” | Browser Playwright belum dipasang | Jalankan `npx playwright install chromium` |
| `/pengguna` menampilkan “Akses terbatas” | Pengguna bukan admin | Gunakan akun admin; API memang menolak dengan `403` |
| `/order-produksi` berpindah ke `/perintah-produksi` | Redirect permanen lama | Perilaku ini memang disengaja |

## Tautan

- [README utama](../README.md)
- [README backend](../backend/README.md)
- [Roadmap](../ROADMAP.md)
- [Swagger lokal](http://localhost:8000/docs)
