#!/bin/sh
set -eu

# Render routes web traffic to the port supplied through PORT.
PORT="${PORT:-10000}"
sed -ri "s/^Listen 80$/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

# Ensure Laravel's writable directories are available after each container start.
mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache

# Build Laravel caches with the real platform environment, not during image build.
php artisan config:cache
php artisan route:cache

# Fail the deployment startup if migrations or initial seed data cannot be applied.
php artisan migrate --force
php artisan db:seed --class=CollegeSeeder --force

# Ensure web server user owns storage and cache
chown -R www-data:www-data storage bootstrap/cache

exec "$@"
