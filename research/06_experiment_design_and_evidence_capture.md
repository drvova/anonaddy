# 06 - Experiment Design and Evidence Capture

## Objective
Run minimal, high-signal experiments that conclusively answer production viability while protecting against churn regression.

## Preconditions
1. Snapshot current variables and runtime logs.
2. Store a baseline acceptance checklist before changing mail transport.
3. Define rollback threshold before test execution.

## Test Matrix and Current Execution State

| Test ID | Scenario | Expected Success Evidence | Current Status | Notes |
|---|---|---|---|---|
| E1 | Baseline sanity (`MAIL_MAILER=log`) | Mail appears in logs only | Completed | Baseline confirmed with logged payload and `E1_OK`.
| E2 | SMTP transport reachability/auth | SMTP dialogue + auth behavior captured | Completed (partial) | Endpoint reachable; invalid auth returns `535`; unauth mail commands blocked with `530`.
| E3 | smtp.dev recipient delivery | Message visible in smtp.dev inbox/API | Blocked | Missing smtp.dev account/API context and created recipient.
| E4 | External domain delivery | Inbox receipt at non-smtp.dev mailbox | Blocked/Inconclusive | Missing valid creds + recipient-side proof.
| E5 | Queue-path validation | Processed jobs and stable queue indicators | Completed (partial) | No failed jobs; queue lengths at 0; scheduler loop present.
| E6 | Rate/limit edge | Controlled burst with stable outcomes or explicit limits | Blocked | Requires authenticated sending + recipient verification harness.

## Evidence to Capture Per Test
1. Exact config snapshot (`MAIL_*`, queue config, timestamp).
2. Command/action used to trigger send.
3. App runtime logs for transport-level outcomes.
4. Queue processing evidence (processed/failed/retried).
5. Recipient-side proof (smtp.dev inbox/API and external inbox result).

## Evaluation Rules
1. No test is "pass" without recipient-side evidence when validating delivery.
2. Logs alone are insufficient for production-viability claim.
3. Any contradictory evidence downgrades confidence and blocks GO decision.
4. In this codebase, app-level send success must be cross-checked because custom mailer behavior can suppress some transport exceptions.

## Regression Checkpoints (Before and After Each Change)
1. Scheduler still running.
2. Queue processing still functioning.
3. Password reset and verification notifications still dispatch.
4. No silent fallback to `log` transport.
5. Recipient-side evidence exists for critical flows.

## Remaining Execution Prerequisites
1. Valid smtp.dev SMTP credentials.
2. smtp.dev-created recipient and API/inbox verification access.
3. One external mailbox target for non-smtp.dev delivery check.
4. Defined burst profile for E6 rate/limit testing.
