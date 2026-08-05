# Vii Security Architecture

Status: Draft

## Purpose

Security is a cross-cutting Vii foundation, not a feature added after the compiler, renderer, server, CLI, registry, or AI integrations are complete.

This document defines the secure-by-default direction for Vii source authoring, compilation, browser rendering, SSR, server contracts, forms, platform capabilities, CLI mutation, registries, plugins, releases, diagnostics, and AI-assisted tooling.

## Security promise

> Data does not become executable code without an explicit, narrow, reviewable boundary.

Vii should make safe operations ordinary and dangerous operations visible, typed, permissioned, and difficult to invoke accidentally.

## Scope

The architecture addresses:

- HTML and JavaScript injection;
- DOM XSS;
- unsafe URL protocols;
- CSS injection boundaries;
- SQL and NoSQL injection guidance;
- command injection;
- path traversal;
- unsafe file uploads;
- SSRF;
- CSRF;
- unsafe SSR serialization and hydration;
- client/server secret leakage;
- registry and plugin execution;
- software supply-chain attacks;
- diagnostics and log injection;
- prompt injection and unsafe AI tool use.

Vii cannot prevent a developer from deliberately writing malware. It can prevent untrusted data, remote registry content, generated code, and AI output from silently acquiring authority.

## Security principles

### Secure by default

The default path is safe without extra configuration.

### Explicit authority

Filesystem, process, shell, network, environment, clipboard, camera, microphone, database, and secure-storage access are explicit capabilities.

### Least privilege

A component, plugin, server handler, CLI command, or AI tool receives only the authority required for its task.

### Context-aware handling

Text, attributes, URLs, CSS values, JavaScript, SQL, shell arguments, paths, and logs require different validation or encoding rules.

### Defense in depth

Validation, encoding, sanitization, browser policy, capability checks, isolation, logging, and testing reinforce each other. No single mechanism is treated as complete protection.

### Visible escape hatches

Unsafe or privileged operations use names and types that communicate risk.

### No trust by location

Values are not trusted merely because they came from SSR, a Vii registry, generated code, an AI model, a private package, or an internal service.

## Security layer map

```text
Vii Security Foundation
├── Compiler security
├── Browser and template security
├── SSR and hydration security
├── Server and transport security
├── Forms and validation
├── Capability and plugin security
├── CLI and registry trust
├── Supply-chain security
├── AI and prompt-injection defense
├── Diagnostics and incident evidence
└── Security testing and release gates
```

## Template interpolation

Ordinary interpolation always produces text.

```html
<p>{{ userComment }}</p>
```

Conceptually lowers to:

```ts
textNode.textContent = userComment();
```

It must not lower to `innerHTML`.

The rule applies to:

- `.vii` templates;
- split HTML templates;
- TSX bindings;
- SSR output;
- hydration updates.

## Context-aware encoding

The compiler classifies each binding context.

```text
text content
HTML attribute
URL
CSS value
serialized data
```

A universal `escape()` helper is not sufficient.

Internal contracts may include:

```ts
escape.text(value);
escape.attribute(value);
escape.url(value, policy);
escape.cssValue(value);
serialize.forHtml(value, schema);
```

Application developers should not need to call these for ordinary bindings.

## Raw HTML

A string cannot be assigned to an HTML sink.

Rejected:

```html
<div html:trusted="userContent"></div>
```

when `userContent` has type `string`.

Approved flow:

```ts
const article = sanitizeHtml(untrustedArticle, articlePolicy);
```

```html
<div html:trusted="article"></div>
```

`sanitizeHtml` returns an opaque `SafeHtml` value.

```ts
declare const safeHtmlBrand: unique symbol;

export interface SafeHtml {
  readonly value: string;
  readonly [safeHtmlBrand]: true;
}
```

The type cannot be constructed through normal assignment or casting in approved application code without triggering lint or compiler diagnostics.

Security policy must define:

- allowed elements;
- allowed attributes;
- allowed URL schemes;
- whether styles are allowed;
- whether links receive safe `rel` values;
- sanitizer version and update process.

## Trusted Types

Vii Web should support browser Trusted Types.

A strict production configuration may emit:

```text
require-trusted-types-for 'script'
trusted-types vii-html
```

Trusted Types centralize dangerous DOM sink creation. They do not replace sanitization.

Vii-owned policies must be narrow, named, testable, and unavailable to untrusted registry code by default.

## Content Security Policy

Vii App and Server should generate a strict CSP from typed configuration.

Recommended baseline:

```text
default-src 'self'
script-src 'self' 'nonce-...'
style-src 'self' 'nonce-...'
object-src 'none'
base-uri 'none'
frame-ancestors 'none'
require-trusted-types-for 'script'
trusted-types vii-html
```

The runtime and compiler should not require:

```text
'unsafe-eval'
'unsafe-inline'
```

Production code must not depend on:

```text
eval
new Function
document.write
setTimeout with a code string
inline event-code strings
```

CSP is an additional boundary, not a substitute for safe sinks.

## Event security

Template event handlers are function references.

```html
<button on:click="save">Save</button>
```

Rejected forms include:

```html
<button onclick="{{ code }}">
<div on:{{ eventName }}="handler">
```

The compiler must not create executable JavaScript from strings.

## URL security

Escaping does not make every URL safe.

Default allowed schemes:

```text
https
http
mailto
tel
relative URLs
```

Default rejected schemes:

```text
javascript
data
vbscript
file
gopher
```

Specific contexts may allow a restricted `data:` policy after MIME and size validation.

Candidate API:

```ts
const avatar = safeUrl(input, {
  protocols: ['https:'],
  origins: ['https://cdn.example.com'],
});
```

URL normalization and policy checks occur before use.

## CSS security

Dynamic CSS should bind typed property values rather than complete untrusted stylesheets.

Preferred:

```html
<div style:width="progressWidth"></div>
```

Rejected or privileged:

```html
<div style:raw="userStyle"></div>
```

The compiler should validate property names, units where possible, and URL-bearing CSS values.

## SSR serialization

Server state must not be interpolated into executable script source.

Preferred transport:

```html
<script id="__VII_DATA__" type="application/json" nonce="...">
  ...escaped and schema-versioned data...
</script>
```

The serializer must safely encode sequences that could close HTML elements or alter parser state.

Rules:

- only declared hydration data is serialized;
- secrets and capabilities are rejected;
- schemas and protocol versions are recorded;
- payload size is bounded;
- deserialization does not instantiate arbitrary classes;
- data is validated before client use;
- the client never evaluates serialized strings as code.

## Hydration security

Hydration must preserve the same security classifications used by compilation and SSR.

A hydration payload cannot create:

- `SafeHtml`;
- `SafeUrl`;
- server capability handles;
- authorization decisions;
- trusted plugin permissions.

Hydration mismatches must not fall back to assigning raw HTML from untrusted payloads.

## Client and server graph security

The compiler and build system reject:

- environment secrets in client graphs;
- database or filesystem modules in browser code;
- server-only values serialized through props;
- browser APIs in unconditional server code;
- unsafe dynamic imports derived from user input;
- edge-incompatible capabilities in edge targets.

Generated manifests list server, client, and shared modules for audit and testing.

## Forms and input validation

Client validation improves UX. Server validation is the security boundary.

A shared schema may be used in both places:

```ts
const registrationSchema = schema.object({
  email: schema.email().max(254),
  name: schema.string().trim().min(2).max(100),
  age: schema.number().integer().min(18).max(120),
});
```

Server handlers validate independently:

```ts
export const register = defineServerAction({
  input: registrationSchema,

  async run(input, context) {
    return context.users.register(input);
  },
});
```

Validation includes:

- type;
- required fields;
- maximum sizes;
- allowed values;
- numeric ranges;
- Unicode normalization policy;
- semantic and business rules;
- object depth and collection limits;
- content-type and request-size limits.

Validation does not replace output encoding or parameterized data access.

## CSRF

Cookie-authenticated state-changing requests require CSRF protection.

Vii Server should support:

- token validation;
- `Origin` validation;
- Fetch Metadata checks;
- accepted content-type policy;
- session binding;
- `SameSite`, `Secure`, and `HttpOnly` cookie defaults;
- `__Host-` cookie prefix where appropriate.

Mutations use `POST`, `PUT`, `PATCH`, or `DELETE`, not state-changing `GET` requests.

## Authentication and authorization

Vii may provide contracts and middleware, but applications remain responsible for policy.

Rules:

- authentication is not authorization;
- server actions declare authorization requirements;
- authorization executes on the server for every protected operation;
- client-hidden UI does not grant or deny authority;
- object-level checks prevent insecure direct object references;
- denial reasons avoid exposing sensitive existence information.

## SQL and NoSQL injection

Server documentation and adapters must promote parameterized queries.

Rejected:

```ts
db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

Preferred:

```ts
db.query(sql`SELECT * FROM users WHERE email = ${email}`);
```

Dynamic identifiers and sort directions use allowlists.

NoSQL filters are built from validated fields rather than passing request objects directly to database APIs.

## Command execution

Vii capabilities should avoid shell interpretation.

Preferred:

```ts
command.run('git', ['checkout', branchName], {
  shell: false,
  timeout: 30_000,
});
```

Requirements:

- executable allowlist where practical;
- arguments passed separately;
- no shell by default;
- environment allowlist;
- timeout and output limits;
- working-directory confinement;
- redacted diagnostics;
- explicit user approval for CLI plugin commands.

## Filesystem and path traversal

Filesystem capabilities operate within declared roots.

```ts
const uploads = filesystem.scope('/app/uploads', {
  read: true,
  write: false,
});
```

Requirements:

- canonical path resolution;
- root confinement;
- traversal rejection;
- symlink policy;
- generated storage names;
- extension and content policy;
- size and count limits;
- atomic writes where applicable.

User input should identify logical resources, not system paths.

## File uploads

Secure upload pipeline:

```text
request limits
-> extension allowlist
-> content and MIME inspection
-> generated filename
-> isolated storage
-> antivirus or sandbox when required
-> optional content reconstruction
-> safe delivery policy
```

Uploaded content is not stored in an executable public directory by default.

SVG, HTML, scripts, executables, archives, and document formats require dedicated policies.

Archive extraction must reject traversal, symlink escape, decompression bombs, and unexpected file counts.

## SSRF-resistant server fetch

User-provided URLs cannot be passed directly to unrestricted server fetch.

Candidate API:

```ts
await secureFetch(url, {
  policy: 'external-https',
  redirects: 'deny',
  timeout: '5s',
  maxResponseSize: '5mb',
});
```

Preferred service definition:

```ts
const githubApi = defineHttpService({
  origins: ['https://api.github.com'],
});
```

Policies cover:

- schemes;
- origins;
- DNS and IP ranges;
- loopback and link-local addresses;
- redirects;
- timeouts;
- response sizes;
- methods and headers;
- credential forwarding.

## Capability security

Privileged capabilities are explicit and scope-aware.

Examples:

```text
filesystem
process and command
network
clipboard
notifications
camera
microphone
secure storage
environment
database
native bridge
```

A capability contract defines:

- operations;
- target scope;
- permissions;
- lifecycle;
- audit events;
- unavailable behavior;
- host-platform enforcement.

Vii never interprets a capability grant as permission to bypass browser, operating-system, Tauri, mobile, or Deno security controls.

## CLI security

Every mutating command uses:

```text
Analyze
-> Plan
-> Preview
-> Apply
-> Validate
-> Report
```

Requirements:

- no silent overwrite of modified files;
- project-root confinement;
- path traversal rejection;
- atomic writes where possible;
- clean-working-tree checks for migrations;
- explicit network operations;
- no source upload;
- machine-readable plan and result;
- command execution displayed before approval;
- secrets redacted from output.

## Registry trust

Registry items are declarative manifests and files.

They do not silently execute installation or post-install scripts.

A manifest declares:

- identity and version;
- source registry;
- files and hashes;
- dependencies;
- compatibility;
- requested project changes;
- requested capabilities;
- provenance and signatures where supported.

Installation verifies:

```text
schema
source
integrity
paths
dependencies
conflicts
local modifications
permissions
provenance
result validation
```

Private registries do not bypass validation.

## Plugin security

Plugins are privileged code and are not equivalent to registry source components.

A plugin declares permissions:

```ts
definePlugin({
  name: 'image-optimizer',

  permissions: {
    files: {
      read: ['src/assets/**'],
      write: ['dist/assets/**'],
    },
    network: false,
    process: false,
    environment: [],
  },
});
```

Where process isolation is unavailable, Vii must clearly state that the plugin has the authority of the host process. Permission manifests remain useful for policy, review, and future sandboxing but must not create a false security claim.

## Supply-chain security

Official packages and releases should use:

- minimal runtime dependencies;
- reviewed lockfiles;
- dependency review;
- secret scanning;
- static analysis;
- package-content inspection;
- protected release workflows;
- least-privilege tokens;
- trusted publishing;
- provenance attestations;
- SBOM generation;
- version pinning for automation;
- release artifact retention;
- incident and revocation procedures.

Lifecycle scripts are avoided unless reviewed and documented.

## Dependency confusion and typosquatting

Controls should include:

- reserved package namespace;
- explicit registry configuration for private packages;
- lockfile integrity;
- package identity validation;
- no unqualified fallback from private to public registries;
- documentation warning against similarly named unofficial packages.

## AI and prompt injection

AI input, retrieved files, webpages, issue text, diagnostics, and tool output are untrusted data.

Security order:

```text
system policy
-> user intent
-> untrusted context
-> model proposal
-> deterministic policy validation
-> human approval where required
-> tool execution
-> audited result
```

Rules:

- repository text cannot redefine tool permissions;
- model output is never executed directly;
- secrets are unavailable unless explicitly granted;
- filesystem, process, network, and publishing tools use least privilege;
- destructive actions require confirmation;
- allowed paths, commands, and origins are validated outside the model;
- AI project changes pass through the deterministic CLI plan;
- retrieved output remains untrusted after tool execution;
- provider, data scope, retention, and remote processing are disclosed.

AI is not a security boundary and is never required for deterministic Vii behavior.

## Diagnostics and logging

Security-relevant events use structured schemas.

```json
{
  "type": "security.input_rejected",
  "requestId": "req_123",
  "route": "/api/profile",
  "field": "displayName",
  "reason": "maximum_length_exceeded"
}
```

Logs exclude by default:

- passwords;
- access and refresh tokens;
- cookies;
- private keys;
- connection strings;
- complete form bodies;
- full malicious payloads;
- sensitive personal data.

Log-injection controls:

- structured output;
- CR and LF handling;
- maximum field lengths;
- schema validation;
- immutable event type;
- correlation IDs;
- tamper-resistant storage according to deployment needs.

## Security modes

Candidate configuration:

```ts
export default defineConfig({
  security: {
    mode: 'strict',

    templates: {
      rawHtml: 'deny',
      dynamicScript: 'deny',
      unsafeUrls: 'deny',
    },

    browser: {
      csp: true,
      trustedTypes: true,
      eval: false,
    },

    server: {
      csrf: true,
      originValidation: true,
      requestSizeLimit: '1mb',
      secureCookies: true,
    },

    registry: {
      verifyIntegrity: true,
      scripts: 'deny',
      requireProvenance: true,
    },
  },
});
```

Production defaults should be strict. Exceptions require explicit local configuration and should support a documented reason.

## Security diagnostics

Candidate compiler and runtime codes:

```text
VII-SEC-001 raw HTML from an untrusted string
VII-SEC-002 unsafe URL protocol
VII-SEC-003 dynamic event-code binding
VII-SEC-004 inline script generation
VII-SEC-005 server secret imported into client graph
VII-SEC-006 unsanitized HTML sink
VII-SEC-007 user-controlled unbounded operation
VII-SEC-008 untrusted input passed to shell
VII-SEC-009 untrusted filesystem path
VII-SEC-010 server fetch without URL policy
VII-SEC-011 sensitive value included in diagnostics
VII-SEC-012 registry item requests executable script
VII-SEC-013 unsafe hydration serialization
VII-SEC-014 missing authorization policy
VII-SEC-015 plugin permission escalation
```

Codes are stable contracts once published.

## Security testing

Required test classes:

- context-specific escaping tests;
- XSS payload corpus;
- template parser fuzzing;
- sanitizer policy tests;
- unsafe URL cases;
- CSP and Trusted Types fixtures;
- SSR serializer fuzzing;
- hydration mismatch attacks;
- client/server secret boundary tests;
- CSRF fixtures;
- SQL and command-injection guidance fixtures;
- path traversal and archive extraction tests;
- SSRF fixtures;
- registry integrity and malicious manifest tests;
- plugin permission tests;
- dependency and secret scanning;
- AI prompt-injection tool tests;
- penetration testing before stable framework releases.

The web and server security target should align with OWASP ASVS Level 2 for most applications. AI-enabled features should map applicable controls to OWASP AI security verification guidance. Desktop research should include thick-client verification requirements.

## Security review triggers

Dedicated review is required for changes to:

- parsers and serializers;
- template sinks;
- URL policy;
- client/server classification;
- authentication or authorization helpers;
- filesystem, process, and network capabilities;
- registry and plugin execution;
- package publishing;
- cryptography;
- secret handling;
- AI tool permissions;
- native bridges;
- update mechanisms.

## Vulnerability response

Before public stable releases, the repository must provide:

- `SECURITY.md`;
- private reporting channel;
- supported version policy;
- severity classification;
- response and disclosure process;
- security advisory and patch procedure;
- compromised package and credential revocation plan.

## Non-goals

Vii does not replace:

- application-specific authorization design;
- secure infrastructure configuration;
- operating-system permissions;
- browser security;
- database access control;
- secret managers;
- antivirus products;
- professional threat modeling and penetration testing.

Vii provides safer defaults, typed boundaries, compiler checks, visible permissions, deterministic mutation plans, and testable security contracts around those systems.
