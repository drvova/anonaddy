#!/usr/bin/env bash
set -euo pipefail

cd /var/www

if [[ -z "${APP_KEY:-}" ]]; then
  echo "[zeabur] APP_KEY is not set. Set APP_KEY in Zeabur Variables before starting." >&2
  exit 1
fi

echo "[zeabur] Ensuring writable storage permissions..."
chown -R www-data:www-data /var/www/storage

echo "[zeabur] Running migrations..."
php artisan migrate --force

echo "[zeabur] Ensuring public storage symlink..."
if [[ ! -L public/storage ]]; then
  php artisan storage:link
fi

echo "[zeabur] Building caches (runtime, env-aware)..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "[zeabur] Starting queue worker..."
(
  while true; do
    php artisan queue:work redis --sleep=3 --tries=3 --timeout=90
    echo "[zeabur] queue:work exited; restarting in 1s" >&2
    sleep 1
  done
) &

echo "[zeabur] Starting scheduler..."
(
  while true; do
    php artisan schedule:work
    echo "[zeabur] schedule:work exited; restarting in 1s" >&2
    sleep 1
  done
) &

echo "[zeabur] Starting PHP server (nginx + php-fpm)..."
exec _startup
