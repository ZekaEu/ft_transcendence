#!/bin/sh
# wait-for-db.sh – Wait for MySQL to be ready before starting Flask

set -e

HOST="${DB_HOST:-mysql}"
PORT="${DB_PORT:-3306}"

echo ">>> Waiting for MySQL at $HOST:$PORT..."

while ! nc -z "$HOST" "$PORT" 2>/dev/null; do
    sleep 1
done

echo ">>> MySQL is ready. Starting application..."
exec "$@"
