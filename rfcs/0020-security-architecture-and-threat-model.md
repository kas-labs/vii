# RFC 0020: Security Architecture and Threat Model

Status: Proposed

## Summary

Adopt security as a cross-cutting Vii foundation spanning compiler, browser runtime, SSR, server contracts, forms, capabilities, CLI, registry, plugins, releases, diagnostics, and AI integrations.

The proposal introduces secure-by-default template semantics, explicit safe types, client/server boundary checks, declarative registry trust, capability permissions, supply-chain controls, and a maintained ecosystem threat model.

## Motivation

Vii may eventually process untrusted templates, form input, server requests, files, URLs, registry artifacts, build plugins, platform capabilities, and AI-generated changes.

Deferring security until after implementation would bake unsafe assumptions into public APIs and compiler behavior.

## Goals

- Data never becomes executable code implicitly.
- Text interpolation is safe by default.
- Raw HTML, URLs, commands, paths, and capabilities use explicit boundaries.
- SSR serialization and hydration are safe and schema-based.
- Client and server graph separation prevents secret leakage.
- Forms validate on the server.
- CSRF, SSRF, path traversal, injection, and upload risks receive framework contracts.
- CLI and registry operations are deterministic and reviewable.
- Plugins declare privileged access.
- Releases use supply-chain controls.
- AI content and output remain untrusted.
- Security diagnostics and malicious fixtures are release evidence.

## Non-goals

- Guaranteeing that application code cannot be malicious.
- Replacing operating-system, browser, database, or infrastructure security.
- Providing complete application-specific authorization.
- Claiming plugin sandboxing when plugins execute in the host process.
- Replacing professional audits or penetration tests.

## Detailed design

### Template security

```html
<p>{{ untrustedText }}</p>
```

lowers to text-node operations.

Strings cannot enter HTML sinks.

```ts
const article: SafeHtml = sanitizeHtml(input, policy);
```

Event handlers are function references, not code strings.

Dynamic URLs pass a URL policy.

### Browser policy

Vii should support:

```text
Content Security Policy
Trusted Types
secure event binding
safe DOM operations
no eval requirement
```

### SSR

Hydration data is emitted as non-executable, HTML-safe, schema-versioned JSON.

Server capabilities and secrets cannot be serialized.

Every request receives an isolated Scope.

### Server

Framework contracts should support:

```text
schema validation
CSRF protection
origin validation
secure cookies
request limits
SSRF-resistant fetch
root-confined filesystem access
non-shell command execution
parameterized data access guidance
```

### CLI and registry

Mutation lifecycle:

```text
Analyze
-> Plan
-> Preview
-> Apply
-> Validate
-> Report
```

Registry content is declarative and cannot silently execute scripts.

### Plugins

Plugins declare filesystem, network, process, and environment authority.

Vii documents when a host process cannot technically enforce isolation.

### Supply chain

Official releases should use protected workflows, trusted publishing, provenance, dependency review, secret scanning, package-content inspection, SBOM generation, and incident procedures.

### AI

Untrusted files and webpages cannot redefine tool policy.

Model output is a proposal. Deterministic policy checks and user approval govern sensitive tool execution.

## Public API impact

Potential future types and contracts:

```text
SafeHtml
SafeUrl
SecurityPolicy
CapabilityManifest
secureFetch
filesystem.scope
command.run
security diagnostics codes
```

Exact APIs require implementation RFCs before stabilization.

## Compatibility

Security rules apply consistently across:

- SFC;
- split templates;
- TSX;
- SSR;
- browser updates;
- Node, Bun, Deno, workers, desktop, and mobile adapters where applicable.

A target that cannot enforce a control must document the limitation and must not claim equivalent protection.

## Diagnostics and observability

Candidate stable security diagnostics:

```text
VII-SEC-001 through VII-SEC-015
```

Events record structure and cause without capturing secrets or complete payloads by default.

## Security and privacy

This RFC is itself the security baseline.

Privacy defaults remain:

- no telemetry;
- no source upload;
- no secret collection;
- no raw State, form, response, or AI context capture by default;
- explicit provider and data scope for remote AI processing.

## Alternatives

### Rely on browser escaping and CSP only

Rejected because different sinks and server boundaries require additional controls.

### Delegate all security to applications

Rejected because compiler and framework APIs determine whether unsafe behavior is easy or difficult.

### Sanitize every string universally

Rejected because sanitization is context-specific and unnecessary for ordinary text nodes.

### Permit executable registry install scripts

Rejected because remote source distribution should not silently acquire local machine authority.

## Risks

- security APIs may become cumbersome if safe defaults are not ergonomic;
- opaque safe types can be bypassed through unsafe casts unless tooling helps;
- CSP and Trusted Types integration varies by deployment;
- sanitizer maintenance is continuous;
- plugin permission manifests may be mistaken for real sandboxing;
- broad security claims create reputational risk if evidence is weak.

## Migration

No current user migration is required.

Future unsafe APIs must either remain internal, be clearly prefixed, or require migration to explicit safe types before Stable status.

## Validation plan

- XSS and URL payload corpus;
- template and serializer fuzzing;
- CSP and Trusted Types fixtures;
- malicious hydration payloads;
- cross-request isolation tests;
- CSRF, SSRF, command, path, and upload fixtures;
- registry traversal and integrity tests;
- client bundle secret scanning;
- plugin permission tests;
- dependency and package-content review;
- AI prompt-injection tool tests;
- independent security review before stable native framework releases.

## Unresolved questions

- default sanitizer implementation and update policy;
- final SafeHtml and SafeUrl API ownership;
- supported CSP deployment integrations;
- plugin isolation options by runtime;
- final vulnerability response timelines;
- signature strategy for Vii registry manifests;
- exact OWASP verification mappings per product layer.
