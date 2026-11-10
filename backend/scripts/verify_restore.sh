#!/bin/sh
# Verifikasi restore ke database scratch, lalu hapus scratch tersebut.
#
# Pemakaian:
#   RESTORE_ADMIN_URL=postgresql://owner:...@host:5432/postgres \
#     sh verify_restore.sh /backups/xxx.dump
#
# RESTORE_ADMIN_URL harus menunjuk database pemeliharaan (biasanya postgres)
# pada server yang sama. Role pada URL harus boleh CREATE DATABASE.
set -eu

dump="${1:?Pemakaian: verify_restore.sh <file.dump>}"
: "${RESTORE_ADMIN_URL:?RESTORE_ADMIN_URL wajib diisi}"

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

scratch="sagara_verify_$(date -u +%Y%m%d%H%M%S)_$$"
scratch_url="${RESTORE_ADMIN_URL%/*}/$scratch"

cleanup() {
    psql "$RESTORE_ADMIN_URL" \
        --set ON_ERROR_STOP=1 \
        --command "DROP DATABASE IF EXISTS \"$scratch\"" >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

psql "$RESTORE_ADMIN_URL" \
    --set ON_ERROR_STOP=1 \
    --command "CREATE DATABASE \"$scratch\"" >/dev/null

started="$(date +%s)"
pg_restore \
    --dbname "$scratch_url" \
    --no-owner \
    --no-privileges \
    --single-transaction \
    --exit-on-error \
    "$dump"

for table in users production_orders alembic_version; do
    exists="$(psql "$scratch_url" --tuples-only --no-align --command \
        "SELECT to_regclass('public.$table') IS NOT NULL")"
    if [ "$exists" != "t" ]; then
        echo "GAGAL: tabel $table tidak ada setelah restore." >&2
        exit 1
    fi
done

migration_count="$(psql "$scratch_url" --tuples-only --no-align --command \
    "SELECT count(*) FROM alembic_version")"
user_count="$(psql "$scratch_url" --tuples-only --no-align --command \
    "SELECT count(*) FROM users")"

if [ "$migration_count" -lt 1 ]; then
    echo "GAGAL: alembic_version kosong setelah restore." >&2
    exit 1
fi

elapsed="$(( $(date +%s) - started ))"
echo "OK: restore terverifikasi dalam ${elapsed} detik."
echo "    migrasi=$migration_count pengguna=$user_count scratch=$scratch (dihapus)."
