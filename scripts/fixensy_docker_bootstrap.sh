#!/usr/bin/env bash
# Bring up PostgreSQL + Label Studio (Docker), wait for health, seed Super Admin + Fixensy demo users.
# Requires: Docker daemon running, `.env` at repo root (see `.env.example`).
#
# First cold start: Django runs migrations before bind — often 3–6+ minutes. The wait loop below
# reflects that. If you still time out, check: docker compose logs -f label_studio
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# If the parent shell already exported these, keep them after sourcing `.env` so you can e.g.
# align POSTGRES_PASSWORD with an existing volume, or run an isolated verify:
#   COMPOSE_PROJECT_NAME=myverify APP_PORT=18090 POSTGRES_PASSWORD=secret bash scripts/fixensy_docker_bootstrap.sh
_pre_POSTGRES_PASSWORD="${POSTGRES_PASSWORD-}"
_pre_POSTGRES_USER="${POSTGRES_USER-}"
_pre_POSTGRES_DB="${POSTGRES_DB-}"
_pre_COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME-}"
_pre_APP_PORT="${APP_PORT-}"
_pre_APP_BIND_HOST="${APP_BIND_HOST-}"
_pre_LABEL_STUDIO_HOST="${LABEL_STUDIO_HOST-}"
_pre_has_POSTGRES_PASSWORD=0
_pre_has_POSTGRES_USER=0
_pre_has_POSTGRES_DB=0
_pre_has_COMPOSE_PROJECT_NAME=0
_pre_has_APP_PORT=0
_pre_has_APP_BIND_HOST=0
_pre_has_LABEL_STUDIO_HOST=0
[[ -n "${POSTGRES_PASSWORD+x}" ]] && _pre_has_POSTGRES_PASSWORD=1
[[ -n "${POSTGRES_USER+x}" ]] && _pre_has_POSTGRES_USER=1
[[ -n "${POSTGRES_DB+x}" ]] && _pre_has_POSTGRES_DB=1
[[ -n "${COMPOSE_PROJECT_NAME+x}" ]] && _pre_has_COMPOSE_PROJECT_NAME=1
[[ -n "${APP_PORT+x}" ]] && _pre_has_APP_PORT=1
[[ -n "${APP_BIND_HOST+x}" ]] && _pre_has_APP_BIND_HOST=1
[[ -n "${LABEL_STUDIO_HOST+x}" ]] && _pre_has_LABEL_STUDIO_HOST=1

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

[[ "$_pre_has_POSTGRES_PASSWORD" == 1 ]] && export POSTGRES_PASSWORD="$_pre_POSTGRES_PASSWORD"
[[ "$_pre_has_POSTGRES_USER" == 1 ]] && export POSTGRES_USER="$_pre_POSTGRES_USER"
[[ "$_pre_has_POSTGRES_DB" == 1 ]] && export POSTGRES_DB="$_pre_POSTGRES_DB"
[[ "$_pre_has_COMPOSE_PROJECT_NAME" == 1 ]] && export COMPOSE_PROJECT_NAME="$_pre_COMPOSE_PROJECT_NAME"
[[ "$_pre_has_APP_PORT" == 1 ]] && export APP_PORT="$_pre_APP_PORT"
[[ "$_pre_has_APP_BIND_HOST" == 1 ]] && export APP_BIND_HOST="$_pre_APP_BIND_HOST"
[[ "$_pre_has_LABEL_STUDIO_HOST" == 1 ]] && export LABEL_STUDIO_HOST="$_pre_LABEL_STUDIO_HOST"

PORT="${APP_PORT:-8080}"
# Must match Dockerfile CMD label-studio --port
CONTAINER_HTTP_PORT="${CONTAINER_HTTP_PORT:-8080}"
# ~6 minutes total (migrations + import on first boot)
WAIT_ATTEMPTS="${BOOTSTRAP_WAIT_ATTEMPTS:-180}"
WAIT_SLEEP_SEC="${BOOTSTRAP_WAIT_SLEEP_SEC:-2}"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop (or the daemon), then rerun:" >&2
  echo "  bash scripts/fixensy_docker_bootstrap.sh" >&2
  exit 1
fi

if [[ -z "${FIXENSY_SUPERADMIN_EMAIL:-}" || -z "${FIXENSY_SUPERADMIN_PASSWORD:-}" ]]; then
  echo "Set FIXENSY_SUPERADMIN_EMAIL and FIXENSY_SUPERADMIN_PASSWORD in .env (password >= 12 chars)." >&2
  exit 1
fi

echo "=> docker compose up -d --build"
docker compose up -d --build

app_ready() {
  if curl -fsS "http://127.0.0.1:${PORT}/health/" >/dev/null 2>&1; then
    return 0
  fi
  if docker compose exec -T label_studio sh -c "curl -fsS http://127.0.0.1:${CONTAINER_HTTP_PORT}/health/" >/dev/null 2>&1; then
    return 0
  fi
  if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

echo "=> Waiting for app (host :${PORT}/health/ or in-container :${CONTAINER_HTTP_PORT}/health/) — up to $((WAIT_ATTEMPTS * WAIT_SLEEP_SEC))s ..."
ok=0
for i in $(seq 1 "${WAIT_ATTEMPTS}"); do
  if app_ready; then
    ok=1
    echo "=> App responded after ${i} attempt(s)"
    break
  fi
  if (( i % 15 == 0 )); then
    echo "   ... still waiting (${i}/${WAIT_ATTEMPTS})"
  fi
  sleep "${WAIT_SLEEP_SEC}"
done

if [[ "$ok" -ne 1 ]]; then
  echo "Timed out waiting for app. Last 100 lines of label_studio logs:" >&2
  echo "----------------------------------------------------------------" >&2
  docker compose logs --tail 100 label_studio 2>&1 >&2 || true
  echo "----------------------------------------------------------------" >&2
  echo "For live logs: docker compose logs -f label_studio" >&2
  if docker compose logs --tail 200 label_studio 2>&1 | grep -q 'password authentication failed'; then
    echo >&2
    echo "Hint: PostgreSQL rejected the password. The docker volume postgres_data keeps the password from the first boot." >&2
    echo "      Put the same POSTGRES_PASSWORD in .env as when the volume was created, or use a new project + fresh volumes, e.g.:" >&2
    echo "        COMPOSE_PROJECT_NAME=myverify APP_PORT=18090 POSTGRES_PASSWORD=... bash scripts/fixensy_docker_bootstrap.sh" >&2
    echo "      (Only use docker compose down -v if you intend to wipe the database.)" >&2
  fi
  exit 1
fi

echo "=> create_super_admin"
docker compose exec -T label_studio python3 /label-studio/label_studio/manage.py create_super_admin --purge-default

echo "=> setup_test_data.py (admin / annotator / reviewer + demo project)"
docker compose exec -T label_studio python3 /label-studio/label_studio/setup_test_data.py

echo "Done. Open http://127.0.0.1:${PORT}/ — see FIXENSY_PLAN.md \"Test logins\" for accounts."
