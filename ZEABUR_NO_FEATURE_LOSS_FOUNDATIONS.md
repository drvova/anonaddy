# Zeabur No-Feature-Loss Foundations (AnonAddy)

## Purpose
Define the base deployment theory and guardrails so Zeabur rollout preserves core product behavior (web app, queue/scheduler, storage-backed workflows, and dependency connectivity) without silent regressions.

## Current Verified State (2026-02-12)
- Project: `69882167db63a2cc72043511`
- Environment: `698821672579f38ed02c5f46`
- Services:
  - App: `anonaddy` (`698e0f00eceac33904f68a05`) `RUNNING`
  - DB: `mysql` (`698e0eda41ffaebc08e95836`) `RUNNING`
  - Cache/Queue: `redis` (`698e0ee441ffaebc08e95841`) `RUNNING`
- Active app deployment: `698e174dc1cc55cd793c531f` (`RUNNING`)
- Public domain: `anonaddy-698e0f00.zeabur.app` (`PROVISIONED`)
- HTTPS behavior (validated):
  - `http://anonaddy-698e0f00.zeabur.app` -> `302` to `https://.../`
  - `https://anonaddy-698e0f00.zeabur.app` -> `302` to `https://.../login`
  - `https://anonaddy-698e0f00.zeabur.app/login` -> `200`

## Root Causes Already Solved
1. Build-time dependency leak:
- Composer scripts touched Redis during Docker build and failed because runtime service DNS is unavailable in build context.
- Fix: force `CACHE_DRIVER=file` only during `composer install` at build stage.

2. Reverse-proxy scheme mismatch:
- App generated `http` redirect targets behind Zeabur ingress.
- Fix: trust proxy headers in `bootstrap/app.php` via `trustProxies(...)` with forwarded header flags.

## Official Zeabur Constraints (Primary Sources)
- Laravel guide: Zeabur supports Laravel deploy flow and runtime optimization behavior.
  - https://zeabur.com/docs/en-US/guides/php/laravel
- Volumes: mounting persistence disables zero-downtime restart and can clear mounted directory on first mount.
  - https://zeabur.com/docs/en-US/data-management/volumes
- Public networking/domain behavior and port mapping model.
  - https://zeabur.com/docs/en-US/networking/public
- Private networking for service-to-service hostname resolution.
  - https://zeabur.com/docs/en-US/networking/private
- Env variable model and special variable/reference precedence.
  - https://zeabur.com/docs/en-US/deploy/variables
- Command execution for runtime validation and operational checks.
  - https://zeabur.com/docs/en-US/deploy/command-execution

## Fundamental Layer Model
Layer 0: Platform/Networking
- Public domain + HTTPS termination at Zeabur edge.
- Private hostnames for MySQL/Redis service links.

Layer 1: Runtime Contract
- App process must run web + queue worker + scheduler in one runtime contract unless storage workflow is redesigned.
- Runtime env is the source of truth (not build-time assumptions).

Layer 2: Stateful Data
- DB + Redis are external state.
- `storage` directory is local state and must be persisted if workflows depend on file artifacts/logs/temporary retention.

Layer 3: App Behavior
- Laravel caches built from runtime env.
- Migrations, storage symlink, queue/scheduler startup are part of boot contract.

## Deployment Theories (Ranked)
### Theory 1 (Best Now): Single App Service + Persistent `/var/www/storage`
- Keep current topology (web + queue + scheduler together).
- Mount one volume to `/var/www/storage`.
- Lowest behavior drift risk.

### Theory 2 (Scale-First): Split Web/Worker/Scheduler Services
- Only after removing local storage coupling or introducing shared storage backend.
- Higher operational complexity and stronger consistency requirements.

### Theory 3 (Hybrid Mail Plane)
- Keep app/control plane on Zeabur, move full SMTP-heavy mail plane to dedicated infra if needed.
- Useful when mail deliverability/network policy needs exceed shared PaaS assumptions.

## No-Feature-Loss Guardrails
1. Do not reintroduce build-time calls to runtime network services.
2. Keep proxy trust configured for correct HTTPS URL generation.
3. Preserve startup sequence: migrate -> storage link -> cache warm -> queue/scheduler -> php-fpm/nginx.
4. Keep Redis queue/session/cache contract consistent with runtime env values.
5. Apply volume mount carefully:
- Backup current `/var/www/storage` before first mount.
- Rehydrate necessary data after mount if needed.
6. Treat runtime logs as acceptance source of truth after every deploy.

## Acceptance Matrix
- Availability:
  - Service status `RUNNING`
  - Domain status `PROVISIONED`
- HTTP correctness:
  - HTTP upgrades to HTTPS
  - HTTPS redirects remain HTTPS
  - login page returns `200`
- Runtime contract:
  - Migrations succeed (or no-op)
  - Queue worker active
  - Scheduler loop active
- Dependency health:
  - MySQL reachable
  - Redis reachable
- Data durability:
  - `storage` contents persist across restart/redeploy (after volume mount)

## Remaining Mandatory Action
- Mount Zeabur Volume at `/var/www/storage` and validate persistence with a write/restart/read check.
- Note: this introduces brief restart downtime by platform design once volume is enabled.

## Operational Sequence for Next Change
1. Snapshot/backup any required data under `storage`.
2. Mount volume to `/var/www/storage`.
3. Restart service.
4. Run post-restart checks from Acceptance Matrix.
5. If any check fails, rollback by reverting last config/code change and redeploy previous known-good commit.

- Persistence probe trigger commit: `1458e1f` (2026-02-12)
