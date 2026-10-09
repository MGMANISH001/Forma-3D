#!/usr/bin/env bash
# Start the whole project — Django REST API + vanilla-JS storefront — on ONE port.
# Usage:  bash start.sh          (serves on 0.0.0.0:3000)
#         PORT=8000 bash start.sh
# Safe to run repeatedly: kills any previous instance first.
set -e
cd "$(dirname "$0")"

PORT="${PORT:-3000}"
PY="${PYTHON:-python3}"

# Stop previous instance (any port)
pkill -f "manage.py runserver" 2>/dev/null || true
sleep 1

$PY manage.py migrate --noinput
$PY manage.py seed_demo
# Demo superuser: admin / admin1234 (idempotent)
$PY - <<'EOF'
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin1234')
    print('Created superuser admin/admin1234')
else:
    print('Superuser exists')
EOF

nohup $PY manage.py runserver 0.0.0.0:"$PORT" > django.log 2>&1 &
echo "Django (API + storefront) started on port $PORT (pid $!)"
sleep 3
curl -s "http://127.0.0.1:$PORT/api/health/" && echo
