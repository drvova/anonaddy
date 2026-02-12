# 16 - Provider-Agnostic Architecture Spec

## Objective
Define a clean, scalable, composable architecture that supports multiple mail providers while isolating provider differences and minimizing churn risk.

## Design Principles
1. One global source of truth for provider capabilities.
2. Provider-specific logic must be isolated behind stable interfaces.
3. Keep abstractions minimal; only add layers that remove branching complexity.
4. Preserve existing queue-first behavior and failure visibility.

## Core Components

### 1. `MailProviderAdapter` (interface)
Responsibilities:
1. Hide provider protocol/API differences.
2. Expose uniform operations:
   - `send(message, context)`
   - `fetchMessage(messageId)`
   - `listMessages(mailboxRef, page)`
   - `healthCheck()`

### 2. `ProviderFactory`
Responsibilities:
1. Construct adapter instance by provider id.
2. Validate required credentials/config before adapter creation.
3. Prevent direct adapter construction in business logic.

### 3. `DeliveryPolicyEngine`
Responsibilities:
1. Choose transport/route strategy based on normalized capabilities + environment.
2. Enforce mandatory gates before allowing production flow.
3. Emit machine-readable denial reasons when policy blocks sending.

### 4. `MailObservabilityFacade`
Responsibilities:
1. Normalize events for attempt/success/failure/confirmation.
2. Attach correlation IDs for queue job -> provider request -> recipient evidence.
3. Provide one API for logs/metrics/traces integration.

### 5. `CapabilityRegistry`
Responsibilities:
1. Serve canonical provider capability records.
2. Support runtime read-only access for routing/gating.
3. Record versioned capability updates for auditability.

## Data Flow (Send Path)
1. Queue job prepares canonical message payload.
2. Policy engine validates capability + risk gates.
3. Factory returns selected adapter.
4. Adapter sends via provider transport.
5. Observability facade records transport result + metadata.
6. Optional verification worker confirms recipient-side evidence.

## Data Flow (Inbox/Verification Path)
1. Verification worker pulls via provider API or SSE event stream.
2. Adapter normalizes message status.
3. Observability facade links status to originating send attempt.
4. Gate state updates from `PENDING` to `CONFIRMED` or `FAILED`.

## Anti-Bloat Rules
1. No provider-specific conditionals outside adapter layer and capability policy.
2. No duplicate provider configuration schema across files.
3. No pattern insertion unless it eliminates real branching/conflict.

## Compatibility Strategy
1. Integrate incrementally under feature flags.
2. Keep existing mail path as fallback during migration window.
3. Cut over only after acceptance matrix passes.
