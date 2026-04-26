#!/usr/bin/env bash
# One-shot VPS deploy for label-studios fixensy build.
# Usage:
#   1. SSH to VPS, cd into repo dir.
#   2. Set required env (CLOUDINARY_*).
#   3. ./scripts/deploy_vps.sh
#
# Requires: docker compose v2 + git installed.
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(pwd)}"
BRANCH="${BRANCH:-cloud-ai-update}"

echo "==> Pulling latest from origin/${BRANCH}"
cd "$REPO_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

# Ensure required env vars
: "${CLOUDINARY_CLOUD_NAME:?CLOUDINARY_CLOUD_NAME not set}"
: "${CLOUDINARY_UPLOAD_PRESET:?CLOUDINARY_UPLOAD_PRESET not set}"

ENV_FILE="${ENV_FILE:-.env}"
echo "==> Writing Cloudinary env to $ENV_FILE"
{
  echo "CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME"
  echo "CLOUDINARY_UPLOAD_PRESET=$CLOUDINARY_UPLOAD_PRESET"
  echo "CLOUDINARY_FOLDER=${CLOUDINARY_FOLDER:-label-studio}"
} > "$ENV_FILE.fixensy"

# Merge into main env file (preserve existing lines we don't own)
if [ -f "$ENV_FILE" ]; then
  grep -vE '^(CLOUDINARY_CLOUD_NAME|CLOUDINARY_UPLOAD_PRESET|CLOUDINARY_FOLDER)=' "$ENV_FILE" > "$ENV_FILE.tmp" || true
  cat "$ENV_FILE.fixensy" >> "$ENV_FILE.tmp"
  mv "$ENV_FILE.tmp" "$ENV_FILE"
else
  mv "$ENV_FILE.fixensy" "$ENV_FILE"
fi
rm -f "$ENV_FILE.fixensy"

echo "==> Building frontend bundle"
if [ -d web ]; then
  pushd web >/dev/null
  if command -v yarn >/dev/null 2>&1; then
    yarn install --frozen-lockfile
    yarn build
  else
    npm ci
    npm run build
  fi
  popd >/dev/null
fi

echo "==> Rebuilding Docker images"
docker compose pull || true
docker compose build app

echo "==> Restarting stack"
docker compose up -d --force-recreate app

echo "==> Done. Tail logs:"
docker compose logs -f --tail=80 app
