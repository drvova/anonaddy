# 10 - Experiment Execution Log (2026-02-12)

## Scope
Execution of planned experiments E1-E6 against live Zeabur deployment.

- Service: `anonaddy` (`698e0f00eceac33904f68a05`)
- Environment: `698821672579f38ed02c5f46`
- Deployment reference: `698e1b44c1cc55cd793c53d8`
- Time window: 2026-02-12 19:06Z - 19:10Z

## E1 - Baseline Sanity (Current Log Transport)

### Action
Triggered mail probe via Laravel tinker under current runtime config.

### Result
`PASS (as designed for baseline)`

### Evidence
- Runtime config includes `MAIL_MAILER=log`.
- Probe output included full logged message payload and `E1_OK`.

### Interpretation
Baseline proves app can generate mail content, but this does not prove external delivery.

## E2 - SMTP Transport Reachability/Auth Behavior

### Action A (Network + protocol)
Manual SMTP dialogue to `send.smtp.dev:587`.

### Evidence
- Banner: `220 ... zone-mta`
- EHLO capability includes `AUTH LOGIN PLAIN`
- Invalid auth -> `535 Authentication failed`
- Unauthenticated `MAIL FROM`/`RCPT TO` -> `530 Error: authentication Required`

### Result
`PASS (transport endpoint reachable; auth required)`

### Action B (Laravel probe caveat)
Laravel probe commands returned success strings even with intentionally bad SMTP host/creds.

### Interpretation
App-level probe is **not reliable alone** because this codebase uses a custom mail driver path that can mask transport failures in certain contexts.

## E3 - smtp.dev Recipient Delivery

### Planned Goal
Send to smtp.dev-created recipient and verify via provider inbox/API.

### Result
`BLOCKED`

### Blocker
No smtp.dev account/API context and no created test recipient available in current environment.

## E4 - External Recipient Delivery

### Planned Goal
Send to non-smtp.dev mailbox and verify receipt.

### Result
`INCONCLUSIVE / BLOCKED`

### Why
- Direct SMTP checks confirm auth is mandatory.
- Without valid credentials and recipient-side inbox confirmation, delivery cannot be validated.
- App-level success output is not sufficient evidence in this codebase.

## E5 - Queue Path Validation

### Action
1. Checked failed jobs.
2. Checked Redis queue lengths.
3. Checked runtime logs for scheduler activity.

### Result
`PARTIAL PASS`

### Evidence
- `queue:failed`: no failed jobs.
- Redis queue lengths:
  - `queues:default=0`
  - `queues:default:reserved=0`
- Scheduler loop logs present (`No scheduled commands are ready to run`).

### Caveat
Process-level worker introspection is limited in this container (`ps` unavailable), so evidence is log/data based.

## E6 - Rate/Limit Edge Behavior

### Planned Goal
Small controlled burst to observe provider throttling/policy behavior.

### Result
`BLOCKED`

### Blocker
Requires authenticated send capability and recipient-side verification setup.

## New Finding: Probe Reliability Risk in App Mail Layer

### Finding
`app/CustomMailDriver/CustomMailer.php` catches send exceptions; in specific contexts it may not rethrow, which can produce false-positive probe outcomes.

### Impact
Do not treat a simple app-level "send command returned OK" as delivery proof.

## Execution Outcome Summary

| Experiment | Status | Confidence | Notes |
|---|---|---|---|
| E1 | Pass | High | Confirms log-transport baseline only.
| E2 | Pass (partial) | High | SMTP endpoint reachable; auth required.
| E3 | Blocked | High | Missing smtp.dev recipient/API context.
| E4 | Inconclusive/Blocked | Medium/High | Missing valid auth + recipient-side proof.
| E5 | Partial Pass | Medium/High | Queue health signals look good.
| E6 | Blocked | High | Missing authenticated test setup.

## Required Inputs to Complete E3/E4/E6
1. Valid smtp.dev SMTP credentials.
2. smtp.dev-created recipient for inbox/API verification.
3. One external mailbox target for non-smtp.dev receipt check.
4. Acceptable test burst envelope for limit testing.
