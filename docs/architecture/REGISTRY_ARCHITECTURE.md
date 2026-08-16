# Vii Registry Architecture

Status: Draft

## Purpose

The Vii Registry distributes source files, package metadata, themes, tokens, project templates, generators, migrations, and future ecosystem extensions through a deterministic CLI workflow.

The registry begins with Vii UI, but its architecture should support the wider Vii ecosystem without requiring a separate incompatible registry later.

## Core principle

A registry item is declarative data plus files. It is not arbitrary executable installation code.

## Initial item types

```text
ui:component
ui:primitive
ui:block
ui:theme
ui:tokens
example:application
template:project
```

Potential later types:

```text
state:store
query:resource
form:schema
server:contract
tool:generator
tool:migration
intentloom:policy
```

Later types require independent RFC approval.

## Registry item model

Illustrative shape:

```json
{
  "$schema": "https://vii.dev/schema/registry-item.json",
  "name": "button",
  "type": "ui:component",
  "version": "0.1.0",
  "target": "react",
  "mode": "source",
  "files": [
    {
      "source": "button.tsx",
      "target": "components/ui/button.tsx",
      "integrity": "sha256-..."
    }
  ],
  "dependencies": [],
  "viiDependencies": ["@kas-labs/vii-ui-tokens"],
  "tokens": ["color.primary", "focus.ring"],
  "capabilities": ["keyboard", "focus-visible"]
}
```

The final schema requires a dedicated implementation RFC.

## Registry addressing

Official items:

```bash
vii ui add button
vii ui add @vii-labs/dialog
```

Private or third-party registries:

```bash
vii ui add @company/payment-form
```

Project configuration may map namespaces to registry endpoints.

```json
{
  "registries": {
    "@vii-labs": "https://registry.vii.dev/{name}.json",
    "@company": "https://ui.company.example/registry/{name}.json"
  }
}
```

## Trust model

Registries are classified as:

- official;
- trusted private;
- community;
- untrusted.

The CLI must display the source and trust level before installation.

## Security requirements

Registry installation must not automatically execute arbitrary scripts from an item.

Required controls:

- content integrity hashes;
- schema validation;
- explicit file plan;
- path traversal prevention;
- dependency allow and deny checks;
- no hidden lifecycle script execution;
- source registry identity in the lockfile;
- preview and dry-run support;
- conflict detection;
- deterministic output.

## File ownership

Source-mode files become application-owned after installation.

The registry records their original hashes to support comparison, but it must not silently overwrite local modifications.

## Vii lockfile

A project may contain `vii.lock` or another RFC-approved lockfile name.

Illustrative content:

```json
{
  "lockfileVersion": 1,
  "items": {
    "@vii-labs/button": {
      "version": "0.3.1",
      "registry": "@vii-labs",
      "integrity": "sha256-...",
      "files": {
        "src/components/ui/button.tsx": "sha256-..."
      }
    }
  }
}
```

The lockfile enables:

- reproducible installation;
- local modification detection;
- three-way diff preparation;
- registry integrity checks;
- item provenance;
- safe detachment.

## Installation workflow

```text
Resolve
→ Validate registry and item
→ Analyze project
→ Build file and dependency plan
→ Preview
→ Apply
→ Validate generated project
→ Record lock state
→ Report
```

This reuses the general Vii CLI mutation lifecycle.

## Updates

`vii ui update button` must compare:

1. the originally installed registry version;
2. the local project version;
3. the new registry version.

When local changes exist, the CLI provides a three-way diff and never performs a silent destructive replacement.

## Detachment

```bash
vii ui detach button
```

Detachment removes registry tracking while leaving source files in the project.

This is a first-class exit path and supports the no-lock-in principle.

## Registry service boundary

The official registry may be hosted, mirrored, or downloaded for offline use.

Core schemas, validators, and lockfile handling must remain open and usable without a required Kas Labs cloud account.

## Machine consumers

Registry metadata may be used by:

- Vii CLI;
- documentation;
- InLoom;
- IDE extensions;
- CI validation;
- future MCP or AI integrations.

Machine consumers receive the same contracts as human tooling. No private hidden registry format should be required.
