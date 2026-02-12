# 18 - Global Source of Truth Model

## Objective
Eliminate overlapping logic by defining one canonical configuration and capability state model used by all mail-related decisions.

## Canonical Artifacts (future implementation targets)
1. `config/mail_providers.php`
   - static provider definitions and defaults.
2. `storage/app/runtime/provider_capabilities.json` (or DB equivalent)
   - computed runtime capability snapshot with versioning.
3. `config/mail_policy.php`
   - environment-aware policy thresholds and gate rules.

## Canonical Schema

```yaml
version: integer
updated_at_utc: string
providers:
  <provider_id>:
    enabled: boolean
    capabilities: { ...normalized capability schema... }
    credentials_ref: string
policy:
  allow_production_send: boolean
  required_delivery_evidence: [transport, recipient]
  rollback_thresholds:
    max_failed_ratio: float
    max_queue_retry_ratio: float
```

## Resolution Order (No Ambiguity)
1. Runtime policy reads canonical capability record.
2. If capability record missing/invalid -> deny production route.
3. Environment variables provide credentials only, not business policy.
4. Policy decisions are logged with deterministic reason codes.

## Reason Codes (deterministic)
- `DENY_PROVIDER_DISABLED`
- `DENY_CAPABILITY_UNKNOWN`
- `DENY_EXTERNAL_DELIVERY_UNVERIFIED`
- `DENY_MISSING_RECIPIENT_EVIDENCE`
- `DENY_RATE_LIMIT_RISK_UNASSESSED`

## Governance
1. Any provider behavior update must change schema version.
2. All decision logs must include schema version and reason code.
3. No direct provider checks allowed outside policy engine.

## Operational Benefit
A single truth model removes overlapping decision paths, reduces conflict during refactors, and makes rollout behavior auditable.
