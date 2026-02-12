# 09 - Decision Memo (Updated After E1-E6 Execution)

## Decision Question
Can this Zeabur-hosted Laravel deployment use smtp.dev for production email sending with no feature loss and low churn risk?

## Current Verdict
`NO-GO (evidence-based)`

## Why NO-GO
1. Live runtime still uses `MAIL_MAILER=log`, so production SMTP is not currently active.
2. E2 proves smtp.dev endpoint reachability and authentication requirement, but does not prove end-user delivery.
3. E3/E4/E6 are not fully completed with recipient-side evidence due missing authenticated test setup.
4. This codebase uses a custom mailer implementation that can suppress send exceptions in some contexts, so app-level "send succeeded" is not sufficient proof.

## Confidence
`High` for current NO-GO state.

- High confidence in runtime baseline (`MAIL_MAILER=log`).
- High confidence that authenticated SMTP is required at provider endpoint.
- High confidence that current evidence is insufficient for production claim.

## What Must Be True to Change Verdict to GO
1. SMTP transport enabled with complete valid credentials (`MAIL_MAILER=smtp` and full SMTP vars).
2. Successful delivery to both:
   - smtp.dev recipient (provider-side evidence), and
   - non-smtp.dev external recipient (inbox receipt evidence).
3. Queue-driven mail features remain healthy under realistic sends/retries.
4. No policy-induced rejection pattern incompatible with production usage.
5. Evidence captured in a reproducible artifact bundle (commands, logs, recipient proofs).

## No-Feature-Loss Checklist (must pass)
1. Password reset email delivered to target inbox.
2. Email verification delivered to target inbox.
3. Representative queued notification delivered.
4. Queue health remains stable (no sustained failed/retried backlog).
5. Failure paths remain visible and actionable.

## Required Inputs to Complete Remaining Tests
1. Valid smtp.dev SMTP credentials.
2. smtp.dev test recipient details and access path for inbox/API verification.
3. One external mailbox target for delivery confirmation.

## Immediate Next Actions
1. Execute blocked tests E3/E4/E6 after credential provisioning.
2. Update `05_theory_catalog_and_comparison.md` statuses with recipient-side evidence.
3. Recompute final GO/NO-GO only after all critical-risk evidence is complete.
