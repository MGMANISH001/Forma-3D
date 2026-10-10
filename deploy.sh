#!/usr/bin/env bash
# One-command update for the deployed site (e.g. PythonAnywhere).
# Usage (in the hosting Bash console, project root):
#   workon forma3d        # activate your virtualenv first
#   bash deploy.sh
# Then click the green "Reload" button on the Web tab.
set -e
cd "$(dirname "$0")"

# Friendly guard: make sure Django is importable (virtualenv active)
if ! python -c "import django" 2>/dev/null; then
    echo "Django not found — activate your virtualenv first:"
    echo "    workon forma3d"
    echo "then run this script again."
    exit 1
fi

echo "==> Pulling latest code from GitHub..."
git pull

echo "==> Applying migrations (if any)..."
python manage.py migrate --noinput

echo "==> Collecting static files (if any)..."
python manage.py collectstatic --noinput

echo ""
echo "Code updated! Last step: Web tab -> green 'Reload' button."
