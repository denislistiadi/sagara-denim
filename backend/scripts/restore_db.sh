#!/bin/sh
# Restore dump kustom ke database target yang sudah ada.
#
# Pemakaian:
#   RESTORE_DATABASE_URL=postgresql://... sh restore_db.sh /backups/xxx.dump
#
# Pengaman:
#   - checksum wajib ada dan cocok;
#   - target harus berakhiran _staging/_restore/_verify, kecuali
#     RESTORE_ALLOW_NON_STAGING=1 diberikan secara eksplisit.
set -eu

dump="${1:?Pemakaian: restore_db.sh <file.dump>}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL wajib diisi}"

if [ ! -f "$dump" ]; then
    echo "GAGAL: dump tidak ditemukan: $dump" >&2
    exit 1
fi

checksum="$dump.sha256"
if [ ! -f "$checksum" ]; then
    echo "GAGAL: checksum tidak ditemukan: $checksum" >&2
    exit 1
fi

(
    cd "$(dirname "$dump")"
    sha256sum -c "$(basename "$checksum")"
)

database_name="$(printf '%s' "$RESTORE_DATABASE_URL" | sed -E 's#^.*/([^/?]+)(\?.*)?$#\1#')"
case "$database_name" in
    *_staging|*_restore|*_verify) ;;
    *)
        if [ "${RESTORE_ALLOW_NON_STAGING:-0}" != "1" ]; then
            echo "GAGAL: target '$database_name' bukan database staging." >&2
            echo "Set RESTORE_ALLOW_NON_STAGING=1 hanya untuk pemulihan darurat." >&2
            exit 1
        fi
        ;;
esac

started="$(date +%s)"
echo "Restore $dump ke database $database_name"
pg_restore \
    --dbname "$RESTORE_DATABASE_URL" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --single-transaction \
    --exit-on-error \
    "$dump"
elapsed="$(( $(date +%s) - started ))"

echo "OK: restore selesai dalam ${elapsed} detik."
