#!/bin/sh
# Validasi environment produksi sebelum deploy.
# Pemakaian: ./deploy/check_env.sh [deploy/.env.production]
set -eu

ENV_FILE="${1:-deploy/.env.production}"

if [ ! -f "$ENV_FILE" ]; then
    echo "GAGAL: file environment tidak ditemukan: $ENV_FILE" >&2
    echo "Salin deploy/.env.production.example lalu isi nilainya." >&2
    exit 1
fi

value_of() {
    awk -F= -v key="$1" '
        $0 ~ "^[[:space:]]*" key "=" {
            sub("^[^=]*=", "", $0)
            gsub(/^["'\'']|["'\'']$/, "", $0)
            print
            exit
        }
    ' "$ENV_FILE"
}

require_key() {
    key="$1"
    value="$(value_of "$key")"
    if [ -z "$value" ]; then
        echo "GAGAL: $key wajib diisi di $ENV_FILE" >&2
        exit 1
    fi
}

require_secret() {
    key="$1"
    minimum="$2"
    value="$(value_of "$key")"
    require_key "$key"

    case "$value" in
        *GANTI*|*ganti*|*changeme*|*CHANGEME*|*example*|*\<*|*\>*)
            echo "GAGAL: $key masih memakai placeholder." >&2
            exit 1
            ;;
    esac

    length="$(printf '%s' "$value" | wc -c | tr -d ' ')"
    if [ "$length" -lt "$minimum" ]; then
        echo "GAGAL: $key minimal $minimum karakter (sekarang $length)." >&2
        exit 1
    fi
}

for key in \
    SAGARA_DOMAIN \
    ACME_EMAIL \
    PUBLIC_ORIGIN \
    SAGARA_BACKEND_IMAGE \
    SAGARA_FRONTEND_IMAGE \
    POSTGRES_BOOTSTRAP_PASSWORD \
    POSTGRES_OWNER_PASSWORD \
    POSTGRES_APP_PASSWORD \
    POSTGRES_BACKUP_PASSWORD \
    BACKUP_HOST_DIR \
    BACKUP_METRICS_HOST_DIR \
    GRAFANA_ADMIN_PASSWORD
do
    require_key "$key"
done

require_secret JWT_SECRET 32
require_secret METRICS_TOKEN 32

for key in BACKUP_HOST_DIR BACKUP_METRICS_HOST_DIR; do
    case "$(value_of "$key")" in
        /*) ;;
        *)
            echo "GAGAL: $key wajib berupa path absolut di VPS." >&2
            exit 1
            ;;
    esac
done

PUBLIC_ORIGIN="$(value_of PUBLIC_ORIGIN)"
case "$PUBLIC_ORIGIN" in
    https://*) ;;
    *)
        echo "GAGAL: PUBLIC_ORIGIN wajib memakai https://." >&2
        exit 1
        ;;
esac

case "$PUBLIC_ORIGIN" in
    *localhost*|*127.0.0.1*|*\[::1\]*)
        echo "GAGAL: PUBLIC_ORIGIN tidak boleh menunjuk ke localhost." >&2
        exit 1
        ;;
esac

SAGARA_DOMAIN="$(value_of SAGARA_DOMAIN)"
case "$SAGARA_DOMAIN" in
    *://*|*/*)
        echo "GAGAL: SAGARA_DOMAIN harus berupa nama domain tanpa skema/path." >&2
        exit 1
        ;;
esac

case "$(value_of SAGARA_BACKEND_IMAGE)" in
    ghcr.io/*) ;;
    *)
        echo "PERINGATAN: SAGARA_BACKEND_IMAGE bukan dari ghcr.io." >&2
        ;;
esac

case "$(value_of SAGARA_FRONTEND_IMAGE)" in
    ghcr.io/*) ;;
    *)
        echo "PERINGATAN: SAGARA_FRONTEND_IMAGE bukan dari ghcr.io." >&2
        ;;
esac

if [ "$(uname -s 2>/dev/null || true)" = "Linux" ]; then
    mode="$(stat -c '%a' "$ENV_FILE" 2>/dev/null || echo '')"
    case "$mode" in
        600|400) ;;
        *)
            echo "GAGAL: permission $ENV_FILE adalah ${mode:-tidak diketahui}; wajib 600 atau 400." >&2
            exit 1
            ;;
    esac
fi

echo "OK: environment produksi valid."
