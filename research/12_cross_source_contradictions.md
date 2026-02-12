# 12 - Cross-Source Contradictions Register

## Objective
Resolve factual conflicts across vendor docs, framework docs, platform docs, and runtime behavior.

## Contradiction Matrix

| ID | Statement A | Statement B | Evidence | Current Resolution |
|---|---|---|---|---|
| C1 | smtp.dev has broad API + SMTP capabilities. | Prior working assumption treated provider as possibly production-ready by default. | `11_smtp_dev_api_deep_profile.md`, runtime probes | Keep `INCONCLUSIVE` until recipient-side proof on non-smtp.dev domains.
| C2 | App-level send probe can return success. | Bad SMTP credentials should fail hard. | `app/CustomMailDriver/CustomMailer.php:149` catch path + E2 low-level dialogue | App-level probe is not authoritative alone; enforce transport/recipient evidence.
| C3 | Laravel default mailer in config is `smtp`. | Live runtime currently uses `MAIL_MAILER=log`. | `config/mail.php:16`, Zeabur env snapshot | Runtime overrides config default; treat env snapshot as execution truth.
| C4 | Zeabur supports persistent volumes. | Current service state previously observed as non-persistent without mounted volume. | Zeabur volume docs + prior runtime persistence checks | No contradiction; capability exists but must be explicitly mounted.
| C5 | Queue appears healthy in sampled windows. | Delivery certainty remains unknown. | `queue:failed`, queue lengths, scheduler logs vs recipient evidence gap | Queue health != recipient delivery proof.

## Resolution Rules
1. Runtime observations take precedence over static assumptions.
2. Recipient-side evidence takes precedence over app log evidence for delivery claims.
3. Vendor API documentation defines interface contract, not guaranteed operational outcomes under all policies.
4. If unresolved contradiction touches production safety, verdict remains `NO-GO`.

## Outstanding Contradictions
1. `C1` remains unresolved until authenticated E3/E4/E6 complete with recipient confirmations.

## Actionable Outcomes
1. Add mandatory evidence bundle to every mail transport change.
2. Promote contradiction checks to pre-deploy gate.
3. Prevent churn by blocking config toggles that do not close contradictions.
