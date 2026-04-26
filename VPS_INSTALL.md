# Fixensy / Fixstudio — VPS install

## One-shot

```bash
git clone <this-repo> fixensy && cd fixensy
cp .env.example .env
# edit .env: passwords, LABEL_STUDIO_HOST, CSRF_TRUSTED_ORIGINS
bash deploy/vps-bootstrap.sh
```

If docker is not installed and you trust the machine:
```bash
INSTALL_DOCKER=1 bash deploy/vps-bootstrap.sh
```

## What it does
- Verifies docker + docker compose v2.
- Generates `.env` from `.env.example`, auto-fills `DJANGO_SECRET_KEY`.
- Runs `docker compose build && docker compose up -d`.
- Waits for app to respond on `APP_PORT` (default 8080).

## Behind reverse proxy (recommended)
- Keep `APP_BIND_HOST=127.0.0.1` and terminate TLS in nginx/caddy.
- Set `LABEL_STUDIO_HOST=https://label.example.com` and
  `CSRF_TRUSTED_ORIGINS=https://label.example.com` in `.env`.

## Upgrade
```bash
git pull
docker compose build
docker compose up -d
```

## Production-safe workflow (recommended)

When your server has important new changes and DB state, use this flow:

1. Push server code changes to repo (same branch you deploy from).
2. Take a backup before every redeploy.
3. Redeploy from git and run migrations.
4. Keep backup files outside the repo history.

### Backup code+data state
```bash
bash deploy/vps-backup.sh
# or custom backup directory
bash deploy/vps-backup.sh /opt/fixensy-backups/$(date +%Y%m%d-%H%M%S)
```

This stores:
- PostgreSQL dump (`postgres.dump`)
- Label Studio data (`ls_data.tar.gz`)
- `.env` snapshot

### Redeploy from repository
```bash
bash deploy/vps-redeploy.sh main
```

### Restore (if needed)
```bash
bash deploy/vps-restore.sh /path/to/backup-dir
```

## Notes for fresh clone on VPS
- Data is persisted via Docker volumes (`postgres_data`, `ls_data`) in `docker-compose.yml`.
- Do **not** run `docker compose down -v` in production unless you intentionally want to wipe all DB/data.
- Keep your production `.env` on VPS and never commit it to git.
- Commit migration files to repo whenever DB schema changed.

## Reset (wipes data)
```bash
docker compose down -v
```
