# 13 - Provider Capability Normalization (Single Source of Truth Input)

## Objective
Normalize provider features into one global capability schema so business logic does not branch directly on provider-specific details.

## Capability Schema (v1)

```yaml
provider_id: string
transport_modes:
  smtp: boolean
  api_send: boolean
  api_inbox_read: boolean
  realtime_events_sse: boolean
auth_model:
  smtp_auth_required: boolean
  api_key_header: string|null
rate_limits:
  api_qps_per_ip: integer|null
  smtp_rate_limit_known: boolean
recipient_policy:
  allows_external_domains: enum[yes,no,unknown]
  test_domain_only: enum[yes,no,unknown]
observability:
  message_listing: boolean
  raw_source_download: boolean
  attachment_download: boolean
  event_stream: boolean
operational_risk:
  policy_uncertainty: enum[low,medium,high]
  delivery_proof_required: boolean
```

## Normalized Entry (smtp.dev, based on current evidence)

```yaml
provider_id: smtp_dev
transport_modes:
  smtp: true
  api_send: false
  api_inbox_read: true
  realtime_events_sse: true
auth_model:
  smtp_auth_required: true
  api_key_header: X-API-KEY
rate_limits:
  api_qps_per_ip: 2048
  smtp_rate_limit_known: false
recipient_policy:
  allows_external_domains: unknown
  test_domain_only: unknown
observability:
  message_listing: true
  raw_source_download: true
  attachment_download: true
  event_stream: true
operational_risk:
  policy_uncertainty: high
  delivery_proof_required: true
```

## Decision Rules Against Capability Schema
1. If `allows_external_domains != yes`, production verdict cannot be `GO`.
2. If `delivery_proof_required == true` and evidence bundle missing, verdict cannot be `GO`.
3. If `smtp_rate_limit_known == false`, burst behavior must be tested before enabling production sending.

## Integration Guidance
1. Capability schema must live in one canonical config artifact.
2. All routing/policy decisions read from this schema only.
3. Provider adapters may enrich runtime facts, but cannot bypass schema checks.
