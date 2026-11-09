#!/bin/sh
# Backup logis PostgreSQL: dump kustom, checksum, retensi, dan metrik.
#
# Pemakaian:
#   BACKUP_DATABASE_URL=postgresql://... sh backup_db.sh
#
# Variabel:
#   BACKUP_DATABASE_URL        koneksi role baca (wajib)
#   BACKUP_DIR                 direktori dump (default /backups)
#   BACKUP_METRICS_DIR         direktori metrik textfile (default BACKUP_DIR)
#   BACKUP_RETENTION_DAYS      retensi dump harian (default 7)
#   BACKUP_WEEKLY_RETENTION_DAYS retensi dump Minggu (default 28)
set -eu

: "${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL wajib diisi}"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
METRICS_DIR="${BACKUP_METRICS_DIR:-$BACKUP_DIR}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
WEEKLY_RETENTION_DAYS="${BACKUP_WEEKLY_RETENTION_DAYS:-28}"

mkdir -p "$BACKUP_DIR" "$METRICS_DIR"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump="$BACKUP_DIR/sagara_denim_${timestamp}.dump"
checksum="$dump.sha256"

cleanup_failed() {
    rm -f "$dump" "$checksum"
}
trap cleanup_failed HUP INT TERM

umask 077
echo "Mulai backup: $dump"
if ! pg_dump \
    --dbname "$BACKUP_DATABASE_URL" \
    --format=custom \
    --compress=9 \
    --no-owner \
    --no-privileges \
    --file "$dump"; then
    cleanup_failed
    echo "GAGAL: pg_dump tidak selesai." >&2
    exit 1
fi
trap - HUP INT TERM

(
    cd "$BACKUP_DIR"
    sha256sum "$(basename "$dump")" > "$(basename "$checksum")"
)

prune_daily() {
    find "$BACKUP_DIR" -type f -name 'sagara_denim_*.dump' -mtime +"$RETENTION_DAYS" |
        while IFS= read -r old; do
            weekday="$(date -u -r "$old" +%u 2>/dev/null || echo 0)"
            if [ "$weekday" != "7" ]; then
                rm -f "$old" "$old.sha256"
            fi
        done
}

prune_daily
find "$BACKUP_DIR" -type f -name 'sagara_denim_*.dump' -mtime +"$WEEKLY_RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name 'sagara_denim_*.dump.sha256' -mtime +"$WEEKLY_RETENTION_DAYS" -delete

size_bytes="$(wc -c < "$dump" | tr -d ' ')"
now="$(date +%s)"
metric_tmp="$METRICS_DIR/.sagara_backup.prom.tmp"
cat > "$metric_tmp" <<EOF
# HELP sagara_backup_last_success_timestamp_seconds Waktu backup sukses terakhir.
# TYPE sagara_backup_last_success_timestamp_seconds gauge
sagara_backup_last_success_timestamp_seconds $now
# HELP sagara_backup_size_bytes Ukuran dump backup terakhir dalam byte.
# TYPE sagara_backup_size_bytes gauge
sagara_backup_size_bytes $size_bytes
EOF
chmod 644 "$metric_tmp"
mv "$metric_tmp" "$METRICS_DIR/sagara_backup.prom"

echo "OK: backup selesai ($size_bytes byte) dan checksum tersimpan."
