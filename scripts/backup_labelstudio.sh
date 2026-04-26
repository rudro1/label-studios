#!/usr/bin/env bash
set -euo pipefail

cd /root/Fixstudio

if command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  DC="docker compose"
fi

BACKUP_DIR="/root/Fixstudio/backups"
TS="$(date +%F_%H-%M-%S)"

mkdir -p "$BACKUP_DIR"

$DC exec -T db sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > "$BACKUP_DIR/db_${TS}.sql"

gzip -f "$BACKUP_DIR/db_${TS}.sql"

$DC run --rm -T --no-deps \
  --user root \
  -v "$BACKUP_DIR":/backup:rw \
  label_studio sh -lc "tar -czf /backup/ls_data_${TS}.tar.gz -C /label-studio/data ."

echo "Backup completed at $(date)"
