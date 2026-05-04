# Fixensy VPS Deploy

## SCP Upload

From your local machine:

```bash
scp -r "/path/to/label-studios-develop copy 2" user@your-vps:/opt/fixensy
```

## Server Setup

SSH into the VPS:

```bash
ssh user@your-vps
cd /opt/fixensy
cp .env.example .env
```

Edit `.env` and set at minimum:

```env
APP_BIND_HOST=0.0.0.0
APP_PORT=8080
POSTGRES_USER=admin
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD
POSTGRES_DB=labelstudio
LABEL_STUDIO_HOST=https://your-domain.example
CSRF_TRUSTED_ORIGINS=https://your-domain.example
DJANGO_SECRET_KEY=GENERATE_A_LONG_RANDOM_SECRET
FIXENSY_SUPERADMIN_EMAIL=bisal.s@fixensy.com
FIXENSY_SUPERADMIN_PASSWORD=SET_A_STRONG_PASSWORD_HERE
```

If you terminate TLS at Nginx/Caddy, also set:

```env
LABEL_STUDIO_BEHIND_PROXY=true
```

## Build and Start

```bash
bash start_fixensy.sh
```

This will:

1. build containers
2. start PostgreSQL and Label Studio
3. wait for health
4. create/rotate the Fixensy Super Admin from env
5. seed the Fixensy demo admin/annotator/reviewer users

## Health Checks

```bash
docker compose ps
curl -fsS http://127.0.0.1:8080/health/
docker compose logs --tail 100 label_studio
```

## Day-2 Commands

```bash
docker compose up -d
docker compose restart label_studio
docker compose logs -f label_studio
docker compose exec -T label_studio python3 /label-studio/label_studio/manage.py create_super_admin --purge-default
```

## Notes

- `.env` is the credential source of truth for VPS.
- Do not commit real credentials.
- `start_fixensy.sh` is now a Docker bootstrap wrapper, not a local-path Python runner.
