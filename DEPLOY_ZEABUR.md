# Deploying AnonAddy on Zeabur (Feature-Complete)

This repo is a Laravel app that needs:

- HTTP (caddy + php-fpm)
- Redis-backed queue worker
- Laravel scheduler
- Durable `storage/` for certain features (notably Failed Deliveries `.eml` files)

This repo uses a custom `Dockerfile` that runs **caddy + php-fpm** and recommends a single service for web + workers. We keep that single-service model because **this repo stores Failed Deliveries on the local filesystem**, and Zeabur Volumes are per-service.

## Why Single Service Is Required (No Feature Loss)

AnonAddy stores Failed Deliveries as `.eml` files using `Storage::disk('local')`, and later:

- downloads them from the web app
- deletes them via scheduled cleanup

In this codebase, `disk('local')` points at `storage/app`. If you split web and worker into separate Zeabur services, the queue worker writes `.eml` files to its own filesystem, and the web service cannot read them.

If you want to split services cleanly, you must refactor Failed Deliveries storage to an object store (S3/R2) or another shared backend.

## Zeabur Fundamentals (Relevant Behavior)

These are the key platform facts used by this deployment approach:

- This repo deploys with its own `Dockerfile`, not Zeabur's stock PHP image.
- The container serves HTTP with Caddy on `:8080`, with PHP handled by `php-fpm` on `127.0.0.1:9000`.
- `_startup` is provided by this repo and is the final foreground process entrypoint (`exec caddy run ...`).
- For Git-based services, Zeabur provides `PORT` and special variables like `${ZEABUR_WEB_URL}` / `${ZEABUR_WEB_DOMAIN}`.
- Zeabur can mount Volumes for persistence, but enabling Volumes disables zero-downtime restarts.
- PHP extensions are installed during the Docker image build.

Primary references:

```text
https://zeabur.com/docs/en-US/guides/docker
https://zeabur.com/docs/en-US/deploy/variables
https://zeabur.com/docs/en-US/data-management/volumes
```

## Repo Changes Added For Zeabur

- `Dockerfile`: installs and pins Caddy, configures `_startup` to run Caddy + php-fpm
- `Caddyfile`: app server configuration for Laravel on port `8080`
- `zbpack.json`: sets build/start commands
- `zeabur/start.sh`: runs migrations, builds caches at runtime, starts queue + scheduler, then execs `_startup`
- `composer.json`: adds required extensions for Zeabur image build (`ext-mailparse`, `ext-redis`)
- `package.json`: adds `build` script so Zeabur can build assets consistently

## Zeabur Services (Recommended)

In Zeabur, deploy **one Git service** for this repo:

- Service name: `anonaddy`
- Source: `drvova/anonaddy` (this repo)
- Runtime: Dockerfile from this repo

Also add managed services:

- MySQL
- Redis

Marketplace env var references:

```text
https://zeabur.com/docs/en-US/marketplace/mysql
https://zeabur.com/docs/en-US/marketplace/redis
```

## Volumes (Required)

Mount a Zeabur Volume on the `anonaddy` service:

- Volume ID: `anonaddy-storage`
- Mount Directory: `/var/www/storage`

Notes:

- Mounting clears the target directory contents at mount time.
- With Volumes enabled, Zeabur disables zero-downtime restarts for that service.

## Environment Variables (Baseline)

Set these on the `anonaddy` service. Values in `<>` are yours; values in `${...}` are Zeabur references you enter in the Zeabur UI (they will be expanded by Zeabur).

Laravel core:

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_KEY=<generate via: php artisan key:generate --show>`
- `APP_URL=${ZEABUR_WEB_URL}` (or set your actual custom domain URL)
- `LOG_CHANNEL=stderr`

MySQL (map Zeabur MySQL vars to Laravel DB vars):

- `DB_CONNECTION=mysql`
- `DB_HOST=${MYSQL_HOST}`
- `DB_PORT=${MYSQL_PORT}`
- `DB_DATABASE=${MYSQL_DATABASE}`
- `DB_USERNAME=${MYSQL_USERNAME}`
- `DB_PASSWORD=${MYSQL_PASSWORD}`

Redis:

- `CACHE_DRIVER=redis`
- `QUEUE_CONNECTION=redis`
- `SESSION_DRIVER=redis`
- `REDIS_CLIENT=phpredis`
- `REDIS_HOST=${REDIS_HOST}`
- `REDIS_PORT=${REDIS_PORT}`
- `REDIS_PASSWORD=${REDIS_PASSWORD}`

AnonAddy required (minimum viable):

- `ANONADDY_ADMIN_USERNAME=<your-admin-username>`
- `ANONADDY_ENABLE_REGISTRATION=false` (set `true` only while creating the first account)
- `ANONADDY_DOMAIN=<your-apex-domain>`
- `ANONADDY_HOSTNAME=<your-mail-hostname>`
- `ANONADDY_ALL_DOMAINS=<comma-separated list>`
- `ANONADDY_SECRET=<long-random-string>`

## Start/Build Commands

This repo includes `zbpack.json`:

- Build: `npm run build`
- Start: `bash zeabur/start.sh` (the script ends with `exec _startup`)

The start script also runs runtime caching (`config:cache`, `route:cache`, etc.) so it is safe to set `PHP_OPTIMIZE=false` in Zeabur if you want to disable build-time caching.

Recommended:

- `PHP_OPTIMIZE=false`

This avoids baking stale env values into cached config during image build.

## Preview Validation Only (No Production Cutover In This Phase)

This phase is intentionally scoped to Zeabur preview/staging validation only.

Run these checks against the Zeabur preview URL:

```bash
# Optional: install browser binaries if playwright-cli is already installed
playwright-cli install --skills

# Smoke checks (HTTP + browser assertions)
bash zeabur/preview-smoke.sh "https://<your-zeabur-preview-url>"
```

If these checks fail, do not promote this image to production.

## Mail Stack Reality (For Full Email Forwarding)

AnonAddy is not just a web app. Full functionality requires an actual MTA/mail stack:

- Static IP
- rDNS/PTR
- inbound SMTP (TCP 25)
- outbound SMTP delivery
- DNS records (MX/SPF/DKIM/DMARC)

Zeabur is excellent for the web app + workers + DB + Redis, but mail delivery/inbound SMTP is often better on a VPS with a static IP.

If your goal is "full AnonAddy email forwarding", plan for a separate mail host (Postfix/Rspamd) that points at the same MySQL database and uses the provided `postfix/AccessPolicy.php`.
