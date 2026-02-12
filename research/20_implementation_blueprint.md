# 20 - Implementation Blueprint (Decision-Complete)

## Objective
Provide an implementation-ready sequence for introducing provider-agnostic mail architecture without feature loss or churn regression.

## Workstream A - Foundation Refactor
1. Introduce capability schema artifact and loader.
2. Add `ProviderFactory` with strict config validation.
3. Add `MailProviderAdapter` interface and smtp.dev adapter.
4. Add `DeliveryPolicyEngine` with deterministic reason codes.
5. Add `MailObservabilityFacade` with correlation IDs.

## Workstream B - Integration
1. Integrate policy engine in queued send paths.
2. Route provider interactions through adapter only.
3. Preserve existing behavior behind compatibility switch during migration.
4. Wire recipient verification workers (API/SSE polling path).

## Workstream C - Validation
1. Execute gate matrix `G1..G7`.
2. Re-run blocked experiments E3/E4/E6 with real credentials and recipient proofs.
3. Update contradiction register and decision memo.
4. Remove compatibility switch only after all gates pass.

## Implementation Order (Files)
1. `config/mail_providers.php` (new)
2. `config/mail_policy.php` (new)
3. `app/Mail/Provider/MailProviderAdapter.php` (new)
4. `app/Mail/Provider/SmtpDevAdapter.php` (new)
5. `app/Mail/Provider/ProviderFactory.php` (new)
6. `app/Mail/Policy/DeliveryPolicyEngine.php` (new)
7. `app/Mail/Observability/MailObservabilityFacade.php` (new)
8. Integration edits in queue/mail command paths (existing files).

## Acceptance Criteria
1. No critical flow regression across reset/verify/reminder/queued notifications.
2. All send decisions trace to canonical capability + policy data.
3. App-level success is cross-validated by recipient evidence where required.
4. Queue reliability metrics remain within thresholds.
5. Rollback executes cleanly with documented artifact trail.

## Commit Plan
1. Commit 1: capability schema + factory + interfaces.
2. Commit 2: adapter + policy engine.
3. Commit 3: observability facade + integration points.
4. Commit 4: verification worker + gate automation.
5. Commit 5: docs updates + final decision memo refresh.

## Rollback Plan
1. Revert to previous mail routing path via compatibility switch.
2. Restore last-known-good env and deployment id.
3. Archive incident evidence bundle.
4. Reopen contradiction item with explicit failed gate references.

## Non-Negotiables
1. No placeholders/stubs in shipped code.
2. No direct provider branching outside adapter/policy layers.
3. No go-live without recipient-side evidence for critical flows.
