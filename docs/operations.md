# Operasional Produksi

Panduan ini adalah runbook untuk menjalankan, merilis, memulihkan, dan
mengamati Sagara Denim di VPS produksi. Arsitektur dan keputusan yang mendasari
ada di [`architecture.md`](architecture.md).

## 1. Prasyarat VPS

- Linux x86_64 dengan Docker Engine 27+ dan Docker Compose v2.
- Minimal 2 vCPU, 4 GB RAM, 40 GB disk.
- Domain yang diarahkan ke IP VPS (A/AAAA).
- Port 80 dan 443 terbuka; port lain tertutup.
- Akses SSH dengan kunci, tanpa login password.
- `git`, `curl`, dan `cron` tersedia.

Struktur direktori yang dipakai:

```text
/opt/sagara-denim/          # checkout repositori
/opt/sagara-denim/deploy/.env.production
/opt/sagara-backups/        # dump + checksum (mode 711)
/opt/sagara-backups/metrics # metrik textfile (mode 755)
```

## 2. Bootstrap pertama

```bash
sudo mkdir -p /opt/sagara-denim /opt/sagara-backups/metrics
sudo chown "$USER":"$USER" /opt/sagara-denim
sudo chown root:root /opt/sagara-backups /opt/sagara-backups/metrics
sudo chmod 711 /opt/sagara-backups
sudo chmod 755 /opt/sagara-backups/metrics
git clone https://github.com/denislistiadi/sagara-denim.git /opt/sagara-denim
cd /opt/sagara-denim
cp deploy/.env.production.example deploy/.env.production
chmod 600 deploy/.env.production
```

Direktori dump dimiliki `root` karena container `backup` berjalan sebagai root
agar dapat menulis ke path host; dump dibuat dengan mode `600`. Direktori
`metrics` harus dapat ditelusuri `node-exporter` yang berjalan sebagai
`nobody`, sehingga memakai mode `755`. Jangan melonggarkan permission dump
menjadi dapat dibaca semua user.

Isi `deploy/.env.production`:

- `SAGARA_DOMAIN` dan `ACME_EMAIL`;
- `PUBLIC_ORIGIN=https://<domain>`;
- `SAGARA_BACKEND_IMAGE` dan `SAGARA_FRONTEND_IMAGE` (tag atau digest);
- password `POSTGRES_OWNER_PASSWORD`, `POSTGRES_APP_PASSWORD`,
  `POSTGRES_BACKUP_PASSWORD`;
- `JWT_SECRET` dan `METRICS_TOKEN` acak minimal 32 karakter;
- `BACKUP_HOST_DIR=/opt/sagara-backups` dan
  `BACKUP_METRICS_HOST_DIR=/opt/sagara-backups/metrics`;
- `GRAFANA_ADMIN_PASSWORD`.

Buat secret:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -hex 32      # METRICS_TOKEN
openssl rand -base64 24   # password database
openssl rand -base64 24   # GRAFANA_ADMIN_PASSWORD
```

Validasi sebelum menyalakan apa pun:

```bash
./deploy/check_env.sh deploy/.env.production
```

Perintah Compose selalu memakai file env eksplisit:

```bash
export COMPOSE="docker compose --env-file deploy/.env.production -f deploy/compose.prod.yml"
```

## 3. Database dan role

Pada volume database baru, container `db` menjalankan:

- `deploy/postgres/init-roles.sh` → `roles.sql`.

Role yang dibuat:

| Role | Dipakai oleh |
| --- | --- |
| `sagara_owner` | container `migrate`, administrasi |
| `sagara_app` | container `backend` |
| `sagara_backup` | container `backup` |

Jika database sudah ada sebelum role dibuat, jalankan script secara manual
sebagai superuser:

```bash
$COMPOSE exec -T db sh /docker-entrypoint-initdb.d/10-init-roles.sh
```

Verifikasi:

```bash
$COMPOSE exec -T db psql -U sagara_owner -d sagara_denim -c '\du'
```

## 4. Deploy pertama

```bash
$COMPOSE --profile ops pull
$COMPOSE up -d db
$COMPOSE --profile ops run --rm migrate
$COMPOSE up -d backend frontend caddy
$COMPOSE --profile monitoring up -d prometheus grafana node-exporter
```

Health check:

```bash
curl --fail https://<domain>/api/health/live
curl --fail https://<domain>/api/health/ready
curl --fail https://<domain>/login
```

Log:

```bash
$COMPOSE logs -f --tail=100 backend caddy
```

## 5. Rilis berikutnya

Image rilis dibuat oleh workflow
[`release.yml`](../.github/workflows/release.yml) saat tag `v*` didorong:

```bash
git tag -a v1.2.3 -m "Rilis 1.2.3"
git push origin v1.2.3
```

Workflow membangun image `linux/amd64` backend dan frontend, memindainya dengan
Trivy pada severity `HIGH`/`CRITICAL`, lalu mendorong ke GHCR dengan tag
semver, `sha-<commit>`, dan `latest` untuk tag non-prerelease. SBOM dan
provenance melekat pada image. Deploy tetap manual dan sebaiknya memakai digest,
bukan `latest`.

Ambil digest dari ringkasan workflow atau:

```bash
docker buildx imagetools inspect \
  ghcr.io/denislistiadi/sagara-denim/backend:v1.2.3 | grep Digest
docker buildx imagetools inspect \
  ghcr.io/denislistiadi/sagara-denim/frontend:v1.2.3 | grep Digest
```

Urutan wajib:

1. **Backup sebelum migrasi.**

   ```bash
   $COMPOSE --profile ops run --rm backup /scripts/backup_db.sh
   ls -lh /opt/sagara-backups
   ```

2. **Pilih image.** Set `SAGARA_BACKEND_IMAGE` dan `SAGARA_FRONTEND_IMAGE` ke
   digest rilis di `deploy/.env.production`, misalnya
   `ghcr.io/denislistiadi/sagara-denim/backend@sha256:<digest>`.

3. **Tarik image.**

   ```bash
   $COMPOSE --profile ops pull backend frontend migrate
   ```

4. **Jalankan migrasi one-shot.**

   ```bash
   $COMPOSE --profile ops run --rm migrate
   ```

5. **Rollout aplikasi.**

   ```bash
   $COMPOSE up -d backend frontend
   ```

6. **Smoke test.**

   ```bash
   curl --fail https://<domain>/api/health/ready
   curl --fail https://<domain>/login
   ```

7. **Observasi 15 menit.** Periksa 5xx, latency, login yang diblokir, dan metrik
   backup di Grafana.

## 6. Rollback

Rollback utama adalah mengembalikan image, bukan menjalankan
`alembic downgrade`.

```bash
# Set kembali tag/digest sebelumnya di deploy/.env.production
$COMPOSE pull backend frontend
$COMPOSE up -d backend frontend
curl --fail https://<domain>/api/health/ready
```

Migrasi mengikuti expand-contract sehingga image lama tetap dapat berjalan
dengan skema baru. Jika migrasi merusak data, hentikan aplikasi dan lakukan
restore dari backup ke database staging terlebih dahulu; jangan menimpa
produksi tanpa persetujuan.

## 7. Backup

Backup berjalan melalui container `backup` (profil `ops`):

```bash
$COMPOSE --profile ops run --rm backup /scripts/backup_db.sh
```

Variabel yang dipakai:

| Variabel | Arti |
| --- | --- |
| `BACKUP_DATABASE_URL` | koneksi role `sagara_backup` |
| `BACKUP_HOST_DIR` | direktori host untuk dump (wajib path absolut) |
| `BACKUP_METRICS_HOST_DIR` | direktori host untuk metrik textfile |
| `BACKUP_DIR` | direktori output di dalam container (default `/backups`) |
| `BACKUP_METRICS_DIR` | direktori metrik di dalam container (default `/metrics`) |
| `BACKUP_RETENTION_DAYS` | retensi dump harian (default 7) |
| `BACKUP_WEEKLY_RETENTION_DAYS` | retensi dump hari Minggu (default 28) |

Script menulis dump kustom terkompresi, checksum SHA-256, dan file metrik
`sagara_backup.prom`. Dump memakai mode `600`. Retensi harian menghapus dump
non-Minggu yang lebih tua dari `BACKUP_RETENTION_DAYS`, sedangkan dump Minggu
disimpan sampai `BACKUP_WEEKLY_RETENTION_DAYS`.

Contoh cron harian pukul 02.00 WIB:

```cron
0 2 * * * cd /opt/sagara-denim && docker compose --env-file deploy/.env.production -f deploy/compose.prod.yml --profile ops run --rm backup /scripts/backup_db.sh >> /var/log/sagara-backup.log 2>&1
```

Verifikasi otomatis:

```bash
$COMPOSE --profile ops run --rm backup /scripts/verify_restore.sh /backups/<nama>.dump
```

Script membuat database scratch, restore, memeriksa tabel `users`,
`production_orders`, dan `alembic_version`, lalu menghapus scratch.

### Metrik backup

File `/opt/sagara-backups/metrics/sagara_backup.prom` dibaca `node-exporter`
melalui textfile collector dan di-scrape Prometheus. Metrik yang tersedia:

| Metrik | Arti |
| --- | --- |
| `sagara_backup_last_success_timestamp_seconds` | waktu backup sukses terakhir |
| `sagara_backup_size_bytes` | ukuran dump terakhir |

Alert `SagaraBackupStale` aktif jika tidak ada backup sukses lebih dari 26 jam.
Jika alert ini menyala, periksa cron, permission direktori, dan log
`/var/log/sagara-backup.log` sebelum menjalankan backup manual.

### Drill bulanan

1. Unduh atau pilih dump terbaru.
2. Jalankan `verify_restore.sh`.
3. Catat waktu restore dan hasilnya di catatan operasional.
4. Jika drill gagal, perlakukan sebagai insiden data.

## 8. Restore ke staging lokal

Tidak ada VPS staging. Gunakan Compose lokal dengan data dari backup produksi.
Salin template lalu isi nilainya:

```bash
cp deploy/.env.local.example deploy/.env.local
export LOCAL_COMPOSE="docker compose --env-file deploy/.env.local -f deploy/compose.prod.yml -f deploy/compose.local.yml"
```

Letakkan dump dan checksum di `backups/` pada root repositori (path ini
diabaikan Git), lalu nyalakan database:

```bash
$LOCAL_COMPOSE up -d db
```

Restore dump ke database `sagara_denim_staging`:

```bash
$LOCAL_COMPOSE --profile ops run --rm backup \
  /scripts/restore_db.sh /backups/<nama>.dump
```

Jalankan migrasi dan smoke test:

```bash
$LOCAL_COMPOSE --profile ops run --rm migrate
$LOCAL_COMPOSE up -d backend frontend caddy
```

Untuk stack lokal kosong yang belum memiliki data, jalankan seed:

```bash
$LOCAL_COMPOSE run --rm -e ENVIRONMENT=development backend python -m app.seed
```

Staging lokal memakai `deploy/Caddyfile.local` dengan CA internal:

```text
https://sagara.localhost:8443
```

Browser akan memperingatkan sertifikat; ini hanya untuk pengujian lokal. Uji
dengan curl:

```bash
curl -k --resolve sagara.localhost:8443:127.0.0.1 \
  https://sagara.localhost:8443/api/health/ready
```

Grafana lokal tersedia di `http://127.0.0.1:3001` dengan kredensial dari
`deploy/.env.local`:

```bash
$LOCAL_COMPOSE --profile monitoring up -d prometheus grafana node-exporter
```

## 9. Observability

### Prometheus

```bash
$COMPOSE --profile monitoring up -d prometheus grafana node-exporter
```

Prometheus hanya ada di jaringan internal `monitoring`. Scrape:

```text
backend:8000/api/metrics
```

dengan bearer token dari Docker secret `metrics_token`. Caddy memblokir
`/api/metrics` dari publik. `node-exporter` juga membaca textfile backup dari
`/opt/sagara-backups/metrics`.

Grafana terhubung ke dua jaringan: `monitoring` (internal) untuk Prometheus dan
`ops` (non-internal) agar port host dapat dipublikasikan. Docker tidak dapat
mem-publish port dari container yang hanya terhubung ke network
`internal: true`. Jangan menambahkan backend, database, atau Prometheus ke
jaringan `ops`.

### Grafana

Grafana hanya mendengarkan `127.0.0.1:3001`. Akses melalui SSH tunnel:

```bash
ssh -L 3001:127.0.0.1:3001 user@vps
```

Buka `http://localhost:3001`. Login memakai `GRAFANA_ADMIN_USER` dan
`GRAFANA_ADMIN_PASSWORD`. Dashboard `Sagara Denim - Platform` dan datasource
Prometheus di-provision dari repositori.

### Uptime eksternal

Buat monitor HTTPS ke:

```text
https://<domain>/api/health/ready
```

Interval 1 menit, alert setelah 3 kegagalan. Monitor ini yang mendeteksi host
mati; Prometheus di host yang sama tidak bisa melakukannya.

### Alert yang harus ada

| Alert | Ambang |
| --- | --- |
| Host down | 3 kegagalan uptime |
| `SagaraBackendDown` | scrape gagal 2 menit |
| `SagaraHigh5xxRate` | > 2% selama 5 menit |
| `SagaraHighLatency` | p95 > 2 detik selama 10 menit |
| `SagaraLoginBlockedSpike` | > 20 blokir/menit selama 5 menit |
| `SagaraBackupStale` | tidak ada backup > 26 jam |
| `SagaraDiskHigh` | sisa disk < 20% |

## 10. Unlock login

Jika pengguna sah terblokir karena salah kata sandi berulang:

```bash
$COMPOSE exec -T backend \
  python scripts/unlock_login.py --email pengguna@example.com
```

Untuk IP:

```bash
$COMPOSE exec -T backend \
  python scripts/unlock_login.py --ip 203.0.113.10
```

Untuk semua:

```bash
$COMPOSE exec -T backend \
  python scripts/unlock_login.py --all
```

Tindakan ini hanya menghapus state rate limit, bukan mengubah kata sandi.

## 11. Insiden

### 5xx meningkat

1. Periksa `docker compose ps` dan `logs backend`.
2. Cek `/api/health/ready`; jika database gagal, cek container `db` dan disk.
3. Jika kesalahan berasal dari rilis terbaru, rollback image.
4. Catat waktu, dampak, dan tindakan.

### Database tidak dapat dihubungi

1. `docker compose ps db`; pastikan status healthy.
2. Cek `df -h` dan log PostgreSQL.
3. Jangan restart berulang tanpa membaca log.
4. Jika volume rusak, restore backup terbaru ke database baru.

### Disk penuh

1. `docker system df` dan `du -sh /opt/sagara-backups`.
2. Kurangi retensi backup atau hapus dump lama yang sudah diverifikasi.
3. `docker image prune` untuk image lama yang tidak dipakai.
4. Tambah alert disk sebelum mencapai 90%.

### Sertifikat TLS gagal

1. Pastikan DNS mengarah ke VPS.
2. Cek log Caddy: `docker compose logs caddy`.
3. Pastikan port 80/443 terbuka.
4. Jangan memaksa renewal berulang; tunggu rate limit Let's Encrypt.

### Host mati

1. Uptime monitor mengirim alert.
2. Akses provider, hidupkan VPS.
3. Jika VPS tidak dapat dipulihkan, bangun VPS baru, restore backup terakhir,
   lalu deploy image terakhir. Ini titik di mana backup lokal tidak cukup;
   salinan off-host wajib sebelum data produksi nyata.

### Restore darurat produksi

Restore ke database produksi adalah tindakan terakhir. Lakukan hanya setelah
insiden data dikonfirmasi dan mendapat persetujuan pemilik data. Restore
memakai `pg_restore --clean --if-exists`, sehingga objek database saat ini akan
diganti.

1. Hentikan trafik dan penulisan:

   ```bash
   $COMPOSE stop caddy backend frontend
   ```

2. Jika database masih dapat diakses, ambil backup pengaman sebelum menimpa:

   ```bash
   $COMPOSE --profile ops run --rm backup /scripts/backup_db.sh
   ```

3. Pilih dump terbaru yang checksum-nya valid. Jika waktu memungkinkan,
   verifikasi lebih dulu ke database scratch:

   ```bash
   $COMPOSE --profile ops run --rm backup \
     /scripts/verify_restore.sh /backups/<nama>.dump
   ```

4. Restore ke database produksi dengan flag darurat eksplisit:

   ```bash
   $COMPOSE --profile ops run --rm \
     -e RESTORE_ALLOW_NON_STAGING=1 \
     backup /scripts/restore_db.sh /backups/<nama>.dump
   ```

5. Jalankan migrasi bila image aplikasi lebih baru dari skema dump:

   ```bash
   $COMPOSE --profile ops run --rm migrate
   ```

6. Nyalakan layanan dan lakukan smoke test:

   ```bash
   $COMPOSE up -d backend frontend caddy
   curl --fail https://<domain>/api/health/ready
   curl --fail https://<domain>/login
   ```

7. Catat waktu dump, waktu restore, jumlah data yang hilang (RPO), dan tindakan
   pencegahan. Jangan menjalankan restore berulang tanpa analisis penyebab.

Jika volume database rusak dan container tidak dapat start, bangun ulang
container/volume database, biarkan `init-roles.sh` membuat role, lalu ulangi
restore ke database kosong. Gunakan snapshot VPS dari provider bila tersedia.

## 12. Checklist go-live

- [ ] DNS mengarah ke VPS dan port 80/443 terbuka.
- [ ] `check_env.sh` lulus.
- [ ] `deploy/.env.production` permission `600`, tidak masuk Git.
- [ ] `BACKUP_HOST_DIR` dan `BACKUP_METRICS_HOST_DIR` berupa path absolut dan
      permission direktori sudah benar.
- [ ] Role database terpisah dan diverifikasi.
- [ ] Migrasi berjalan sebagai `sagara_owner`.
- [ ] Image rilis memakai digest dari GHCR, bukan `latest`.
- [ ] `COOKIE_SECURE=true`, `DOCS_ENABLED=false`, `CORS_ORIGINS=[]`.
- [ ] `/api/metrics` tidak dapat diakses publik.
- [ ] Uptime monitor aktif ke `/api/health/ready`.
- [ ] Profil `monitoring` aktif; target Prometheus dan datasource Grafana sehat.
- [ ] Backup harian terjadwal, metrik backup terlihat, dan `verify_restore.sh`
      lulus.
- [ ] Grafana hanya `127.0.0.1` dan diakses via SSH tunnel.
- [ ] Smoke test login, dashboard, daftar order, dan laporan.
- [ ] Rollback image sebelumnya sudah dicatat.

## 13. Batas yang diterima

- Backup lokal tidak melindungi dari kehilangan VPS. Off-host menjadi gate
  sebelum data produksi nyata.
- Prometheus/Grafana mati bersama VPS; uptime eksternal menutup deteksi host.
- TLS produksi tidak diuji di staging lokal; verifikasi dilakukan saat deploy
  dengan checklist dan rollback.
- Tidak ada HA, PITR, atau replika baca pada M8.
