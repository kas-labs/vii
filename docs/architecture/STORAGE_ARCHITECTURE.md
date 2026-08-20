# Vii Storage Architecture

Status: Research direction

## Purpose

Vii Storage is a candidate persistence abstraction for local application data across browser, desktop, mobile, server, test, and custom environments.

The goal is to provide explicit persistence contracts, validation, serialization, migrations, cancellation, and diagnostics without turning Vii into a database or sync backend.

## Research scope

- small async key/value baseline with typed records;
- driver model for memory, Web Storage, IndexedDB, filesystem-like adapters, and custom implementations where supported;
- optional Schema validation when reading untrusted or versioned persisted data;
- optional Codec integration for external representation;
- explicit migrations and version metadata;
- cancellation for async drivers;
- Scope-owned subscriptions/watchers only if real drivers require them;
- State persistence helpers without coupling Storage itself to State;
- SSR-safe behavior and request isolation where server-side storage is claimed;
- diagnostics that record structural events, never stored values by default;
- offline/local-first research as a later layer, not an implicit sync feature.

## Layering

```text
Application State
      |
 optional persistence helper
      |
 Vii Storage
   |      |
 Schema  Codec
   |      |
 storage driver
```

Storage must remain useful without Vii State, Schema, or Codec.

## Persistence is not synchronization

Local persistence and multi-device synchronization are different problems.

Vii Storage research covers local persistence semantics first. Replication, conflict resolution, CRDTs, remote synchronization, encryption key management, and collaborative databases require separate evidence and architecture.

## Driver principles

A driver contract should expose the minimum semantics that can be supported honestly across target environments. Platform-specific features such as IndexedDB transactions, filesystem permissions, quotas, or atomic rename must not be hidden behind false cross-platform guarantees.

## Security and privacy requirements

Research must cover:

- untrusted persisted data;
- schema/version drift;
- prototype pollution;
- storage poisoning;
- quota exhaustion;
- filesystem path traversal for filesystem adapters;
- multi-user/server isolation;
- encryption-at-rest claims and key-management boundaries;
- XSS access to browser storage;
- sensitive-data diagnostics;
- destructive migration rollback and backup expectations.

## Anti-goals

Vii Storage should not:

- become an ORM or database engine;
- promise encryption merely because a codec transforms data;
- silently sync data over the network;
- require Vii State;
- normalize away important platform differences;
- provide hidden persistence by default;
- make localStorage the universal semantic model.

## Evidence required before graduation

- real consumer using at least two driver environments or one complex IndexedDB-style case;
- persistence/migration fixtures;
- corrupted and malicious record tests;
- cancellation and cleanup tests for async drivers;
- quota/failure behavior documentation;
- bundle/runtime/type-check measurements;
- explicit comparison against direct platform APIs and mature storage libraries;
- security review for any filesystem or sensitive-data usage.
