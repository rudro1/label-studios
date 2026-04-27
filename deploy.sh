#!/bin/bash
set -e

DEPLOY_DIR=/home/rudro/label-studios-develop
IMAGE=ghcr.io/rudro1/label-studios:latest

echo "[1/6] Pull latest image..."
sudo docker pull "$IMAGE"

echo "[2/6] Restart worker + app..."
cd "$DEPLOY_DIR"
sudo docker compose -f docker-compose.vps.yml up -d --no-deps --force-recreate rqworker
sleep 3
sudo docker compose -f docker-compose.vps.yml up -d --no-deps --force-recreate app
sleep 20

echo "[3/6] Wait for app to be healthy..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  CODE=$(sudo docker exec label-studios-develop-app-1 \
    curl -sf -o /dev/null -w "%{http_code}" http://localhost:8000/health/ 2>/dev/null || echo "000")
  echo "  attempt $i: HTTP $CODE"
  if [ "$CODE" = "200" ]; then
    echo "  app is healthy"
    break
  fi
  sleep 5
done

echo "[4/6] Ensure admin user..."
sudo docker exec label-studios-develop-app-1 sh -c "
cd /label-studio
cat > /tmp/_ea.py << 'PYEOF'
import os
from users.models import User
from organizations.models import Organization

email = os.environ.get('LABEL_STUDIO_USERNAME', 'info@fixensy.com')
pwd   = os.environ.get('LABEL_STUDIO_PASSWORD', 'Fixensy01+')

u = User.objects.filter(email=email).first()
if u is None:
    u = User.objects.create_superuser(email=email, password=pwd)
    print('[admin] CREATED')
else:
    u.set_password(pwd)
    u.is_staff     = True
    u.is_superuser = True
    u.is_active    = True
    u.save(update_fields=['password', 'is_staff', 'is_superuser', 'is_active'])
    print('[admin] UPDATED')

org = Organization.objects.first()
if org:
    if not org.has_user(u):
        org.add_user(u)
    u.active_organization = org
    u.save(update_fields=['active_organization'])

print('[admin] OK: ' + u.email)
PYEOF
.venv/bin/python label_studio/manage.py shell < /tmp/_ea.py
" 2>&1 | grep "\[admin\]" || true

echo "[5/6] Reload nginx..."
sudo docker compose -f docker-compose.vps.yml up -d --no-deps --force-recreate nginx
sleep 5

echo "[6/6] Smoke test..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" -L http://35.240.222.149/ || echo "000")
echo "  Site returned HTTP $CODE"

sudo docker ps --format "table {{.Names}}\t{{.Status}}"
echo ""
echo "=== DEPLOY DONE ==="
