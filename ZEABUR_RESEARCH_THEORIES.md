# Zeabur Research Notes and Deployment Theories (AnonAddy)

## Goal
Deploy this repo on Zeabur with no loss of core product behavior (alias management, forwarding pipeline dependencies, failed-delivery handling, queue/scheduler jobs, admin flow).

## Live MCP Snapshot (2026-02-12)
- Project: `69882167db63a2cc72043511`
- Environment: `698821672579f38ed02c5f46`
- Services:
  - `mysql` (`698e0eda41ffaebc08e95836`) status `RUNNING`
  - `redis` (`698e0ee441ffaebc08e95841`) status `RUNNING`
  - `anonaddy` (`698e0f00eceac33904f68a05`) status `RUNNING`
- Latest deployment:
  - `698e140ac1cc55cd793c5232` status `RUNNING`
  - Runtime evidence: startup script executed migrations, created storage symlink, warmed config/route/view/event caches, started queue worker + scheduler, and reached php-fpm ready state.
- Previous failures:
  - `698e12c3c1cc55cd793c51d7`, `698e1402c1cc55cd793c5230`
  - Root cause: Composer post-autoload script touched Redis during image build, but runtime Redis host is not resolvable in build context.

## Confirmed Working Fixes Already Applied
- Custom `Dockerfile` is in place and used by Zeabur MCP deploy.
- Build-time Composer now forces a safe build context (`CACHE_DRIVER=file`) while keeping runtime Redis for production.
- Runtime startup script (`zeabur/start.sh`) creates/chowns runtime directories, runs migrations, warms caches, starts queue + scheduler, then execs Zeabur-compatible `_startup`.

## Theory Set (No-Feature-Loss Paths)

### Theory A (Current and Recommended): Single Zeabur App Service + Volume
Use one app service for web + queue + scheduler and mount volume at `/var/www/storage`.

Why this is safest now:
- Failed deliveries and related storage-backed behavior rely on local disk (`storage/app`) in this codebase.
- Splitting web and worker into separate Zeabur services can break cross-service visibility of failed-delivery artifacts.
- One service avoids storage consistency gaps and preserves behavior without immediate code refactor.

Required controls:
- Mount persistent volume to `/var/www/storage`.
- Keep runtime job processes inside same container/service.
- Keep Redis and MySQL as managed dependencies.

### Theory B: Split Web/Worker/Scheduler Services (Only with Storage Refactor)
Split services for scalability only after replacing local failed-delivery storage with shared object storage or equivalent shared backend.

Tradeoff:
- Better horizontal scaling and isolation.
- Requires code and data flow changes, migration plan, and careful compatibility testing.

### Theory C: Hybrid Production Model
Run web app on Zeabur, but keep full mail transport stack (Postfix + Rspamd + DNS-driven SMTP inbound/outbound requirements) on a dedicated mail host/VPS.

Why this is practical:
- Full mail stack requirements (port 25, reputation, PTR/rDNS, SMTP reliability, DKIM/DMARC operational control) are specialized.
- Zeabur can host app/control-plane dependencies while mail-plane runs where SMTP constraints are better handled.

## Current Risk Register
- Service is healthy (`RUNNING`), but no custom domain is attached yet on the service object.
- Volume persistence still must be verified on `/var/www/storage` to guarantee failed-delivery durability across redeploys.
- Current mail settings use `MAIL_MAILER=log`, which is acceptable for bootstrap diagnostics but not full outbound mail behavior.

## No-Feature-Loss Validation Checklist
1. Deployment reaches `RUNNING` and service status transitions from `STARTING` to `RUNNING`.
2. App root responds successfully over Zeabur web URL.
3. `php artisan migrate --force` ran successfully on boot (or schema already up to date).
4. Queue worker remains alive and processes jobs.
5. Scheduler loop remains alive.
6. Volume mounted at `/var/www/storage` and persists across restart/redeploy.
7. Failed delivery artifacts can be created/read/cleaned as expected.
8. Redis and MySQL connectivity stable from runtime context.
9. Admin bootstrap flow works (`ANONADDY_ADMIN_USERNAME`, registration policy as intended).
10. Mail path design is explicitly selected:
   - Bootstrap mode (log mailer) for bring-up, or
   - Full SMTP/mail-stack mode for production forwarding/send behavior.

## Suggested Next MCP Actions
1. Poll deployment + service until `RUNNING` or `FAILED`.
2. If `FAILED`, read newest runtime/build logs and classify startup phase (image pull, container start, runtime script, migrations, app boot).
3. On first `RUNNING`, attach domain and verify HTTP health.
4. Confirm volume mount to `/var/www/storage` in Zeabur UI.
5. Decide mail-plane target (Zeabur-only bootstrap vs hybrid with dedicated mail host) before calling deployment feature-complete.

## Notes on Environment Hygiene
- Keep runtime-only service host vars (`MYSQL_HOST`, `REDIS_HOST`) in Zeabur variables.
- Avoid build-time dependence on runtime network hosts.
- Keep APP/DB/Redis values minimal and explicit; avoid drift between build and runtime assumptions.
