# 14 - Theory Bakeoff v2

## Objective
Re-evaluate prior theories using new SMTP.dev API evidence and architecture constraints.

## Theory Set

### T1 - "smtp.dev is production-ready for this workload"
- Support signal needed:
  1. authenticated external-domain recipient proof,
  2. stable queue + retry outcomes,
  3. no policy mismatch under realistic rates.
- Current status: `Not Supported Yet`.
- Confidence: `Medium`.

### T2 - "smtp.dev is excellent for integration/testing verification"
- Support signal:
  1. rich message/account/mailbox API,
  2. reliable listing + source retrieval,
  3. SSE update channel.
- Current status: `Supported`.
- Confidence: `High`.

### T3 - "Current app can produce false-positive send outcomes"
- Support signal:
  1. custom mailer catches exceptions,
  2. app-level probes can look successful while transport behavior differs,
  3. prior experiments confirm this risk.
- Current status: `Strongly Supported`.
- Confidence: `High`.

### T4 - "Provider abstraction + capability gates reduce churn regression"
- Support signal:
  1. one global capability model,
  2. explicit gating before deploy,
  3. provider-specific logic isolated in adapter layer.
- Current status: `Supported (architecturally)`.
- Confidence: `High`.

### T5 - "Over-abstraction increases risk for this codebase"
- Support signal:
  1. unnecessary pattern layering complicates incident response,
  2. queue/mail flows already complex,
  3. simplicity preference is explicit.
- Current status: `Supported`.
- Confidence: `High`.

## Comparative Ranking
| Rank | Theory | Status | Why |
|---|---|---|---|
| 1 | T3 | Strongly Supported | Direct code + runtime evidence.
| 2 | T2 | Supported | API shape strongly matches testing workflows.
| 3 | T4 | Supported | Best anti-churn path for long-term flexibility.
| 4 | T5 | Supported | Aligns with maintainability and conflict reduction goals.
| 5 | T1 | Not Supported Yet | Missing decisive recipient-side production evidence.

## Decision Impact
Operationally, the safest path is: **provider-agnostic architecture + strict evidence gates** before any production claim.
