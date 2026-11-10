# Arsitektur Platform Produksi

Dokumen ini mengunci arsitektur produksi Sagara Denim untuk milestone M8.
Keputusan di sini menjadi dasar untuk Docker Compose, konfigurasi backend,
observability, keamanan operasional, dan siklus hidup data. Panduan langkah
operasional ada di [`operations.md`](operations.md).

## 1. Tujuan dan ruang lingkup

Sagara Denim adalah aplikasi internal untuk mengelola perintah produksi,
antrean lima tahap, inventori bahan, laporan, serta data master. Penggunanya
tiga peran (`admin`, `operator`, `qc`) dengan jumlah terbatas.

M8 menargetkan satu VPS Linux dengan Docker Compose. Fokusnya bukan skala
horizontal, melainkan:

- satu jalur deploy yang dapat diulang dan dipulihkan;
- kegagalan yang dapat dilacak dari request sampai log dan metrik;
- perlindungan login yang tidak bergantung pada satu alamat IP;
- backup yang benar-benar diuji, bukan script yang diasumsikan bekerja;
- batas keamanan yang jelas antara internet, edge, aplikasi, dan database.

## 2. Prinsip arsitektur

1. **Satu trust boundary publik.** Hanya Caddy yang menerima koneksi internet.
2. **Aplikasi stateless.** State bisnis berada di PostgreSQL; state operasional
   login berada di tabel dengan TTL.
3. **Satu request context.** Log dan metrik memakai context yang sama.
4. **Migrasi adalah fase deploy.** Bukan efek samping startup aplikasi.
5. **Rilis immutable.** Image dibangun sekali, dipromosikan dengan digest.
6. **Backup adalah siklus hidup.** Dump, checksum, retensi, dan restore test
   adalah satu paket.
7. **Least privilege.** Runtime database bukan owner skema.
8. **Fail fast.** Konfigurasi produksi yang tidak aman menolak start.

## 3. Konteks sistem (C4 level 1)

```text
 Pengguna internal            Operator/Admin            Uptime monitor
 (browser)                    (SSH tunnel)              (eksternal)
      │                            │                         │
      │ HTTPS                      │ akses Grafana           │ HTTPS health
      ▼                            ▼                         ▼
 ┌──────────────────────────────────────────────────────────────┐
 │                    VPS produksi Sagara Denim                  │
 │  Caddy → Next.js/FastAPI → PostgreSQL                         │
 │  Prometheus + Grafana (internal)                              │
 └──────────────────────────────────────────────────────────────┘
      ▲
      │ pull image digest
 GitHub Actions ── build/test/scan/SBOM ──▶ GHCR
```

## 4. Container view (C4 level 2)

```text
                         Internet
                            │ 80/443
                            ▼
                  ┌───────────────────┐
                  │ Caddy             │
                  │ TLS, HSTS, router │
                  │ access log JSON   │
                  └───────┬───────┬───┘
              /api/*      │       │      /*
                          ▼       ▼
                 ┌────────────┐ ┌─────────────┐
                 │ FastAPI    │ │ Next.js     │
                 │ :8000      │ │ standalone  │
                 │ internal   │ │ :3000       │
                 └─────┬──────┘ └─────────────┘
                       │ jaringan data internal
                       ▼
                 ┌────────────┐
                 │ PostgreSQL │
                 │ :5432      │
                 └─────┬──────┘
                       │
         ┌─────────────┴──────────────┐
         ▼                            ▼
 ┌────────────────┐          ┌────────────────────┐
 │ Backup job     │          │ Prometheus         │
 │ dump+checksum  │          │ Grafana (127.0.0.1)│
 │ retensi        │          │ node exporter      │
 └────────────────┘          └────────────────────┘
```

### Jaringan

| Jaringan | Anggota | Port publik |
| --- | --- | --- |
| `edge` | Caddy, backend, frontend | hanya Caddy 80/443 |
| `data` | backend, database, migrate, backup | tidak ada |
| `monitoring` | backend, Prometheus, Grafana, node-exporter | tidak ada |
| `ops` | Grafana | hanya `127.0.0.1:3001` |

- Backend memiliki IP statis di `edge` agar `--forwarded-allow-ips` hanya
  mempercayai Caddy.
- Database tidak pernah memiliki port host.
- `/api/metrics` diblokir Caddy dan hanya dapat diakses dari jaringan internal
  dengan bearer token.
- Grafana dual-homed: `monitoring` untuk scrape Prometheus, `ops` untuk
  mem-publish port host. Docker tidak dapat mem-publish port dari container yang
  hanya terhubung ke jaringan `internal: true`. Hanya Grafana yang boleh masuk
  `ops`; backend, database, dan Prometheus tetap internal.

## 5. Trust boundary

| Boundary | Yang boleh masuk | Yang tidak boleh |
| --- | --- | --- |
| Internet → Caddy | HTTPS 80/443 | akses langsung ke backend/frontend/database |
| Caddy → backend | `/api/*`, header proxy dari Caddy | header `X-Forwarded-For` dari klien |
| Browser → aplikasi | cookie `httpOnly` same-origin | token di JavaScript, CORS lintas origin |
| Backend → database | DML dengan role `sagara_app` | DDL dengan role runtime |
| Migrasi → database | DDL dengan role `sagara_owner` | akses runtime |
| Backup → database | baca dengan role `sagara_backup` | tulis data |

## 6. Model keamanan

### Autentikasi dan sesi

- Access token JWT berumur pendek di cookie `httpOnly`.
- Refresh token opak, dirotasi setiap refresh, disimpan sebagai hash.
- Deteksi pemakaian ulang refresh token mencabut seluruh sesi pengguna.
- Cookie `SameSite=Lax` dan `Secure` di produksi.
- Single origin berarti browser tidak membutuhkan CORS. `CORS_ORIGINS` kosong
  di produksi divalidasi saat start.

### CSRF

- `SameSite=Lax` menahan request lintas situs untuk metode tidak aman.
- Middleware origin menolak `POST/PUT/PATCH/DELETE` dengan header `Origin` yang
  tidak dikenal.
- Request tanpa `Origin` (misalnya health check internal atau CLI) tetap
  diizinkan; bukan jalur browser.

### Rate limit login

- Pembatas utama adalah email yang dinormalisasi, pembatas sekunder adalah IP
  klien dari Caddy.
- Kunci disimpan sebagai HMAC-SHA256 agar tabel operasional tidak menyimpan
  email/IP mentah.
- Respons selalu generik; tidak membocorkan apakah akun ada.
- State disimpan di PostgreSQL dengan `expires_at`; dapat dipindah ke Redis
  tanpa mengubah kontrak route.

### Secret

- Secret hanya disuntikkan saat runtime dari file environment yang tidak masuk
  repositori, dengan permission `600`.
- `deploy/check_env.sh` menolak placeholder dan nilai lemah sebelum deploy.
- Image tidak pernah memuat `.env`, kredensial, atau token.

### Database

| Role | Kegunaan | Hak |
| --- | --- | --- |
| `sagara_owner` | migrasi Alembic | owner database dan skema |
| `sagara_app` | runtime FastAPI | DML pada tabel, usage sequence |
| `sagara_backup` | `pg_dump` | SELECT pada tabel/sequence |

Migrasi baru otomatis memberi hak ke `sagara_app` dan `sagara_backup` melalui
`ALTER DEFAULT PRIVILEGES` yang dijalankan sebagai owner.

## 7. Observability contract

Satu middleware menghasilkan satu `RequestContext`:

```text
request_id, method, path, route_template, status_code, duration_ms
```

- `route_template` berasal dari route Starlette (misalnya
  `/api/production-orders/{order_id}`), bukan URL mentah. URL tak dikenal
  dipetakan ke `<unmatched>` agar cardinality tetap terbatas.
- Log access ditulis sebagai JSON ke stdout dan dibaca Docker.
- Health check diturunkan ke level DEBUG agar tidak membanjiri log.
- Metrik Prometheus memakai label terbatas: method, route template, status.
- Tidak ada email, user ID, atau query string di label metrik.

Metrik utama:

| Metrik | Tipe | Label |
| --- | --- | --- |
| `sagara_http_requests_total` | counter | `method`, `route`, `status` |
| `sagara_http_request_duration_seconds` | histogram | `method`, `route` |
| `sagara_http_requests_in_flight` | gauge | — |
| `sagara_db_pool_connections` | gauge | `state` |
| `sagara_login_failures_total` | counter | `scope` |
| `sagara_login_blocked_total` | counter | `scope` |

### Batas observability

Prometheus dan Grafana berada di VPS yang sama. Jika VPS mati, metrik dan
dashboard ikut hilang. Uptime monitor eksternal memeriksa
`https://<domain>/api/health/ready` dan menjadi sumber alert "host down".
Keputusan ini disengaja untuk P0.

## 8. Siklus hidup data

```text
PostgreSQL
   │ pg_dump -Fc
   ▼
dump + sha256
   │ retensi 7 harian + 4 mingguan (konfigurasi)
   ▼
BACKUP_DIR di VPS
   │
   ▼
verify_restore.sh → database scratch → cek tabel + alembic_version
```

- Backup lokal melindungi dari kesalahan SQL, migrasi gagal, dan bug data.
- Backup lokal **tidak** melindungi dari VPS hilang. Selama data masih pilot,
  risiko ini diterima dan dicatat.
- Sebelum data produksi nyata masuk, salinan off-host (object storage
  S3-compatible) menjadi gate wajib. Script sudah memakai `BACKUP_DIR` sebagai
  kontrak sehingga penambahan upload tidak mengubah arsitektur.
- Script juga menulis metrik ke `BACKUP_METRICS_DIR`
  (`/opt/sagara-backups/metrics/sagara_backup.prom`). `node-exporter` membacanya
  melalui textfile collector; alert `SagaraBackupStale` menyala jika backup
  terakhir lebih dari 26 jam.

## 9. Delivery dan migrasi

```text
Pull request
  → lint/test/typecheck/build
  → build image backend + frontend
  → Trivy scan HIGH/CRITICAL
  → backup/restore drill

Tag v*
  → build image immutable
  → SBOM + provenance
  → Trivy scan
  → push GHCR

Deploy manual
  → backup
  → jalankan migrate one-shot (owner)
  → rollout backend/frontend
  → smoke test
  → observasi 15 menit
```

Aturan migrasi:

- Expand-contract: versi lama harus tetap bisa berjalan dengan skema baru
  selama satu rilis.
- Migrasi berat memakai index `CONCURRENTLY` dan tidak mengunci tabel utama.
- Rollback utama adalah image sebelumnya, bukan `alembic downgrade`.
- Backup dijalankan sebelum migrasi; restore hanya jika migrasi merusak data.

## 10. Non-functional requirements

| Area | Target |
| --- | --- |
| Availability | 99,5%/bulan, diukur uptime monitor eksternal |
| RPO / RTO | 24 jam / 2 jam (selama VPS tersedia) |
| Login | 5 gagal/15 menit per email; 20/15 menit per IP; blokir 15 menit |
| Observability | request ID 100%, scrape 15 detik, retensi 15 hari |
| Release | deploy < 10 menit; rollback < 5 menit |
| Backup | verifikasi restore otomatis di CI + drill bulanan |
| Security | HTTPS, HSTS, docs API mati, image non-root |
| Data | aplikasi berjalan dengan skema N-1 selama jendela rilis |

## 11. ADR

### ADR-01 — Caddy sebagai satu-satunya edge publik

**Keputusan:** Caddy menangani TLS, redirect HTTP→HTTPS, HSTS, header keamanan,
timeout, routing, dan access log. Backend/frontend tidak mengekspos port host.

**Alasan:** Menghilangkan kelas risiko header proxy yang dipercaya dari klien.

**Konsekuensi:** `--forwarded-allow-ips` hanya berisi IP statis backend di
jaringan `edge`. Semua deployment wajib melewati Caddy.

### ADR-02 — Rate limit login identity-aware

**Keputusan:** Pembatas utama email, sekunder IP, di application layer.

**Alasan:** Serangan utama adalah credential stuffing per akun, bukan per IP.

**Konsekuensi:** Butuh tabel operasional `login_attempts` dan pembersihan TTL.
Implementasi dapat diganti Redis tanpa mengubah route auth.

### ADR-03 — Observability sebagai kontrak lintas-cutting

**Keputusan:** Satu `RequestContext` menghasilkan log dan metrik. Domain tidak
menulis metrik sendiri.

**Alasan:** Mencegah cardinality meledak dan inkonsistensi nama metrik.

**Konsekuensi:** Route template wajib tersedia; URL tak dikenal dipetakan ke
`<unmatched>`.

### ADR-04 — Migrasi sebagai fase deploy

**Keputusan:** Migrasi dijalankan container one-shot sebelum rollout aplikasi.

**Alasan:** Startup aplikasi tidak boleh berlomba menjalankan DDL.

**Konsekuensi:** Deploy membutuhkan role owner; rollback memakai image
sebelumnya, bukan downgrade sebagai jalur utama.

### ADR-05 — Rilis immutable

**Keputusan:** CI membangun image dengan tag versi dan digest; deploy memilih
digest; konfigurasi disuntikkan runtime.

**Alasan:** Artefak yang diuji sama dengan yang dipromosikan.

**Konsekuensi:** Secret tidak boleh masuk image; SBOM dan provenance melekat.

### ADR-06 — Backup sebagai siklus hidup

**Keputusan:** Dump + checksum + retensi + verifikasi restore adalah satu paket.

**Alasan:** Script tanpa restore test tidak membuktikan apa pun.

**Konsekuensi:** CI menjalankan drill; off-host menjadi ekstensi berbasis
artefak yang sama.

### ADR-07 — Least privilege database

**Keputusan:** Tiga role: owner, app, backup.

**Alasan:** Kerentanan aplikasi tidak boleh otomatis menjadi hak DDL.

**Konsekuensi:** Migrasi wajib menjaga default privileges untuk role app dan
backup.

### ADR-08 — Observability plane internal

**Keputusan:** Prometheus/Grafana di VPS yang sama, Grafana hanya `127.0.0.1`.

**Alasan:** Biaya dan operasional minimal untuk pilot.

**Konsekuensi:** Grafana dual-homed pada `monitoring` dan `ops` agar port host
dapat dipublikasikan; hanya Grafana yang boleh berada di `ops`. Host mati tidak
terdeteksi oleh Prometheus; uptime eksternal wajib aktif.

### ADR-09 — Single origin

**Keputusan:** Browser selalu memanggil domain yang sama; CORS hanya untuk
pengembangan.

**Alasan:** Cookie `SameSite` bekerja tanpa konfigurasi lintas origin.

**Konsekuensi:** Produksi menolak `CORS_ORIGINS` berisi origin lokal.

### ADR-10 — Staging lokal dari backup

**Keputusan:** Tidak ada VPS staging. Uji migrasi memakai restore backup ke
Compose lokal.

**Alasan:** Biaya operasional lebih kecil; data uji tetap representatif.

**Konsekuensi:** TLS dan jaringan VPS diuji saat deploy dengan checklist,
smoke test, dan rollback yang siap.

## 12. Risiko

| Risiko | Dampak | Kendali |
| --- | --- | --- |
| NAT kantor mengunci IP | Login sah bisa terblokir | Email utama, ambang IP longgar, delay, unlock |
| IP klien salah | Rate limit salah sasaran | Hanya Caddy publik, IP statis, forwarded allowlist |
| Metrik cardinality | Prometheus lambat | Route template + test 404 |
| Dockerfile Next.js menyimpang | Deploy gagal | Image dibangun di CI setiap PR |
| Restore tidak pernah diuji | Backup tidak berguna | Drill CI + drill bulanan |
| Migrasi merusak rilis | Downtime/data rusak | Backup, expand-contract, rollback image |
| VPS hilang saat pilot | Data hilang permanen | Risiko diterima; off-host gate sebelum data nyata |
| Monitoring ikut mati | Host down tidak terdeteksi | Uptime monitor eksternal |
| Secret bocor | Kompromi penuh | Runtime injection, permission 600, check_env |
| Backup menumpuk | Disk penuh | Retensi + alert disk |

## 13. Evolusi

| Kebutuhan | Titik ekstensi |
| --- | --- |
| Skala horizontal | Container stateless; rate limiter ber-interface |
| HA | Tambah load balancer dan replika PostgreSQL |
| Redis | Ganti implementasi `LoginRateLimiter` |
| Off-host backup | Tambah upload setelah checksum pada `BACKUP_DIR` |
| Tracing | Tambah OpenTelemetry pada `RequestContext` |
| CDN | Frontend standalone dapat dipisah dari backend |
| CSP ketat | Nonce di Next.js; header API sudah terpisah |

## 14. Di luar cakupan M8

HA multi-node, Redis, Kubernetes, PITR/WAL archiving, Sentry/OpenTelemetry,
CDN, CSP nonce, dan backup off-host. Keputusan untuk menunda dicatat agar tidak
menjadi utang yang tidak terlihat.
