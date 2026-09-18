#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${UPLOAD_ROOT:?UPLOAD_ROOT is required}"
: "${BACKUP_ROOT:?BACKUP_ROOT is required}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
destination="$BACKUP_ROOT/$timestamp"
mkdir -p "$destination"

pg_dump --dbname="$DATABASE_URL" --format=custom --file="$destination/homework.dump"
tar --create --gzip --file="$destination/uploads.tar.gz" --directory="$UPLOAD_ROOT" assignments

echo "Backup created: $destination"
