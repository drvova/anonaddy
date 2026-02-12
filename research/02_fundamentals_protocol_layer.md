# 02 - Fundamentals (Layer L0: SMTP Protocol)

## Why This Layer Exists
Before platform or provider decisions, production email viability must satisfy protocol fundamentals. This avoids false confidence from app-level logs alone.

## Core Requirements

### F1. SMTP Transaction Semantics
- SMTP defines a transactional envelope flow (`MAIL FROM`, `RCPT TO`, message data), and delivery outcomes are recipient-path dependent.
- Source: RFC 5321 (S9).

### F2. STARTTLS / Transport Security
- STARTTLS is defined as an extension that upgrades plaintext SMTP sessions.
- Provider claims about encryption (`MAIL_ENCRYPTION`) must align with server support.
- Source: RFC 3207 (S10).

### F3. Authentication and Identity
- SMTP transport setup generally requires host, port, auth credentials, and sender alignment.
- In Laravel, these map to `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`, `MAIL_FROM_*`, optional `MAIL_EHLO_DOMAIN`.
- Sources: Laravel Mail docs (S4), `.env.example` in repo.

### F4. Delivery Evidence Hierarchy
From strongest to weakest proof of "email works":
1. Recipient mailbox receipt confirmation.
2. SMTP server acceptance logs for target recipient domains.
3. App transport success logs.
4. Queue dispatch success.
5. Local log mail rendering.

`Local log output alone does not prove external delivery.`

## Claim Register (L0)

| Claim | Source | Confidence | Impact |
|---|---|---|---|
| SMTP has explicit transaction semantics distinct from app-level logging. | S9 | High | Prevents false positives.
| STARTTLS behavior must be negotiated and validated per provider endpoint. | S10 | High | Impacts encryption correctness and failure diagnostics.
| Laravel env mapping directly controls SMTP transport behavior. | S4 + repo `config/mail.php` | High | Misconfigured env causes silent non-delivery paths.

## Practical Implication for This Project
A production-ready conclusion requires evidence beyond Laravel queue success and beyond provider-specific testing inbox visibility. External-domain delivery must be explicitly validated.
