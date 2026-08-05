# Vii Threat Model

Status: Draft

## Purpose

This document identifies assets, trust boundaries, attacker capabilities, abuse cases, and required controls across the Vii ecosystem.

It complements `SECURITY_ARCHITECTURE.md`. The architecture describes intended controls. This document describes what those controls are defending.

## Method

The threat model uses an asset and trust-boundary approach informed by STRIDE categories:

```text
Spoofing
Tampering
Repudiation
Information disclosure
Denial of service
Elevation of privilege
```

Threats are reviewed per product layer rather than assuming one universal deployment.

## Protected assets

### Application assets

- user data;
- authentication sessions;
- authorization state;
- business data;
- application source;
- configuration;
- server secrets;
- build outputs;
- audit records.

### Developer assets

- local filesystem;
- Git repository;
- package-manager credentials;
- SSH keys;
- cloud credentials;
- environment variables;
- browser sessions;
- signing and publishing credentials.

### Vii ecosystem assets

- official source repositories;
- package namespace;
- release workflows;
- npm packages;
- registry manifests;
- integrity metadata;
- documentation;
- compiler and CLI distribution;
- security advisories;
- project reputation and user trust.

## Trust boundaries

```text
User input -> application template
Browser -> Vii server
Client graph -> server graph
Application -> database
Server -> external network
Uploaded file -> storage and processing
Developer -> Vii CLI
Remote registry -> local project
Plugin -> host process
Build dependency -> build environment
CI -> package registry
AI model -> tools and project mutation
Native webview -> desktop or mobile host
```

Every crossing requires a documented validation, encoding, permission, authentication, integrity, or isolation rule.

## Attacker profiles

### Remote unauthenticated attacker

Can send crafted requests, URLs, headers, form values, files, and navigation sequences.

### Authenticated malicious user

Can exercise valid product features while attempting privilege escalation, data access, injection, or resource exhaustion.

### Malicious content author

Can submit HTML-like text, rich content, markdown, images, SVG, archives, or documents.

### Malicious package or registry publisher

Can publish typosquatted packages, altered manifests, dependency chains, unsafe templates, or executable plugins.

### Compromised dependency maintainer

Can release malicious code through an otherwise trusted dependency.

### Compromised developer workstation

May have access to local credentials and repositories. Vii controls reduce blast radius but cannot secure an already fully compromised host.

### Malicious or manipulated AI context

Can place prompt-injection instructions in files, issues, webpages, logs, generated output, or tool results.

### Insider with repository or release access

May attempt unauthorized code or package publication.

## Template and browser threats

### XSS through text interpolation

Threat:

```html
<img src=x onerror=attack()>
```

is interpreted as markup or script.

Controls:

- text-node binding by default;
- context-aware encoding;
- no string event handlers;
- CSP;
- Trusted Types;
- malicious fixture tests.

### Raw HTML bypass

Threat: application code marks untrusted HTML as safe without sanitization.

Controls:

- opaque `SafeHtml` type;
- approved sanitizer boundary;
- compiler diagnostics;
- policy-specific tests;
- code review trigger.

### Unsafe URL execution

Threat: `javascript:`, dangerous `data:`, redirect, or external-origin abuse.

Controls:

- normalized URL policy;
- scheme and origin allowlists;
- context-specific safe URL type;
- browser policy headers.

### CSS-based data or navigation abuse

Threat: untrusted style text introduces URL loads, overlays, clickjacking behavior, or sensitive UI manipulation.

Controls:

- property-level bindings;
- no raw style strings by default;
- CSP style policy;
- scoped and generated styles;
- explicit CSS URL policy.

## SSR and hydration threats

### Script-context breakout

Threat: serialized data closes a script or HTML context and injects markup.

Controls:

- non-executable JSON script type;
- HTML-safe serializer;
- schema versioning;
- payload size limits;
- fuzzing.

### Cross-request state leak

Threat: one user's mutable state, service instance, diagnostics, or authorization data is reused for another request.

Controls:

- request Scope;
- no global mutable application state by default;
- disposal after response;
- concurrency fixtures;
- request correlation.

### Secret leakage to client graph

Threat: server environment variables, database clients, tokens, or internal data enter browser code or hydration payloads.

Controls:

- server/client import classification;
- build-time rejection;
- serialized-schema allowlist;
- bundle scanning;
- secret scanning.

### Hydration mismatch exploitation

Threat: unsafe fallback writes raw server or client content, or mismatch hides altered DOM.

Controls:

- deterministic initial rendering;
- mismatch diagnostics;
- no raw HTML fallback;
- client revalidation of hydration data;
- CSP and Trusted Types.

## Server threats

### Injection into database query

Controls:

- parameterized APIs;
- validated input;
- identifier allowlists;
- least-privilege database account;
- adapter guidance and tests.

### Command injection

Controls:

- no shell by default;
- separate argument array;
- executable and argument policy;
- environment allowlist;
- timeout and output limits;
- explicit capability grant.

### Path traversal

Controls:

- logical identifiers;
- root-confined filesystem capabilities;
- canonical resolution;
- traversal and symlink rejection;
- generated filenames.

### SSRF

Controls:

- named HTTP services;
- scheme, origin, DNS, and IP policy;
- redirect restrictions;
- metadata, loopback, and private-network blocking;
- timeout and response limits.

### CSRF

Controls:

- CSRF tokens;
- Origin and Fetch Metadata validation;
- secure cookie defaults;
- state-changing method policy;
- content-type checks.

### Broken authorization

Controls:

- server-side policy on every operation;
- object-level checks;
- typed authorization context;
- denial tests;
- no reliance on hidden client controls.

### Denial of service

Threat vectors:

- oversized bodies;
- deeply nested JSON;
- regex backtracking;
- expensive validation;
- unbounded pagination;
- file decompression bombs;
- streaming resource leaks;
- repeated expensive SSR routes.

Controls:

- limits;
- cancellation;
- deadlines;
- bounded concurrency;
- pagination caps;
- safe parsers;
- resource disposal;
- target-specific rate limiting.

## File upload threats

- executable content;
- polyglot files;
- spoofed MIME;
- malicious SVG or HTML;
- archive traversal;
- decompression bombs;
- parser vulnerabilities;
- metadata leakage;
- public execution from upload path.

Controls:

- allowlist;
- content inspection;
- generated names;
- isolated storage;
- size and count limits;
- antivirus or sandbox integration;
- content reconstruction where appropriate;
- safe response headers;
- no executable webroot storage.

## CLI threats

### Project-root escape

Threat: generated or registry-controlled path modifies files outside the project.

Controls:

- canonical project root;
- path validation;
- traversal rejection;
- diff preview;
- atomic writes.

### Hidden command execution

Threat: generator, migration, package lifecycle script, or registry item runs a command without approval.

Controls:

- declarative registry;
- scripts denied by default;
- command plan shown before execution;
- explicit approval;
- no shell by default;
- plugin distinction.

### Secret disclosure

Threat: CLI uploads or logs source, environment variables, tokens, or configuration.

Controls:

- no telemetry and source upload by default;
- redaction;
- explicit network operations;
- environment allowlist;
- JSON output that excludes secrets.

### Malicious migration

Controls:

- source and version identity;
- clean working tree;
- dry-run and diff;
- fixture tests;
- deterministic transformation;
- post-validation;
- rollback guidance.

## Registry threats

### Artifact tampering

Controls:

- cryptographic integrity;
- provenance where available;
- signature research;
- lockfile origin and hash;
- transport security;
- mismatch rejection.

### Dependency confusion

Controls:

- namespace ownership;
- explicit registry identity;
- no unsafe public fallback;
- lockfile resolution;
- package identity checks.

### Malicious source component

A source component may contain harmful application logic even without install scripts.

Controls:

- show all files and diff;
- static security checks;
- source ownership by application;
- no automatic trust escalation;
- review before integration.

### Registry account compromise

Controls:

- strong authentication;
- least privilege;
- protected publishing;
- revocation process;
- transparency and advisories;
- integrity pinning.

## Build and plugin threats

### Malicious build plugin

Threat: plugin reads secrets, changes output, executes processes, or exfiltrates source.

Controls:

- explicit plugin installation;
- permission manifest;
- trusted source policy;
- isolation where available;
- warnings when host-process authority is unavoidable;
- CI egress controls;
- reproducible output checks.

### Cache poisoning

Controls:

- cache keys include compiler, config, dependency, target, and security-policy versions;
- integrity metadata;
- trusted cache source;
- validation after restore;
- no secret-dependent output in shared caches.

### Client/server graph confusion

Controls:

- environment-aware graph;
- import rules;
- generated manifest audit;
- target-specific fixture builds.

## Supply-chain threats

- compromised transitive dependency;
- typosquatting;
- dependency takeover;
- mutable GitHub Action tag;
- leaked publish token;
- malicious release job;
- unexpected package contents;
- unreviewed lifecycle scripts.

Controls:

- minimal dependencies;
- pinned automation;
- dependency review;
- protected workflows;
- trusted publishing;
- provenance;
- package-content validation;
- SBOM;
- independent release evidence;
- incident response.

## AI threats

### Direct prompt injection

User asks the model to ignore security rules or reveal restricted context.

### Indirect prompt injection

A repository file, webpage, issue, dependency output, or log contains instructions intended for the model.

### Tool abuse

Model attempts to read secrets, execute commands, publish packages, modify protected files, or contact attacker-controlled systems.

### Data exfiltration

Sensitive project data is included in prompts or tool output sent to a remote provider.

Controls:

- strict separation of instructions and untrusted data;
- deterministic permission checks outside the model;
- least-privilege tools;
- path, command, and origin policies;
- user confirmation for sensitive actions;
- no direct execution of model output;
- provider and data-scope disclosure;
- audit trail;
- deterministic CLI mutation workflow.

## Diagnostics threats

### Sensitive data exposure

Controls:

- structural events by default;
- field allowlists;
- redaction;
- bounded payloads;
- production-safe mode;
- access control to traces.

### Log injection

Controls:

- structured logging;
- control-character handling;
- fixed event types;
- length limits;
- schema validation.

### Evidence tampering

Deployment-dependent controls may include:

- append-only storage;
- remote log shipping;
- integrity controls;
- restricted deletion;
- time synchronization;
- correlation IDs.

## Desktop and mobile threats

Research targets must consider:

- unsafe webview navigation;
- arbitrary native IPC;
- overly broad Tauri or mobile capabilities;
- insecure deep links;
- unsigned updates;
- local secret storage;
- filesystem escape;
- compromised renderer process;
- bridge message validation.

Web Components and shared State do not remove native-host security responsibilities.

## Risk ownership

Every official package requires an owner for:

- threat review;
- security test coverage;
- dependency risk;
- disclosure response;
- deprecation and patch decisions.

A package without security ownership cannot graduate to Stable.

## Review cadence

The threat model is reviewed when:

- a new execution environment is added;
- a new parser or serializer is introduced;
- plugins gain authority;
- registry behavior changes;
- authentication or authorization helpers are added;
- native bridges are introduced;
- AI tools gain new capabilities;
- a vulnerability or near miss changes assumptions;
- a major release is prepared.

## Residual risk

Some risks cannot be eliminated by Vii:

- deliberately malicious application code;
- fully compromised developer or server hosts;
- browser or runtime zero-days;
- vulnerable third-party parsers selected by an application;
- incorrect business authorization policy;
- unsafe infrastructure configuration.

Vii must document these limits and avoid claiming sandboxing or isolation that the host environment does not provide.
