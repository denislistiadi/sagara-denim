# Sagara Denim — Frontend

Aplikasi Next.js untuk antarmuka manajemen produksi Sagara Denim. Tahap **M6**
menghubungkan dashboard real dari database serta halaman CRUD pelanggan,
produk, dan pengguna ke API, di samping modul M3–M5 yang sudah ada. Tidak ada
dependency baru pada M6. Dokumentasi lengkap ada di
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
│  ├─ dashboard/              # KPI, chart, pipeline, deadline, stok kritis
│  ├─ orders/                 # workspace, form, detail, stepper, aksi, dialog
│  ├─ queue/                  # papan kanban dan kartu antrean
│  ├─ materials/              # daftar, detail, form, aksi stok, riwayat
│  ├─ reports/                # filter, ringkasan, rekap, log, dan export
│  ├─ catalog/                # pelanggan, produk, form, tabel, dialog status
│  ├─ users/                  # pengguna, form, reset sandi, tabel
│  ├─ layout/                 # shell, sidebar, header, user menu
│  └─ ui/                     # primitif design system
├─ lib/
│  ├─ api/                    # client, auth, dashboard, katalog, pengguna, order, bahan, laporan
│  ├─ labels.ts               # label dan opsi bahasa Indonesia
│  ├─ materials.ts            # guard peran dan helper status stok
│  ├─ users.ts                # guard admin dan kebijakan kata sandi
│  ├─ navigation.ts           # menu dan metadata halaman
│  ├─ workflow.ts             # aturan transisi, ringkasan log, dan guard
│  └─ format.ts               # angka, kuantitas, tanggal, dan waktu WIB
└─ styles/                    # token, shell, auth, orders, queue, materials, reports, dashboard
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

Komponen M4 yang utama:

| Komponen | Fungsi |
| --- | --- |
| `components/materials/material-workspace.tsx` | Daftar bahan, ringkasan, banner restock, filter, pagination, form, dan dialog status |
| `components/materials/material-table.tsx` | Tabel bahan, badge status, dan aksi sesuai peran |
| `components/materials/material-form-dialog.tsx` | Tambah/ubah master, stok awal, kategori, dan penguncian SKU/satuan |
| `components/materials/material-detail-screen.tsx` | Detail bahan, aksi master, dialog mutasi, dan pemuatan ulang data |
| `components/materials/stock-hero.tsx` | Saldo besar, status, progress terhadap minimum, dan tombol mutasi |
| `components/materials/stock-movement-dialog.tsx` | Form masuk/keluar/penyesuaian, pratinjau saldo, dan tautan order |
| `components/materials/stock-movement-history.tsx` | Riwayat mutasi, filter tipe, pagination, dan tautan perintah produksi |

Komponen M5 yang utama:

| Komponen | Fungsi |
| --- | --- |
| `components/reports/report-workspace.tsx` | State filter, pemuatan data, export, dan penyusunan halaman laporan |
| `components/reports/report-filters.tsx` | Rentang tanggal, filter tahap, dan tombol atur ulang |
| `components/reports/report-summary.tsx` | Empat KPI: output, reject, rasio reject, dan order tercatat |
| `components/reports/report-daily-table.tsx` | Rekap per tanggal log beserta total periode |
| `components/reports/report-stage-table.tsx` | Rekap empat tahap dalam urutan tetap |
| `components/reports/report-log-table.tsx` | Tabel log, badge status/tahap, penanda arsip, dan pagination |
| `components/reports/export-report-button.tsx` | Tombol export dengan state loading dan disabled |

Komponen M6 yang utama:

| Komponen | Fungsi |
| --- | --- |
| `components/dashboard/dashboard-workspace.tsx` | Memuat `GET /api/dashboard`, menyusun KPI, chart, pipeline, deadline, dan stok kritis |
| `components/dashboard/kpi-card.tsx` | Kartu indikator dengan nilai, satuan, subteks, dan tren opsional |
| `components/dashboard/bar-chart.tsx` | Output harian tujuh hari dari data live |
| `components/dashboard/donut-chart.tsx` | Komposisi reject empat tahap |
| `components/dashboard/pipeline-card.tsx` | Distribusi order aktif per tahap |
| `components/dashboard/deadline-card.tsx` | Deadline terdekat dengan penanda terlambat |
| `components/dashboard/stock-card.tsx` | Bahan aktif di bawah batas aman |
| `components/catalog/customer-workspace.tsx` | Daftar, filter, pencarian, pagination, form, dan status pelanggan |
| `components/catalog/product-workspace.tsx` | Daftar, filter, pencarian, pagination, form, dan status produk |
| `components/catalog/customer-form-dialog.tsx` | Tambah/ubah pelanggan dengan validasi kode, email, dan status |
| `components/catalog/product-form-dialog.tsx` | Tambah/ubah model produk beserta ukuran, warna, dan deskripsi |
| `components/catalog/catalog-deactivate-dialog.tsx` | Konfirmasi nonaktifkan/aktifkan data master |
| `components/users/user-workspace.tsx` | Daftar pengguna admin-only, form, reset sandi, dan status akun |
| `components/users/user-form-dialog.tsx` | Tambah/ubah pengguna, peran, dan status dengan proteksi akun sendiri |
| `components/users/reset-password-dialog.tsx` | Penetapan kata sandi baru dan peringatan pencabutan sesi |
| `components/users/user-table.tsx` | Tabel pengguna, badge peran/status, dan aksi sesuai akun |

## Rute

| Rute | Isi |
| --- | --- |
| `/login` | Masuk; satu-satunya rute publik |
| `/` | Dashboard Produksi live dari `GET /api/dashboard` |
| `/perintah-produksi` | Daftar, filter, pagination, buat, ubah, arsip |
| `/perintah-produksi/[id]` | Detail, item, stepper, aksi workflow, timeline, log |
| `/antrean-produksi` | Papan kanban order aktif per tahap produksi |
| `/bahan` | Daftar bahan, ringkasan inventori, banner restock, filter, form master |
| `/bahan/[id]` | Detail bahan, saldo, aksi stok, informasi master, dan riwayat mutasi |
| `/pelanggan` | Daftar, filter, tambah, ubah, dan nonaktifkan pelanggan |
| `/produk` | Daftar, filter, tambah, ubah, dan nonaktifkan model produk |
| `/pengguna` | Daftar, tambah, ubah, reset sandi, dan nonaktifkan pengguna (admin) |
| `/laporan` | Laporan produksi: filter periode/tahap, KPI, rekap harian/tahap, log, export CSV |
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
  transparan saat menerima `401`, lalu mengulang request satu kali. Jalur ini
  juga dipakai unduhan CSV melalui `apiDownload`.
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
| `lib/api/dashboard.ts` | Ringkasan dashboard |
| `lib/api/catalog.ts` | CRUD pelanggan/produk dan pilihan katalog |
| `lib/api/users.ts` | CRUD pengguna, reset sandi, dan nonaktifkan akun |
| `lib/api/orders.ts` | CRUD perintah, queue, transisi status, dan log produksi |
| `lib/api/materials.ts` | Daftar/detail bahan, master, dan mutasi stok |
| `lib/api/reports.ts` | Laporan produksi dan unduhan CSV |

Fungsi M3 yang diekspor dari `lib/api/orders.ts`:

- `getProductionQueue(filters)` memuat antrean lima tahap dengan filter
  `search`, `priority`, dan `limit_per_stage`.
- `transitionProductionOrder(id, payload)` mengirim `expected_status`,
  `to_status`, dan `notes` ke endpoint status.
- `createProductionLog(id, payload)` menyimpan `log_date`, `output_qty`,
  `reject_qty`, dan `notes`.

Daftar perintah produksi memakai pagination dan filter server-side. Form
mendukung beberapa model dalam satu perintah dengan pelanggan opsional.

Fungsi M4 yang diekspor dari `lib/api/materials.ts`:

- `listMaterials(filters)` memuat daftar bahan beserta ringkasan inventori.
- `getMaterial(id)` memuat detail bahan.
- `createMaterial(payload)` dan `updateMaterial(id, payload)` menyimpan master.
- `listMaterialMovements(id, filters)` memuat riwayat dengan filter tipe.
- `createMaterialMovement(id, payload)` mencatat masuk, keluar, atau
  penyesuaian dan mengembalikan saldo sebelum/sesudah.

Nilai Decimal dipertahankan sebagai `string` di tipe frontend. Konversi angka
hanya dilakukan lewat helper `toNumber`/`formatQuantity` setelah divalidasi.

Fungsi M5 yang diekspor dari `lib/api/reports.ts`:

- `getProductionReport(query, { signal })` memuat ringkasan, rekap harian,
  rekap tahap, dan satu halaman log sesuai `start_date`, `end_date`, `stage`,
  `page`, dan `page_size`. `signal` dipakai untuk membatalkan request lama saat
  filter berubah.
- `downloadProductionReportCsv(query)` mengunduh seluruh baris hasil filter
  sebagai `Blob`, membaca nama berkas dari `Content-Disposition`, dan memakai
  nama cadangan bila header tidak tersedia.

`apiDownload` di `lib/api/client.ts` memakai jalur refresh yang sama dengan
request JSON, sehingga export tetap berhasil setelah access token kedaluwarsa.

Fungsi M6 yang diekspor:

- `getDashboard()` di `lib/api/dashboard.ts` memuat seluruh ringkasan dashboard
  dalam satu request.
- `lib/api/catalog.ts` menyediakan `listCustomers`, `getCustomer`,
  `createCustomer`, `updateCustomer`, `deactivateCustomer`, serta pasangan
  produknya. Fungsi daftar menerima `page`, `page_size`, `search`, dan `active`.
- `lib/api/users.ts` menyediakan `listUsers`, `createUser`, `updateUser`,
  `resetUserPassword`, dan `deactivateUser`; seluruhnya hanya dipakai halaman
  admin.
- `lib/users.ts` memuat `canManageUsers` dan `passwordPolicyError` agar validasi
  kebijakan kata sandi konsisten antara form tambah dan reset sandi.
- Opsi pelanggan, produk, dan PIC untuk form order tetap memakai
  `catalogApi.customers()`, `catalogApi.products()`, dan `catalogApi.users()`.

## Alur UI M6

**Dashboard**

- Halaman `/` memuat data live saat dibuka dan menampilkan skeleton saat
  pemuatan awal. Kegagalan API menampilkan empty state dengan tombol coba lagi,
  bukan data contoh.
- Empat KPI: order aktif, output hari ini, reject rate, dan On-Time Delivery
  30 hari. Nilai On-Time Delivery tampil sebagai `—` bila belum ada order selesai
  yang memenuhi syarat.
- Output harian tujuh hari, komposisi reject empat tahap, pipeline lima status,
  deadline terdekat, dan stok kritis mengikuti kontrak `GET /api/dashboard`.
- Tombol “Lihat Perintah Produksi” dan tautan panel mengarah ke modul terkait.

**Pelanggan dan produk**

- `/pelanggan` dan `/produk` dapat dibuka semua peran; tombol tambah, ubah, dan
  nonaktifkan hanya tampil untuk admin.
- Pencarian memakai debounce 300 ms, filter status default `aktif`, dan
  pagination 10 baris di server.
- Form menormalkan kode menjadi huruf besar, memvalidasi panjang field dan email,
  serta menampilkan pesan API tanpa menutup dialog saat gagal.
- Nonaktifkan memakai dialog konfirmasi; data tetap tersimpan dan dapat
  diaktifkan kembali dari filter `nonaktif` atau `semua`.

**Pengguna**

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

## Alur UI M5

**Periode dan filter**

- Halaman `/laporan` terbuka dengan periode tujuh hari terakhir.
- Periode memakai rentang inklusif; tanggal awal yang melebihi tanggal akhir
  ditolak sebelum request dikirim.
- Filter tahap berisi “Semua tahap”, Cutting, Jahit, Finishing, dan QC. Saat
  satu tahap dipilih, rekap tahap disembunyikan karena semua baris sudah
  mewakili tahap tersebut.
- Tombol “Atur ulang” mengembalikan periode tujuh hari terakhir, tahap “Semua
  tahap”, dan ukuran halaman 20.

**Ringkasan dan tabel**

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

**Export CSV**

- Tombol export mengunduh berkas melalui `Blob` dan anchor sementara, bukan
  tautan langsung, agar cookie sesi dan refresh otomatis tetap dipakai.
- Nama berkas mengikuti
  `laporan-produksi-YYYY-MM-DD_YYYY-MM-DD[-stage].csv`.
- Backend mengirim delimiter `;`, BOM UTF-8, CRLF, dan koma desimal; seluruh
  baris hasil filter disertakan tanpa mengikuti pagination tabel.
- Semua peran dapat membuka halaman dan mengekspor; tidak ada aksi tulis pada
  modul laporan.

**Responsive**

- Filter, KPI, dan panel rekap bertumpuk pada layar sempit.
- Tabel lebar dapat digeser horizontal di dalam panel tanpa memotong halaman.
- Skeleton tampil saat pemuatan awal, dan error API ditampilkan sebagai banner
  tanpa menghilangkan filter aktif.

## Alur UI M4

**Status stok**

- `habis` bila saldo ≤ 0, `kritis` bila saldo ≤ 50% minimum, `menipis` bila di
  bawah minimum, dan `aman` bila memenuhi minimum.
- Ringkasan inventori dan banner restock di `/bahan` memakai data global bahan
  aktif, bukan hasil filter tabel.
- Filter daftar mencakup pencarian, kategori, status stok, kebutuhan restock,
  dan status aktif/nonaktif.

**Admin**

- Dapat menambah bahan, mengubah master, serta mengaktifkan atau menonaktifkan
  bahan.
- Dapat mencatat stok masuk, stok keluar, dan penyesuaian. Penyesuaian wajib
  memiliki alasan.
- Form menampilkan stok awal saat membuat bahan dan mengunci SKU/satuan setelah
  bahan memiliki mutasi.

**Operator**

- Dapat mencatat stok masuk dan stok keluar pada bahan aktif.
- Tidak melihat aksi tambah/ubah/nonaktifkan maupun penyesuaian.
- Stok keluar boleh ditautkan ke perintah produksi melalui combobox opsional.

**QC**

- Hanya dapat melihat daftar, detail, dan riwayat mutasi.
- Tidak melihat tombol mutasi, ubah master, atau ubah status bahan.

**Detail bahan**

- Hero menampilkan saldo, unit, status, minimum, jumlah mutasi, progress, dan
  waktu pembaruan terakhir.
- Dialog mutasi menampilkan pratinjau saldo setelah aksi dan menolak saldo
  negatif sebelum request dikirim.
- Riwayat memuat ulang otomatis setelah mutasi berhasil. Riwayat tidak memiliki
  aksi ubah atau hapus.
- Bahan nonaktif menampilkan banner khusus; tombol mutasi disembunyikan dan
  admin dapat mengaktifkannya kembali dari header.

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

## Verifikasi

```bash
npm run typecheck
npm run lint
npm run build
```

Ketiganya harus lulus sebelum perubahan frontend digabung.
