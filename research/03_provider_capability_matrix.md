# 03 - Provider Capability Matrix (Layer L1: smtp.dev)

## Objective
Determine whether smtp.dev capabilities and policies match production outbound requirements for this app.

## Capability Matrix

| Capability Area | Evidence | Observed State | Confidence | Decision Impact |
|---|---|---|---|---|
| Recipient model | S1 (Getting Started), S2 (List Emails API) | Strong testing/inbox-inspection orientation | High | Supports QA use strongly.
| Programmatic inbox access | S2 | API supports recipient-specific email listing | High | Useful for automated validation.
| Abuse/limit policy posture | S3 | Published constraints/anti-abuse guardrails exist | Medium/High | Potential production blocker depending on workload.
| SMTP endpoint reachability | Live E2 dialogue (`send.smtp.dev:587`) | Endpoint reachable; EHLO advertises `AUTH LOGIN PLAIN` | High | SMTP connectivity is feasible from Zeabur runtime.
| Authentication requirement | Live E2 dialogue | Invalid creds -> `535`; unauthenticated envelope commands -> `530` | High | Valid credentials are mandatory for meaningful send tests.
| External recipient production guarantee | No direct guarantee in collected docs + no completed recipient-side proof yet | Unproven | Medium | Blocks GO decision.

## Theory Pressure From Provider Evidence
1. smtp.dev is clearly usable for testing workflows.
2. Transport endpoint is reachable and operational from current deployment.
3. Production viability remains unresolved until authenticated recipient-side tests (smtp.dev + external domains) are completed.

## Open Questions (must be answered by live tests)
1. Can authenticated smtp.dev SMTP sessions deliver reliably to non-smtp.dev recipient domains?
2. Are policy limits hard-fail, throttled, or soft-limited at intended usage patterns?
3. What delivery evidence can be captured consistently for operational monitoring?

## Interim Provider Position
Based on current sources plus live probes, smtp.dev is **confirmed useful for testing and authenticated SMTP transport**, while **production viability for this deployment remains unproven**.
