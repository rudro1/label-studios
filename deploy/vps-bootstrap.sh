#!/usr/bin/env bash
# Fixensy / Fixstudio one-shot VPS bootstrap.
# Idempotent: safe to rerun. Installs docker if missing, writes .env from example if absent,
# builds image, starts db+app, waits for health.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$here"

log() { printf '\033[1;36m[bootstrap]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[bootstrap]\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31m[bootstrap]\033[0m %s\n' "$*" >&2; exit 1; }

# 1) Docker check
if ! command -v docker >/dev/null 2>&1; then
  warn "docker not found."
  if [[ "${INSTALL_DOCKER:-0}" == "1" ]]; then
    log "INSTALL_DOCKER=1 set — installing docker via get.docker.com"
    curl -fsSL https://get.docker.com | sh
  else
    die "install docker first, or rerun with INSTALL_DOCKER=1"
  fi
fi
if ! docker compose version >/dev/null 2>&1; then
  die "docker compose v2 plugin required. Install docker-compose-plugin."
fi

# 2) .env
if [[ ! -f .env ]]; then
  log ".env missing — copying from .env.example"
  cp .env.example .env
  # generate django secret
  if command -v python3 >/dev/null 2>&1; then
    sec=$(python3 -c 'import secrets;print(secrets.token_urlsafe(64))')
    # portable sed -i
    sed -i.bak "s|^DJANGO_SECRET_KEY=.*|DJANGO_SECRET_KEY=${sec}|" .env && rm -f .env.bak
  fi
  warn ".env created. EDIT PASSWORDS + LABEL_STUDIO_HOST before production use."
fi

# 3) Build + up
log "Building image (may take a while on first run)..."
docker compose build

log "Starting stack..."
docker compose up -d

# 4) Wait for app
log "Waiting for app to respond on http://localhost:${APP_PORT:-8080}/health ..."
port="$(grep -E '^APP_PORT=' .env | cut -d= -f2 || true)"
port="${port:-8080}"
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${port}/health" >/dev/null 2>&1 \
    || curl -fsS "http://127.0.0.1:${port}/" >/dev/null 2>&1; then
    log "app is responding on port ${port}"
    break
  fi
  sleep 3
done

log "Done. Useful commands:"
echo "  docker compose logs -f label_studio"
echo "  docker compose exec label_studio ./label-studio shell_plus"
echo "  docker compose down         # stop"
echo "  docker compose down -v      # stop + WIPE DATA"
