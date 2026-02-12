# 15 - Layered Fundamentals v2

## Objective
Formalize a stable reasoning stack from protocol truth to production operations.

## L0 - Protocol Layer (SMTP/TLS)
1. SMTP session validity and auth are non-negotiable.
2. SMTP acceptance does not equal final inbox delivery.
3. Failure classes (`auth`, `routing`, `policy`, `rate`) must be separately observable.

## L1 - Provider Layer (smtp.dev API + SMTP)
1. API gives strong observability for test entities.
2. SMTP endpoint is reachable and auth-gated.
3. External-domain behavior remains evidence-dependent.

## L2 - Application Layer (Laravel + Custom Mailer)
1. Queue-heavy flows are core functional requirement.
2. Custom mail manager/mailer modifies default failure surfaces.
3. App-level success signals must be verified against transport/recipient outcomes.

## L3 - Platform Layer (Zeabur Runtime)
1. Environment variables are authoritative runtime inputs.
2. Volumes are explicit opt-in for persistence and have restart tradeoffs.
3. Deployment and runtime checks must be repeated post-change.

## L4 - Operations Layer
1. No production switch without evidence bundle.
2. Rollback criteria must be objective and pre-defined.
3. Monitoring must include queue, transport, and recipient confirmation indicators.

## Cross-Layer Invariants
1. If any layer lacks required evidence, higher-layer `GO` is invalid.
2. Contradictions cannot be waived by assumptions.
3. Single-source capability config must drive all routing/policy decisions.

## Layer-Coupling Risks
1. L2 custom behavior can hide L0/L1 failures.
2. L3 config drift can invalidate L2 assumptions.
3. L4 incidents become noisy if L1/L2 observability is weak.

## Layered Conclusion
The layered model confirms the same operational truth: **delivery proof must be recipient-validated and cross-checked against transport behavior, not inferred from app logs alone.**
