# Architecture

## Overview

PulseBoard uses a small layered architecture so transport concerns, business rules, and storage are independent.

```mermaid
flowchart LR
    Client --> Routes
    Routes --> Service
    Service --> Repository
    Repository --> Store[In-memory store]
```

## Layers

### Routes

The routing layer translates HTTP requests into application calls and maps successful results to HTTP responses. It does not own incident lifecycle rules.

### Service

`IncidentService` contains business behavior:

- validates input
- creates incidents
- retrieves incidents
- enforces allowed status transitions
- increments an entity version after mutations
- reports domain-specific errors

The service accepts ID and time providers through its constructor. This makes tests deterministic without mocking global time or UUID APIs.

### Repository

`IncidentRepository` is an interface rather than a direct dependency on a database. The current implementation uses `ConcurrentHashMap`, while a future PostgreSQL repository can implement the same contract.

### Domain model

The domain defines `Incident`, `Severity`, and `IncidentStatus`. Status changes are intentionally constrained to represent a simple state machine.

## Error strategy

Domain failures are represented by typed exceptions:

- `ValidationException` → HTTP 400
- `IncidentNotFoundException` → HTTP 404
- `InvalidStatusTransitionException` → HTTP 409

Ktor's StatusPages plugin maps these errors at the application boundary, keeping HTTP concerns out of the service layer.

## Testing strategy

Service tests focus on business behavior instead of framework internals. Deterministic IDs and timestamps are injected into the service to keep tests fast and repeatable.

## Why in-memory storage?

The goal of the first version is to highlight Kotlin, architecture, and business logic with minimal infrastructure. The repository interface preserves a clear migration path to PostgreSQL without rewriting service or route logic.
