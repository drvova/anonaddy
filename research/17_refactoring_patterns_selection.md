# 17 - Refactoring.Guru Pattern Selection (Lean Usage)

## Objective
Use design patterns from Refactoring.Guru where they concretely improve flexibility and reduce conflict, while avoiding unnecessary abstraction.

## Selected Patterns

### Adapter (Structural)
Why selected:
1. Provider APIs and SMTP transport surfaces are incompatible by default.
2. Adapter creates one stable contract for higher layers.
Applied to:
- `MailProviderAdapter` implementations (`smtp_dev`, future providers).
Not for:
- business workflow orchestration.

### Strategy (Behavioral)
Why selected:
1. Send/verification policies vary by capability and environment.
2. Strategy avoids large conditional blocks in dispatch logic.
Applied to:
- `DeliveryPolicyEngine` behavior selection.
Not for:
- simple fixed operations.

### Factory Method (Creational)
Why selected:
1. Adapter construction must centralize config validation and dependency wiring.
2. Keeps call sites free of provider creation logic.
Applied to:
- `ProviderFactory`.
Not for:
- generic object construction where direct init is simpler.

### Facade (Structural)
Why selected:
1. Monitoring and evidence aggregation spans multiple subsystems.
2. Facade gives one integration point for logs/metrics/traces/events.
Applied to:
- `MailObservabilityFacade`.
Not for:
- replacing domain services.

## Explicitly Not Selected (for now)
1. Abstract Factory: deferred unless multiple families of related object graphs emerge.
2. Builder: deferred unless message assembly becomes excessively parameterized.
3. Singleton: avoid hard globals; prefer dependency injection for testability.

## Pattern Governance Rules
1. Pattern must remove a concrete pain point (branching, coupling, merge conflicts).
2. Pattern must reduce net complexity over one release horizon.
3. If a pattern adds classes without measurable gain, reject it.

## Mapping to Codebase Priorities
1. Scalable and provider-agnostic: achieved by Adapter + Factory + Strategy.
2. Clean and readable: constrained by anti-bloat exclusions.
3. Single source of truth: enforced through CapabilityRegistry and central policy engine.
