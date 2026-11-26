# Vii Release Policy

## Goals

Vii releases should be reproducible, reviewable, scoped, and honest about stability. Release automation must not bypass quality, compatibility, or security checks.

## Versioning

Official packages use semantic versioning.

Before 1.0:

- patch releases contain compatible fixes and documentation changes
- minor releases may include new preview features and documented breaking changes
- breaking changes still require migration notes and clear communication

Stable APIs follow normal semantic-versioning expectations.

## Release channels

### Canary

Automated builds for maintainers and integration testing. No compatibility guarantee.

### Next

Preview releases for planned upcoming changes. Suitable for early adopters, not production guarantees.

### Latest

The recommended stable or current public release for the package's declared maturity.

### Security

Targeted releases for vulnerability remediation when required.

## Package independence

Packages may evolve at different speeds, but shared protocols and tightly coupled packages require compatibility checks before publication.

The release system must prevent publishing an adapter that expects an unavailable Core contract.

## Required release checks

Depending on the package, a release must pass:

- lint and formatting validation
- TypeScript builds
- unit and contract tests
- fixture installation tests
- package-content inspection
- public export validation
- compatibility matrix checks
- performance regression checks
- security scanning
- accessibility checks for UI packages
- migration fixtures for breaking changes

## Release candidate readiness and decision evidence

Treat merge, release candidate approval and actual publication as **separate gates**. For a release candidate, record exact commit SHA/tag, package version, build/installer or packed-artifact digest where available, target platform/deployment environment, validation commands, environment and observed outcomes. Apply `PASS`, `FAIL`, `PENDING`, `BLOCKED` or `NOT APPLICABLE` per required check. A required non-PASS result prevents a release-ready claim.

Select appropriate production build, unit/contract/integration/regression tests, critical journeys, browser/desktop/mobile installation, supported runtimes, accessibility, security, dependency, packaging, authentication/billing where applicable, data integrity, migrations, deployment and rollback/recovery tests. For web/backend validate the actual deployment environment; for desktop/mobile validate real distributable artifacts and supported platforms. Independent review and **explicit project-owner release authorization** are mandatory before publishing. Do not modify `publish-core.yml`, npm configuration or secrets as part of ordinary governance changes.

## Post-release verification

After an authorized release, perform scoped smoke tests and critical journeys in the real target environment, inspect errors, package/update compatibility, migration/data integrity and recovery readiness as relevant, and record incidents or rollback decisions. Do not enable telemetry, collect user data or add external monitoring without separate privacy/security approval. Use release notes/changelog for shipped changes; a merged PR is not automatically a published release.

## Publication

npm is the initial primary registry. Releases should use trusted publishing and provenance when available.

Published packages must not contain unintended source files, secrets, local configuration, test artifacts, or undeclared executable lifecycle scripts.

## Release artifacts

Each release should provide:

- changelog entry
- package versions
- commit reference
- compatibility status
- migration notes when applicable
- known limitations
- provenance or build metadata

## Changesets and coordination

The repository should adopt an explicit changeset workflow before package implementation begins. Every user-visible change records affected packages and release significance.

## Failed releases

A failed or partially published release must be documented. The project should prefer a corrective release rather than rewriting already published artifacts.

## Deprecation releases

Deprecations must identify:

- affected API
- replacement
- warning behavior
- earliest removal release
- migration command or guide where available

## 1.0 criteria

Vii does not release 1.0 based only on elapsed time. Core 1.0 requires:

- validated real-world consumers
- stable Core semantics
- documented scope and resource ownership
- proven adapter contracts
- stable diagnostics protocol or an explicit versioning boundary
- compatibility and support policy
- migration discipline
- sustainable maintenance capacity
