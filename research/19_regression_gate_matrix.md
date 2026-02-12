# 19 - Regression Gate Matrix

## Objective
Prevent churn regression by enforcing explicit go/no-go gates across development, staging, and production transitions.

## Gate Matrix

| Gate ID | Stage | Requirement | Evidence | Block Condition |
|---|---|---|---|---|
| G1 | Pre-change | Baseline snapshot captured | env + queue + runtime log bundle | Missing baseline artifacts |
| G2 | Config | SMTP and provider config completeness | canonical config validation output | Missing required keys/capabilities |
| G3 | Transport | Authenticated SMTP/API send path verified | low-level transport evidence | Auth/path failures unresolved |
| G4 | Recipient | Recipient-side proof for target classes | smtp.dev inbox/API + external inbox proof | No recipient confirmation |
| G5 | Queue | Queue stability and retry envelope healthy | queue metrics + failed job checks | Retry/failure thresholds exceeded |
| G6 | Observability | Correlated event chain available | trace/log with correlation ID | Missing correlation or blind spots |
| G7 | Rollback | Rollback procedure validated | tested rollback runbook output | Rollback not executable |

## Threshold Defaults
1. `max_failed_ratio <= 1%` during validation window.
2. `max_queue_retry_ratio <= 2%` during validation window.
3. `critical_flow_delivery_success = 100%` for sampled reset/verify/reminder flows.

## Critical Flow Set
1. Password reset.
2. Email verification.
3. Username reminder.
4. Representative queued notification.

## Drift Watchers
1. Deploy-time watcher: compare runtime `MAIL_*` against canonical config.
2. Queue watcher: alert on failed/retry spikes.
3. Delivery watcher: alert when recipient confirmations lag beyond SLA.

## Gate Enforcement Rule
Any failed gate blocks progression and requires contradiction register update before next attempt.
