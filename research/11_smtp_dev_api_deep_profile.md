# 11 - SMTP.dev API Deep Profile

## Objective
Create a precise, source-backed profile of `smtp.dev` API capabilities and limits, then map those capabilities to this repository's operational needs.

## Source Snapshot
- Primary page analyzed: `https://smtp.dev/docs/api/` (retrieved 2026-02-12 UTC).
- Supplemental context: `https://smtp.dev/docs/getting-started/`.

## Core API Facts

### 1. Protocol and Spec
1. API documentation is described as OpenAPI v3 based.
2. API is resource-oriented with collection/item endpoints.
3. Error model is HTTP status based and explicit.

### 2. Authentication
1. API calls require `X-API-KEY` header.
2. Missing/invalid key maps to `401` semantics.
3. Token creation API returns token value once at creation time.

### 3. Resource Model
1. `Domain` resources:
   - list/create/get/update/delete.
2. `Account` resources:
   - list/create/get/update/delete.
   - includes mailbox relationship.
3. `Mailbox` resources:
   - list/create/get/update/delete under account.
4. `Message` resources:
   - list/get/update/delete.
   - source retrieval, download, move, attachment download.
5. `Token` resources:
   - list/create/get/delete.

### 4. Error + Rate Model
1. Success range described as `200`, `201`, `204`.
2. Validation and request faults include `400`, `422`.
3. Throttling exposed as `429 Too Many Requests`.
4. Published general quota: `2048 QPS per IP` for API.

### 5. Real-Time Delivery Observation Channel
1. API docs describe Mercure SSE endpoint:
   - `https://mercure.smtp.dev/.well-known/mercure`.
2. Topic model keyed by account path.
3. Event payload types include `Account`, `Mailbox`, `Message` updates.

## Production-Relevance Assessment

### High-Value Strengths
1. Strong API surface for deterministic test account and message lifecycle.
2. Explicit auth + error contract simplifies integration hardening.
3. SSE support reduces polling overhead and allows fast verification loops.

### Decision-Risk Areas (still unresolved)
1. API capability does not automatically prove unrestricted outbound delivery policy.
2. API rate limits are clear, but SMTP-side policy and recipient-domain behavior must still be empirically validated.
3. Docs are testing-oriented in framing; production assumptions require stronger evidence.

## Mapping to This Repository
1. This codebase is queue-heavy and mail-intensive.
2. API-level mail inspection can support regression verification harnesses.
3. App custom mailer behavior means transport/API observability must be treated as first-class evidence, not optional diagnostics.

## Evidence Record
| Claim | Source | Confidence | Impact |
|---|---|---|---|
| API key auth via `X-API-KEY` is required. | smtp.dev API docs | High | Security and integration contract.
| `429` is the documented throttling code. | smtp.dev API docs | High | Required for retry/backoff strategy.
| Resource model supports domains/accounts/mailboxes/messages/tokens. | smtp.dev API docs | High | Enables end-to-end automation design.
| Mercure SSE channel is available for real-time updates. | smtp.dev API docs | Medium/High | Useful for faster verification pipelines.

## Conclusion
`smtp.dev` offers a comprehensive **testing and message-observation API**. This significantly improves automated verification workflows, but it does not by itself close production-deliverability risk for this app.
