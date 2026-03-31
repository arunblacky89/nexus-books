#!/bin/sh
echo "=== NexusBooks Backend Starting ==="
until python -c "
import psycopg2, os, sys
try:
    psycopg2.connect(host=os.environ.get('DB_HOST','db'),dbname=os.environ.get('DB_NAME','books_db'),user=os.environ.get('DB_USER','books_user'),password=os.environ.get('DB_PASSWORD','books_pass'),connect_timeout=3)
    sys.exit(0)
except Exception as e:
    print(f'DB not ready: {e}')
    sys.exit(1)
" 2>&1; do
  echo "Waiting for DB... retrying in 3s"
  sleep 3
done
echo "DB ready!"
python manage.py migrate --noinput 2>&1
python manage.py seed_books 2>&1 || echo "Seed already done"
python manage.py collectstatic --noinput 2>&1 || true
echo "=== Starting Gunicorn ==="
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120 --access-logfile - --error-logfile -
