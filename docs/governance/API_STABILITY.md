# Vii API Stability

## Stability levels

Every public API belongs to one of the following levels.

### Internal

Not part of the public contract. Internal symbols must not be exported through documented package entry points.

### Experimental

Used for prototypes and early feedback. Breaking changes may occur in minor releases and must be clearly labeled.

### Preview

The design is usable and documented, but still subject to refinement. Breaking changes require migration notes and explicit release communication.

### Stable

Covered by semantic versioning, compatibility tests, migration policy, and deprecation rules.

### Deprecated

Still supported for a documented period but scheduled for replacement or removal.

## Public API definition

A public API includes:

- documented package exports
- TypeScript types exposed by those exports
- CLI commands and stable flags
- machine-readable JSON schemas
- registry schemas
- diagnostics protocol versions
- configuration-file formats
- generated source conventions promised to users

Examples and undocumented deep imports do not create a supported contract when package `exports` explicitly exclude them.

## Promotion criteria

An API may move toward Stable only after:

- real consumer validation
- test coverage at the appropriate layers
- documented behavior and error cases
- acceptable performance and type-check cost
- migration strategy
- security and privacy review where relevant
- no unresolved foundational design questions

## Deprecation process

Deprecation requires:

1. replacement guidance or a clear explanation that no replacement exists
2. code-level annotation where practical
3. documentation and release notes
4. CLI or diagnostics warnings where safe
5. a removal target appropriate to the API stability and release stage

## Protocol versioning

Diagnostics, registry, lockfile, configuration, and machine-readable CLI formats use explicit schema or protocol versions.

Readers should reject unsupported major versions safely and should ignore compatible unknown fields where the schema permits forward compatibility.

## Generated code

Source-owned generated code belongs to the user. Vii may track provenance and offer updates, but it must not assume that generated code remains identical to its original template.

## Pre-1.0 policy

Before 1.0, the project may make breaking changes more frequently, but it must still:

- classify stability
- publish migration notes
- avoid silent breakage
- prefer deprecation where practical
- keep scope small enough that users can understand change
