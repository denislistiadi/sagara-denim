# Sagara Denim — Frontend

Aplikasi Next.js untuk antarmuka manajemen produksi Sagara Denim. Tahap **M3**
menghubungkan login, guard sesi, pengelolaan Perintah Produksi, papan antrean,
transisi status, dan production log ke API. Dokumentasi lengkap ada di
[`../README.md`](../README.md) dan panduan backend di
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
│  ├─ orders/                 # workspace, form, detail, stepper, aksi, dialog
│  ├─ queue/                  # papan kanban dan kartu antrean
│  ├─ layout/                 # shell, sidebar, header, user menu
│  └─ ui/                     # primitif design system
├─ lib/
│  ├─ api/                    # client, auth, katalog, perintah produksi
│  ├─ labels.ts               # label dan opsi bahasa Indonesia
│  ├─ navigation.ts           # menu dan metadata halaman
│  ├─ workflow.ts             # aturan transisi, ringkasan log, dan guard
│  └─ format.ts               # angka, tanggal, dan waktu WIB
└─ styles/                    # token, shell, auth, orders, queue, komponen
```

Komponen M3 yang utama:

| Komponen | Fungsi |
| --- | --- |
| `components/queue/production-queue-board.tsx` | Papan lima kolom, pencarian, filter prioritas, skeleton, dan error state |
| `components/queue/queue-card.tsx` | Kartu order: kode, model, pelanggan, kuantitas, progress, deadline, PIC |
| `components/orders/workflow-stepper.tsx` | Stepper `menunggu → selesai` dan penanda pembatalan |
| `components/orders/order-workflow-actions.tsx` | Tombol transisi, catat log, ubah, dan arsip sesuai peran/status |
| `components/orders/status-transition-dialog.tsx` | Konfirmasi transisi, validasi alasan, ringkasan log tahap |
| `components/orders/production-log-dialog.tsx` | Input output/reject, tanggal, catatan, dan validasi sisa kuantitas |

## Rute

| Rute | Isi |
| --- | --- |
| `/login` | Masuk; satu-satunya rute publik |
| `/` | Dashboard Produksi (data contoh) |
| `/perintah-produksi` | Daftar, filter, pagination, buat, ubah, arsip |
| `/perintah-produksi/[id]` | Detail, item, stepper, aksi workflow, timeline, log |
| `/antrean-produksi` | Papan kanban order aktif per tahap produksi |
| `/bahan`, `/laporan` | Placeholder |
| `/design-system/*` | Dokumentasi developer, tetap di balik login |

Rute lama `/order-produksi` dialihkan permanen ke `/perintah-produksi` melalui
`next.config.ts`. Halaman di route group `(app)` memakai
`export const instant = false;` agar navigasi tetap memvalidasi sesi.

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
| `lib/api/orders.ts` | CRUD perintah, queue, transisi status, dan log produksi |

Fungsi M3 yang diekspor dari `lib/api/orders.ts`:

- `getProductionQueue(filters)` memuat antrean lima tahap dengan filter
  `search`, `priority`, dan `limit_per_stage`.
- `transitionProductionOrder(id, payload)` mengirim `expected_status`,
  `to_status`, dan `notes` ke endpoint status.
- `createProductionLog(id, payload)` menyimpan `log_date`, `output_qty`,
  `reject_qty`, dan `notes`.

Daftar perintah produksi memakai pagination dan filter server-side. Form
mendukung beberapa model dalam satu perintah dengan pelanggan opsional.

## Alur UI M3

**Operator**

- Order `menunggu` menampilkan tombol “Mulai Cutting”.
- Setelah produksi berjalan, item dikunci; pelanggan, prioritas, deadline, dan
  catatan header masih dapat diubah.
- Operator mencatat log tahap Cutting, Jahit, dan Finishing. Transisi maju
  menunggu minimal satu log pada tahap berjalan.
- Pembatalan hanya tersedia saat order masih `menunggu`.

**QC**

- Order `qc` menampilkan “Selesaikan Produksi” dan opsi rework ke Jahit atau
  Finishing.
- QC mencatat log tahap QC sebelum menyelesaikan atau me-rework order.
- Rework dan pembatalan wajib menyertakan alasan yang tersimpan di timeline.

**Admin**

- Dapat menjalankan seluruh aksi operator dan QC.
- Dapat membatalkan order aktif dengan alasan.
- Tombol arsip hanya tampil untuk order `selesai` atau `dibatalkan`.

**Antrean Produksi**

- Papan kanban menampilkan kolom `Menunggu`, `Cutting`, `Jahit`, `Finishing`,
  dan `QC` beserta jumlah order dan total kuantitas per tahap.
- Pencarian mencakup kode, model, pelanggan, dan catatan. Filter prioritas dan
  tombol reset tersedia di toolbar.
- Kartu menampilkan deadline (ditandai terlambat bila lewat), PIC, dan progress
  tahap. Klik kartu untuk membuka detail order.
- Papan dapat digeser horizontal pada layar sempit; kolom tidak bertumpuk.

## Guard dan penguncian

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
- Semua guard frontend bersifat UX; API tetap memvalidasi peran, status, dan
  kuantitas.

## Verifikasi

```bash
npm run typecheck
npm run lint
npm run build
```

Ketiganya harus lulus sebelum perubahan frontend digabung.
