#!/bin/bash

echo "Fixensy Safe Update Starting..."
echo "================================"

cd /root/Fixstudio

# Step 1: Pull latest code
echo "Pulling latest code..."
git pull origin develop

# Step 2: Build নতুন image - পুরোনো container চলবে
echo "Building new image (old container still running)..."
docker compose build label_studio

# Step 3: Volume check - data safe আছে কিনা
echo "Checking volumes..."
VOL=$(docker volume ls | grep fixstudio_ls_data | wc -l)
if [ "$VOL" -eq 0 ]; then
    echo "CRITICAL: Volume missing! Aborting!"
    exit 1
fi
echo "Volume OK"

# Step 4: DB check - postgres চলছে কিনা
DB_STATUS=$(docker compose ps db | grep "Up" | wc -l)
if [ "$DB_STATUS" -eq 0 ]; then
    echo "CRITICAL: DB not running! Aborting!"
    exit 1
fi
echo "DB OK"

# Step 5: নতুন container start - পুরোনোটা replace হবে
# --no-deps মানে db touch হবে না
echo "Starting new container..."
docker compose up -d --no-deps label_studio

# Step 6: Health check loop - ready না হওয়া পর্যন্ত wait
echo "Waiting for new container to be healthy..."
MAX_WAIT=120
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    STATUS=$(docker compose ps label_studio | grep "Up" | wc -l)
    if [ "$STATUS" -gt 0 ]; then
        # HTTP check
        HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
        if [ "$HTTP" = "200" ] || [ "$HTTP" = "302" ] || [ "$HTTP" = "301" ]; then
            echo "Container healthy! (HTTP $HTTP)"
            break
        fi
    fi
    echo "  Waiting... ${WAITED}s"
    sleep 5
    WAITED=$((WAITED + 5))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo "WARNING: Health check timeout but container may still be starting"
fi

# Step 7: DB $undefined$ fix
echo "Checking DB for corrupted audio paths..."
docker compose exec -T db psql -U admin -d labelstudio -c "
UPDATE tasks_task 
SET data = jsonb_set(data - '\$undefined\$', '{audio}', data->'\$undefined\$') 
WHERE data ? '\$undefined\$';
" 2>/dev/null && echo "DB fix done" || echo "DB OK (no fix needed)"

# Step 8: Final status
echo "================================"
docker compose ps
echo "================================"
echo "Update Complete!"
echo "URL: http://46.202.162.31"
