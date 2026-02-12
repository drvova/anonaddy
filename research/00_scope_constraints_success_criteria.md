# 00 - Scope, Constraints, Success Criteria

## Objective
Establish whether this Zeabur-hosted Laravel deployment can use `smtp.dev` for production email sending **without churn regression** and without loss of existing mail/queue features.

## Decision Frame
This research package answers a single decision:

- `GO`: smtp.dev is production-viable for this deployment under measured evidence.
- `NO-GO`: smtp.dev is not production-viable, or confidence is too low, under measured evidence.

## Definitions (Single Source of Truth)

### Working Mail Server
A mail setup is considered working only if all are true:
1. App-level mail generation succeeds.
2. Queue processing remains healthy for queued mailables/notifications.
3. External recipient delivery succeeds (not just local log output).
4. Failure/timeout/retry behavior is observable and actionable.

### Feature Parity / No Feature Loss
No regression is allowed in:
1. Queued notifications and queued mailables.
2. Password reset / verification / reminder mail flows.
3. Alias forwarding paths that enqueue outbound delivery.
4. Operational observability (logs, queue state, failure signals).

### Churn Regression
Any repeated config/deploy change loop that causes unstable behavior, false-positive readiness, or silent fallback (for example, mail logged but not actually delivered).

## Hard Constraints
1. Current app architecture is Laravel with queue-heavy email behavior.
2. Deployment target is Zeabur.
3. Primary provider under evaluation is smtp.dev.
4. Evidence quality must be explicit (high/medium/low).

## In Scope
1. SMTP fundamentals that materially affect production delivery.
2. SMTP.dev capability and policy constraints.
3. Mapping provider requirements to Laravel mail config and Zeabur runtime.
4. Risk and churn-regression controls.

## Out of Scope
1. UI/UX changes.
2. Refactoring business logic unrelated to email delivery readiness.
3. Non-email infrastructure migration.

## Success Criteria for This Research Package
1. Every major conclusion is traceable to a source URL or runtime observation.
2. Competing theories are explicitly compared and falsifiable.
3. Layered analysis links protocol -> provider -> app -> platform -> operations.
4. A clear recommendation is documented with confidence and residual risk.
