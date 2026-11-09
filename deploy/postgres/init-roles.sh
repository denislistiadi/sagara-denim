#!/bin/sh
# Entrypoint PostgreSQL: buat role owner/app/backup dari environment.
set -eu

: "${POSTGRES_USER:?POSTGRES_USER wajib diisi}"
: "${POSTGRES_DB:?POSTGRES_DB wajib diisi}"
: "${POSTGRES_OWNER_USER:?POSTGRES_OWNER_USER wajib diisi}"
: "${POSTGRES_OWNER_PASSWORD:?POSTGRES_OWNER_PASSWORD wajib diisi}"
: "${POSTGRES_APP_USER:?POSTGRES_APP_USER wajib diisi}"
: "${POSTGRES_APP_PASSWORD:?POSTGRES_APP_PASSWORD wajib diisi}"
: "${POSTGRES_BACKUP_USER:?POSTGRES_BACKUP_USER wajib diisi}"
: "${POSTGRES_BACKUP_PASSWORD:?POSTGRES_BACKUP_PASSWORD wajib diisi}"

psql \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --set ON_ERROR_STOP=1 \
    --set owner_user="$POSTGRES_OWNER_USER" \
    --set owner_password="$POSTGRES_OWNER_PASSWORD" \
    --set app_user="$POSTGRES_APP_USER" \
    --set app_password="$POSTGRES_APP_PASSWORD" \
    --set backup_user="$POSTGRES_BACKUP_USER" \
    --set backup_password="$POSTGRES_BACKUP_PASSWORD" \
    --set database_name="$POSTGRES_DB" \
    --file /opt/sagara/roles.sql
