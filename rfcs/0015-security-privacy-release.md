# RFC 0015: Security, Privacy, and Release Baseline

- Status: Draft
- Area: Governance

## Summary

Vii establishes a baseline for secure package publication, privacy-safe diagnostics, capability boundaries, registry safety, API stability, and release channels before implementation begins.

## Proposed baseline

- No telemetry, source upload, secret collection, or AI data transfer by default.
- Registry items are declarative and cannot silently execute installation code.
- Sensitive capabilities require explicit configuration and host-platform permission.
- Production-safe diagnostics exclude raw application values by default.
- Public APIs are classified as Internal, Experimental, Preview, Stable, or Deprecated.
- npm is the initial primary registry.
- Releases use semantic versioning, explicit channels, package validation, and provenance where available.
- Published artifacts are immutable; failed releases are corrected with new versions.

## Release channels

- Canary for integration testing
- Next for previews
- Latest for recommended releases
- Security for targeted remediation when required

## Supply-chain controls

Official publication should use protected workflows, least-privilege credentials, trusted publishing, dependency review, secret scanning, and package-content inspection.

## Privacy controls

Diagnostics and future AI integrations must declare what data is collected, where it is processed, and which permissions apply. Local-first inspection is preferred. Project mutations continue through deterministic planning and validation.

## Stability controls

Machine-readable formats and protocols carry explicit versions. Stable APIs follow semantic versioning and deprecation rules. Source-owned generated code remains user-owned and cannot be overwritten without diff and approval.

## Open questions

- Exact vulnerability response targets
- Supported-version window after public releases
- Signing and SBOM requirements
- Long-term release tooling
- Public security contact and disclosure process

## Consequences

These rules add release work, but they prevent Vii's CLI, registry, diagnostics, and platform integrations from becoming avoidable security and trust risks.
