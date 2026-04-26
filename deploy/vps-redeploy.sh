#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root_dir"

log() { printf '\033[1;36m[redeploy]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[redeploy]\033[0m %s\n' "$*" >&2; exit 1; }

branch="${1:-main}"

if [[ ! -d .git ]]; then
  die "not a git repository: $root_dir"
fi

if [[ -z "$(git status --porcelain)" ]]; then
  log "Working tree clean"
else
  die "working tree has local changes. Commit/stash before redeploy."
fi

log "Pulling latest code from branch $branch"
git fetch --all --prune
git checkout "$branch"
git pull --ff-only origin "$branch"

log "Rebuilding and starting containers"
docker compose build
docker compose up -d

log "Running migrations"
docker compose exec -T label_studio python label_studio/manage.py migrate --noinput

log "Collecting static files"
docker compose exec -T label_studio python label_studio/manage.py collectstatic --noinput

port="${APP_PORT:-8080}"
log "Checking health endpoint"
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${port}/health" >/dev/null 2>&1 || curl -fsS "http://127.0.0.1:${port}/" >/dev/null 2>&1; then
    log "Deployment healthy on port $port"
    exit 0
  fi
  sleep 2
done

die "health check failed"
