# 01 - Source Inventory and Quality Register

## Source Quality Rubric
- `High`: official docs/specs or direct runtime evidence.
- `Medium`: official summaries/support text with partial ambiguity.
- `Low`: indirect/secondary interpretation.

## Source Registry

| ID | Source | URL | Type | Why Credible | Quality | Notes |
|---|---|---|---|---|---|---|
| S1 | SMTP.dev Getting Started | https://smtp.dev/docs/getting-started/ | Official provider docs | Primary vendor documentation | High | Feature baseline for IMAP/SMTP/POP3/API.
| S2 | SMTP.dev API | https://smtp.dev/docs/api/ | Official provider docs | Primary API reference | High | Auth model, resources, status/error model, rate limits.
| S3 | SMTP.dev List Emails endpoint | https://smtp.dev/docs/api-reference/list-emails | Official provider docs | Provider API detail page | Medium | Useful for message retrieval shape when available.
| S4 | Laravel Mail Docs (11.x) | https://laravel.com/docs/11.x/mail | Official framework docs | Authoritative for mail configuration and transports | High | Includes custom transport extension guidance.
| S5 | Laravel Queue Docs (11.x) | https://laravel.com/docs/11.x/queues | Official framework docs | Authoritative for worker lifecycle and queue behavior | High | Queue workers are long-lived process model.
| S6 | Zeabur Build & Deploy Docs | https://zeabur.com/docs/en-US/features/build-and-deploy | Official platform docs | Platform-maintained deployment behavior | Medium/High | Deployment lifecycle and runtime context.
| S7 | Zeabur Variables Docs | https://zeabur.com/docs/en-US/deploy/variables | Official platform docs | Platform-owned variable model | High | Runtime variable injection and references.
| S8 | Zeabur Volumes Docs | https://zeabur.com/docs/en-US/data-management/volumes | Official platform docs | Platform-owned persistence model | High | Volume tradeoffs including restart behavior.
| S9 | RFC 5321 | https://datatracker.ietf.org/doc/html/rfc5321 | IETF standard | Canonical SMTP semantics | High | Protocol baseline.
| S10 | RFC 3207 | https://datatracker.ietf.org/doc/html/rfc3207 | IETF standard | Canonical STARTTLS extension | High | TLS upgrade semantics.
| S11 | Refactoring.Guru Adapter | https://refactoring.guru/design-patterns/adapter | Design reference | Authoritative pattern intent and tradeoffs | High | Interface incompatibility isolation.
| S12 | Refactoring.Guru Strategy | https://refactoring.guru/design-patterns/strategy | Design reference | Authoritative pattern intent and tradeoffs | High | Algorithm switching with composition.
| S13 | Refactoring.Guru Factory Method | https://refactoring.guru/design-patterns/factory-method | Design reference | Authoritative pattern intent and tradeoffs | High | Controlled object creation.
| S14 | Refactoring.Guru Facade | https://refactoring.guru/design-patterns/facade | Design reference | Authoritative pattern intent and tradeoffs | High | Simplified subsystem interface.
| S15 | Live Zeabur Service Variables Snapshot | (MCP zeabur get-service-variables, 2026-02-12 UTC) | Runtime evidence | Direct environment state | High | Current mailer is `log`, not `smtp`.
| S16 | Live Zeabur Runtime Logs Snapshot | (MCP zeabur get-runtime-logs, 2026-02-12 UTC) | Runtime evidence | Direct process/runtime output | High | Scheduler loop and runtime traffic evidence.
| S17 | Live SMTP Dialogue (`send.smtp.dev:587`) | (MCP zeabur execute-command, 2026-02-12 UTC) | Runtime evidence | Direct protocol-level handshake and auth responses | High | `AUTH LOGIN PLAIN`, `535`, `530` outcomes.
| S18 | In-repo Custom Mail Driver Implementation | (`app/CustomMailDriver/*`, `app/Providers/CustomMailServiceProvider.php`) | Code evidence | Primary source for runtime mail behavior | High | Exception-handling path can mask failures.

## Evidence Gaps to Close
1. End-to-end recipient-side proof for smtp.dev-managed recipient.
2. End-to-end recipient-side proof for non-smtp.dev mailbox.
3. Authenticated burst behavior for rate/policy envelope under realistic load.

## Contradiction Tracker
- Potential contradiction under evaluation:
  - App-level send can look successful while recipient-side delivery is unproven.
- Current status: unresolved for production verdict until recipient-side tests complete.
