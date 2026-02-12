# 04 - Platform + Runtime Mapping (Layer L2/L3: Laravel + Zeabur)

## Local Application Mapping

### Mail Transport Contract in Code
- `config/mail.php` defaults to `env('MAIL_MAILER', 'smtp')`.
- SMTP mailer keys include host/port/encryption/username/password/`MAIL_EHLO_DOMAIN`/`MAIL_VERIFY_PEER`.
- `log` transport is also configured.
- Evidence: `config/mail.php:16`, `config/mail.php:37-47`, `config/mail.php:66-69`.

### Custom Mail Driver Behavior (Critical)
- App overrides default mail manager via `CustomMailServiceProvider`.
- `CustomMailer::send()` wraps `sendSymfonyMessage()` in `try/catch` and may suppress exceptions depending on context/data.
- Evidence:
  - `app/Providers/CustomMailServiceProvider.php:16-24`
  - `app/CustomMailDriver/CustomMailManager.php:16-33`
  - `app/CustomMailDriver/CustomMailer.php:149-170`

Implication: naive app-level send probes can return success without proving external delivery.

### Expected Env Shape
- Repo template expects SMTP fields and from-address identity.
- Evidence: `.env.example:32-40`.

### Queue-Critical Behavior
- Multiple mail/notification classes implement `ShouldQueue`.
- Command paths enqueue outbound mail (`Mail::to(...)->queue(...)`).
- Evidence: `app/Mail/*.php`, `app/Notifications/*.php`, `app/Console/Commands/ReceiveEmail.php:279,322,410`, `app/Models/FailedDelivery.php:195`.

## Zeabur Runtime Mapping

### Startup Behavior in This Repository
- Startup script runs migrations, builds caches, starts queue worker loop and scheduler loop, then web process.
- Evidence: `zeabur/start.sh:22-58`.

### Live Runtime Snapshot (2026-02-12 UTC)
- `MAIL_MAILER=log`
- `MAIL_FROM_ADDRESS=mailer@example.com`
- `QUEUE_CONNECTION=redis`
- Scheduler loop logs are present (`No scheduled commands are ready to run`).
- `queue:failed` showed no failed jobs.
- Redis queue lengths observed as `0` for default and reserved queues at sample time.
- Evidence: runtime variable/log captures + live probes.

## Gap Analysis (Docs vs Runtime)

| Requirement | Desired for Production SMTP | Current Runtime | Gap |
|---|---|---|---|
| Active SMTP transport | `MAIL_MAILER=smtp` | `MAIL_MAILER=log` | High |
| SMTP endpoint/auth values | Host/port/user/pass/encryption set | Not present in current live env snapshot | High |
| Sender identity validity | Verified sender/domain alignment | Placeholder-style sender in env | High |
| Queue health observability | Worker/scheduler state + mail failure signals | Scheduler and queue indicators present, but delivery proof missing | Medium |
| Probe reliability | App-level send result reflects real transport outcome | Custom mailer can mask some transport failures | High |

## Churn-Sensitive Hotspots
1. Switching mailer and credentials without baseline evidence can mask regressions.
2. Queue + mail transport changes can appear healthy while silently failing external delivery.
3. Deploy/redeploy cycles require post-change recipient-side verification, not config-only assumptions.
4. Custom mailer exception handling increases false-positive risk in ad-hoc probes.

## Current Readiness Statement
Current runtime is **not configured for real SMTP sending**; it is configured for log transport. Any production claim is invalid until SMTP variables are set and recipient-side delivery is proven.
