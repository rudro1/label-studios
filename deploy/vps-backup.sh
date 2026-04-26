#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

log() { printf '\033[1;36m[backup]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[backup]\033[0m %s\n' "$*" >&2; exit 1; }

if ! command -v docker >/dev/null 2>&1; then
  die "docker is required"
fi
if ! docker compose version >/dev/null 2>&1; then
  die "docker compose v2 plugin is required"
fi

if [[ ! -f .env ]]; then
  die ".env file is missing"
fi

# shellcheck disable=SC1091
source .env

stamp="$(date +%Y%m%d-%H%M%S)"
backup_root="${1:-$root_dir/backups/$stamp}"
mkdir -p "$backup_root"

pg_user="${POSTGRES_USER:-admin}"
pg_db="${POSTGRES_DB:-labelstudio}"

log "Creating PostgreSQL dump"
docker compose exec -T db sh -lc "pg_dump -U '$pg_user' -d '$pg_db' -Fc" >"$backup_root/postgres.dump"

log "Archiving Label Studio data directory"
docker compose exec -T label_studio sh -lc "tar czf - -C /label-studio/data ." >"$backup_root/ls_data.tar.gz"

cp .env "$backup_root/.env.snapshot"
cp docker-compose.yml "$backup_root/docker-compose.snapshot.yml"

log "Backup complete: $backup_root"
echo "- postgres: $backup_root/postgres.dump"
echo "- data dir: $backup_root/ls_data.tar.gz"
echo "- env snapshot: $backup_root/.env.snapshot"
