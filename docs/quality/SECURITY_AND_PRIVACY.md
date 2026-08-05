# Vii Security and Privacy

Status: Draft

## Security posture

Vii is secure by default, explicit about privileged operations, conservative about automation, and honest about controls the host environment cannot enforce.

Security is a cross-cutting architecture concern for State, components, templates, SSR, server contracts, build tooling, CLI, registries, plugins, platform capabilities, diagnostics, releases, and AI integrations.

Detailed documents:

- `../security/SECURITY_ARCHITECTURE.md`
- `../security/THREAT_MODEL.md`
- RFC 0020

## Core principles

- Data does not implicitly become executable code.
- Text interpolation is safe by default.
- Dangerous sinks and privileged capabilities are explicit.
- No telemetry by default.
- No source-code upload by default.
- No secret collection by default.
- No hidden install or post-install execution from registry items.
- Sensitive platform capabilities require explicit configuration.
- AI features remain optional and require clear data and permission boundaries.
- Diagnostics consumers must not alter application behavior.
- Safe defaults are reinforced by compiler checks, browser policy, server validation, capability restrictions, testing, and release controls.

## Template and browser security

A future native renderer must provide:

- text-node interpolation by default;
- context-aware encoding;
- opaque safe types for raw HTML and restricted URLs;
- approved sanitization boundaries;
- function-reference event handlers;
- no generated code strings;
- Content Security Policy integration;
- Trusted Types integration;
- no production requirement for `eval` or unsafe inline script execution.

Raw HTML is an explicit escape hatch and never accepts an ordinary string.

## SSR and hydration security

SSR must use:

- request-isolated Scopes;
- safe schema-versioned serialization;
- non-executable hydration data;
- strict server and client import boundaries;
- secret and capability rejection from client payloads;
- deterministic hydration behavior;
- cancellation and disposal on request termination.

Cross-request state leakage is a release-blocking security defect.

## Server security

Server contracts should standardize:

- independent server-side validation;
- authentication and authorization metadata;
- CSRF protection for cookie-authenticated mutations;
- secure cookie defaults;
- origin and request metadata validation;
- request, body, collection, and file limits;
- SSRF-resistant server fetch policies;
- parameterized data access guidance;
- root-confined filesystem capabilities;
- non-shell command execution;
- structured production-safe errors.

The framework cannot replace application-specific authorization or secure infrastructure configuration.

## Supply-chain security

Official releases should use:

- protected release workflows;
- trusted publishing where available;
- package provenance;
- least-privilege automation tokens;
- dependency review;
- secret scanning;
- static analysis;
- package-content inspection;
- SBOM generation;
- pinned automation dependencies;
- reproducible release metadata;
- incident and credential-revocation procedures.

Lifecycle scripts should be avoided in official packages unless a documented need is reviewed.

## Registry security

Registry items are declarative manifests and files. A registry item may not silently execute arbitrary installation code.

The CLI must:

- validate schema and integrity;
- show the source registry;
- resolve dependencies before mutation;
- present a file plan and diff;
- detect local modifications;
- reject unexpected and traversal paths;
- require explicit approval for sensitive operations;
- display requested permissions;
- verify provenance or signatures where supported;
- validate the resulting project.

Private registries do not bypass validation.

## Plugin security

Plugins are executable and more privileged than declarative registry components.

Plugins should declare:

- filesystem roots and operations;
- network access;
- process and shell access;
- environment variable access;
- generated-code authority;
- build graph mutations.

Where the runtime cannot sandbox a plugin, Vii must state clearly that the plugin executes with host-process authority.

## Capability security

Capabilities such as filesystem, shell, clipboard, network, secure storage, camera, microphone, notifications, biometrics, environment variables, database access, and native bridges are privileged boundaries.

Capabilities are:

- explicit;
- replaceable;
- Scope-aware;
- testable;
- denied when unavailable;
- auditable;
- never inferred as permission to bypass a host platform security model.

## Diagnostics privacy

Diagnostics record structure and causality rather than raw application values.

Defaults:

- State values excluded;
- form values excluded;
- request and response bodies excluded;
- cookies and authorization headers excluded;
- secrets excluded;
- source code excluded;
- URLs and identifiers redacted or configurable;
- buffers bounded;
- security payloads truncated and structured.

Development users may opt into deeper inspection locally. Production-safe mode remains conservative.

## Logging and incident evidence

Security events use structured schemas and correlation IDs.

Logs must resist injection and exclude credentials, sensitive personal data, and complete malicious payloads by default.

Deployment guidance may recommend append-only or remote storage where incident evidence requires tamper resistance.

## AI and InLoom

Future AI integrations must declare:

- which provider receives data;
- whether processing is local or remote;
- which files and diagnostics are included;
- retention expectations;
- mutation permissions;
- approval requirements;
- available filesystem, process, network, and publishing capabilities.

Repository files, webpages, issues, logs, tool output, and generated text are untrusted context and may contain prompt injection.

AI may propose changes, but project mutation continues through the deterministic CLI plan, policy validation, user approval where required, and post-change validation.

Model output is never executed directly.

## Security diagnostics

The ecosystem may reserve a stable `VII-SEC-*` diagnostic namespace for unsafe sinks, URL policies, server/client leaks, shell and filesystem risks, SSRF, hydration serialization, registry scripts, sensitive logging, and plugin permission escalation.

Security diagnostics must provide a safe correction rather than only report a generic failure.

## Security testing

Security evidence should include:

- context-specific escaping tests;
- XSS payload corpus;
- parser and serializer fuzzing;
- CSP and Trusted Types fixtures;
- hydration mismatch and secret-leak tests;
- cross-request isolation tests;
- CSRF and SSRF fixtures;
- command and path traversal tests;
- upload and archive tests;
- malicious registry manifests;
- plugin permission cases;
- dependency and secret scanning;
- AI prompt-injection tool tests;
- independent review before stable native framework releases.

The web and server target should align with an appropriate OWASP ASVS Level 2 profile for most applications. AI and desktop features require their own applicable verification mappings.

## Vulnerability handling

The repository must provide `SECURITY.md` before public stable releases.

The process must include:

- private reporting;
- supported version policy;
- severity classification;
- patch and advisory process;
- coordinated disclosure;
- compromised package and credential revocation plan.

## Security review triggers

Dedicated review is required for changes to:

- parsers and serializers;
- raw template sinks;
- client/server classification;
- authentication and authorization helpers;
- filesystem, process, network, and native capabilities;
- registry and plugin execution;
- release workflows;
- cryptography and secret handling;
- AI tool permissions;
- update mechanisms.

## Threat areas requiring dedicated review

- CLI file mutation;
- registry integrity and dependency confusion;
- migration transforms;
- SSR request isolation;
- diagnostics data exposure;
- server contract validation;
- authentication and object-level authorization;
- native capability bridges;
- Tauri and mobile permission generation;
- plugin execution;
- AI data and prompt boundaries;
- file uploads and archive extraction;
- server-side network access;
- build cache integrity.

## Non-goals

Vii does not claim to replace:

- operating-system permissions;
- browser security;
- Tauri or mobile sandboxing;
- Deno permission enforcement;
- application authorization;
- database permissions;
- secret managers;
- antivirus and content-scanning products;
- infrastructure hardening;
- professional security audits.

Vii provides contracts, validation, safer defaults, compiler checks, visible authority, deterministic plans, and testable evidence around those systems.
