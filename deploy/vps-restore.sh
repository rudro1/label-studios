#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

log() { printf '\033[1;36m[restore]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[restore]\033[0m %s\n' "$*" >&2; exit 1; }

backup_dir="${1:-}"
if [[ -z "$backup_dir" ]]; then
  die "usage: bash deploy/vps-restore.sh /absolute/or/relative/backup_dir"
fi

backup_dir="$(cd "$backup_dir" && pwd)"

[[ -f "$backup_dir/postgres.dump" ]] || die "missing $backup_dir/postgres.dump"
[[ -f "$backup_dir/ls_data.tar.gz" ]] || die "missing $backup_dir/ls_data.tar.gz"
[[ -f .env ]] || die ".env file is missing"

# shellcheck disable=SC1091
source .env

pg_user="${POSTGRES_USER:-admin}"
pg_db="${POSTGRES_DB:-labelstudio}"

log "Stopping app service for consistent restore"
docker compose stop label_studio

log "Resetting and restoring PostgreSQL database"
docker compose exec -T db sh -lc "psql -U '$pg_user' -d '$pg_db' -c \"DROP SCHEMA public CASCADE; CREATE SCHEMA public;\""
docker compose exec -T db sh -lc "pg_restore -U '$pg_user' -d '$pg_db' --clean --if-exists --no-owner --no-privileges" <"$backup_dir/postgres.dump"

log "Restoring /label-studio/data"
docker compose exec -T label_studio sh -lc "rm -rf /label-studio/data/*"
docker compose exec -T label_studio sh -lc "tar xzf - -C /label-studio/data" <"$backup_dir/ls_data.tar.gz"

log "Starting app service"
docker compose up -d label_studio

log "Restore complete from $backup_dir"
