# 07 - Churn Regression Guardrails

## Goal
Prevent unstable config/deploy loops while transitioning from logging transport to real SMTP behavior.

## Baseline Manifest (must be captured before change)
1. Current `MAIL_*` variables.
2. `QUEUE_CONNECTION` and worker mode.
3. Last-known-good deployment ID.
4. Known-good user flows: login, password reset, verify email, queued notification.

## Invariants (Non-Negotiable)
1. External recipient delivery proof remains available.
2. Queue worker continues processing without backlog growth.
3. Scheduler remains healthy.
4. No fallback to `MAIL_MAILER=log` unless explicitly in rollback state.

## Change Gates
1. Gate A - Config Completeness:
   - `MAIL_MAILER=smtp`
   - `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`
   - Valid `MAIL_FROM_ADDRESS` and aligned sender identity
2. Gate B - Functional Verification:
   - At least one smtp.dev recipient success and one non-smtp.dev recipient success.
3. Gate C - Queue Verification:
   - Queued mail/notifications process without sustained failures.

## Rollback Triggers
1. Repeated transport authentication/TLS failures.
2. External recipients fail while app logs indicate message generation.
3. Queue retries spike above accepted threshold.
4. User-critical flow (reset/verify) fails.

## Rollback Actions
1. Revert to last-known-good deployment/config baseline.
2. Preserve incident evidence bundle (logs + config snapshot + test outputs).
3. Update theory status and risk register before next attempt.

## Drift Detection Cadence
1. After every mail config change.
2. After every redeploy affecting runtime startup.
3. Weekly smoke checks for delivery and queue health.

## Anti-Churn Rule
No iterative config change is allowed unless the previous change has a recorded pass/fail artifact and decision note.
