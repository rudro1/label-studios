#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "Starting Fixensy with Docker Compose..."
echo "This uses .env as the single source of truth for DB and Super Admin credentials."
echo

exec bash scripts/fixensy_docker_bootstrap.sh
