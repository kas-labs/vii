# Vii Security and Privacy

## Security posture

Vii should be secure by default, explicit about privileged operations, and conservative about automation that changes user projects or accesses platform capabilities.

## Core principles

- No telemetry by default.
- No source-code upload by default.
- No secret collection by default.
- No hidden install or post-install execution from registry items.
- Sensitive platform capabilities require explicit configuration.
- AI features remain optional and require clear data and permission boundaries.
- Diagnostics consumers must not alter application behavior.

## Supply-chain security

Official releases should use:

- protected release workflows
- trusted publishing where available
- package provenance
- least-privilege automation tokens
- dependency review
- secret scanning
- package-content inspection
- reproducible release metadata

Lifecycle scripts should be avoided in official packages unless a documented need is reviewed.

## Registry security

Registry items are declarative manifests and files. A registry item may not silently execute arbitrary installation code.

The CLI must:

- validate schema and integrity
- show the source registry
- resolve dependencies before mutation
- present a file plan and diff
- detect local modifications
- reject unexpected paths
- require explicit approval for sensitive operations

Private registries may be supported later, but they do not bypass validation.

## Capability security

Capabilities such as filesystem, shell, clipboard, network, secure storage, camera, microphone, notifications, biometrics, environment variables, and database access are treated as privileged boundaries.

Capabilities are:

- explicit
- replaceable
- scope-aware
- testable
- denied when unavailable
- never inferred as permission to bypass a host platform security model

## Diagnostics privacy

Diagnostics should record structure and causality rather than raw application values.

Defaults:

- state values excluded
- form values excluded
- response bodies excluded
- secrets excluded
- source code excluded
- URLs and identifiers redacted or configurable

Development users may opt into deeper inspection locally. Production-safe mode must use bounded buffers and redaction.

## AI and Intentloom

Future AI integrations must declare:

- which provider receives data
- whether processing is local or remote
- which files and diagnostics are included
- retention expectations
- mutation permissions
- approval requirements

AI may propose project changes, but project mutation should continue to use the deterministic CLI plan and validation pipeline.

## Vulnerability handling

The repository must provide `SECURITY.md` before public stable releases. Reports should be handled privately until a fix and disclosure plan are available.

Supported versions and response expectations must be published once releases exist.

## Threat areas requiring dedicated review

- CLI file mutation
- registry integrity and dependency confusion
- migration transforms
- SSR request isolation
- diagnostics data exposure
- server contract validation
- native capability bridges
- Tauri and mobile permission generation
- plugin execution
- AI data boundaries

## Non-goals

Vii does not claim to replace:

- operating-system permissions
- browser security
- Tauri or mobile sandboxing
- Deno permission enforcement
- application authorization
- secret managers
- security audits

Vii provides contracts, validation, safer defaults, and visible plans around those systems.
