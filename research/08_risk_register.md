# 08 - Risk Register

| Risk ID | Risk | Severity | Likelihood | Trigger | Detection | Mitigation |
|---|---|---|---|---|---|---|
| R1 | Provider policy/domain limits block production recipients | Critical | Medium/High | External-domain sends fail or get rejected | Provider/API/log evidence + inbox non-receipt | Confirm policy upfront; stop rollout if contradiction appears.
| R2 | False-positive readiness from log transport | High | High | `MAIL_MAILER=log` remains active during validation | Runtime env snapshot | Enforce config gate requiring SMTP settings before production checks.
| R3 | Queue path regression during transport switch | High | Medium | Retries/failures spike | Queue worker logs + failed job tracking | Stage rollout; validate queued flows first.
| R4 | Sender identity/deliverability misalignment | High | Medium | High bounce or rejection from recipient infra | SMTP responses, recipient headers | Validate sender identity and domain alignment before rollout.
| R5 | Churn from repeated untracked config changes | Medium/High | High | Multiple toggles without baseline records | Missing change artifacts | Use strict baseline/change/rollback protocol.
| R6 | Ambiguous evidence interpretation | Medium | Medium | Conflicting doc text vs runtime outcomes | Contradiction tracker | Require explicit confidence scoring and disconfirming tests.
| R7 | App custom mailer masks transport errors in some probe paths | Critical | High | Probe command returns success despite SMTP failures | Compare low-level SMTP dialogue vs app-level send path behavior | Require recipient-side evidence and low-level transport verification.

## Top Immediate Risks
1. R1 Provider limitations vs production requirement.
2. R2 Active log transport masking delivery truth.
3. R7 Custom mailer false-positive probe behavior.

## Residual Risk Policy
If any Critical risk remains unresolved, final recommendation cannot be GO.
