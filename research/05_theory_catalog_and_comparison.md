# 05 - Theory Catalog and Comparison

## Method
Each theory includes assumptions, predicted observations, falsification criteria, and current status from collected evidence.

## Execution Evidence Snapshot (2026-02-12 UTC)
1. E1 baseline (`MAIL_MAILER=log`) produced logged email payload and `E1_OK`.
2. Direct SMTP dialogue with `send.smtp.dev:587` returned:
   - `220 ... zone-mta`
   - `250-AUTH LOGIN PLAIN`
   - invalid auth -> `535 Authentication failed`
   - subsequent unauthenticated mail commands -> `530 Error: authentication Required`
3. Queue probes showed no failed jobs and empty Redis queue lengths.
4. App uses `CustomMailManager` + `CustomMailer`; `CustomMailer::send()` catches transport exceptions and may not rethrow in some contexts, which can mask failures during naive probes.

## T1 - "smtp.dev is production-capable for this app"

- Assumptions:
  1. smtp.dev permits reliable non-smtp.dev recipient delivery.
  2. Policy limits do not block intended production throughput.
- Predictions:
  1. External recipients receive mail under controlled tests.
  2. No policy rejection at realistic rates.
- Falsification:
  1. Hard domain restrictions or repeated policy rejections.
  2. Delivery works only for smtp.dev-managed recipients.
- Current evidence fit: weak; required recipient-side proof is missing.
- Status: `Inconclusive (not supported yet)`.

## T2 - "smtp.dev is primarily sandbox/testing"

- Assumptions:
  1. Provider design centers on testing recipients and inspection workflows.
  2. Policy guardrails constrain general-purpose production use.
- Predictions:
  1. Docs emphasize testing-oriented flows.
  2. Unrestricted production behavior is not clearly guaranteed.
- Falsification:
  1. Clear official production guidance plus measured unrestricted delivery evidence.
- Current evidence fit: strong.
- Status: `Supported`.

## T3 - "App appears healthy while delivery is non-production"

- Assumptions:
  1. Queue and scheduler can run normally regardless of final SMTP delivery state.
  2. Log transport and/or exception swallowing can produce false confidence.
- Predictions:
  1. Runtime appears healthy while external delivery evidence is absent.
  2. Some probe paths return success without proving recipient receipt.
- Falsification:
  1. End-to-end recipient-side proof for all critical flows with clear failure surfacing.
- Current evidence fit: very strong.
- Status: `Strongly Supported`.

## T4 - "Churn regression risk is high during mailer transition"

- Assumptions:
  1. Transport changes can silently alter behavior under queue + custom mail driver paths.
  2. Repeated reconfiguration without strict evidence gates causes instability.
- Predictions:
  1. Teams may misinterpret app-level success as delivery success.
  2. Regression risk rises without hard acceptance artifacts.
- Falsification:
  1. Strict gate-based rollout with recipient-side acceptance tests and rollback discipline.
- Current evidence fit: strong.
- Status: `Supported`.

## Comparative Summary

| Theory | Evidence Fit | Confidence | Practical Meaning |
|---|---|---|---|
| T1 Production-capable | Low | Medium | Needs recipient-side proof before any GO decision.
| T2 Sandbox/testing-first | High | High | Current docs/policy and current test signals align.
| T3 False-positive readiness risk | Very High | High | Current runtime and custom mailer behavior support this risk.
| T4 Transition churn risk | High | High | Strict gates are mandatory before SMTP migration claims.

## Decision Impact
Until T1 is upgraded by verified recipient-side evidence (including non-smtp.dev recipients), production adoption remains high risk.
