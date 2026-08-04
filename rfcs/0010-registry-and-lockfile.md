# RFC 0010: Registry and Lockfile

Status: Draft

## Summary

Vii introduces a declarative registry for distributing UI source files, package metadata, themes, tokens, templates, and future ecosystem items.

A project lockfile records installed registry items, integrity, provenance, and original file hashes.

## Motivation

Source-distributed components need a safe and reproducible installation model.

Without registry metadata and lock state, the CLI cannot reliably:

- identify installed items;
- distinguish local modifications from upstream changes;
- verify downloaded content;
- prepare three-way updates;
- reproduce installation;
- detach an item cleanly.

## Decision

Registry items are declarative manifests plus files.

They must not contain automatically executed installation scripts.

The CLI applies registry items through the standard mutation lifecycle:

```text
Resolve
→ Validate
→ Analyze
→ Plan
→ Preview
→ Apply
→ Validate project
→ Record lock state
→ Report
```

## Initial registry scope

- UI components;
- UI primitives;
- UI blocks;
- themes;
- design tokens;
- application examples;
- project templates.

Other item types require later RFCs.

## Lockfile

The provisional filename is `vii.lock`.

The lockfile records:

- lockfile schema version;
- item name and type;
- item version;
- registry identity;
- manifest integrity;
- installed file paths;
- original installed file hashes;
- installation target and mode;
- relevant dependencies.

The final serialization format remains open for prototype validation.

## Updates

Updates use three inputs:

1. original installed content;
2. current local content;
3. requested upstream content.

The CLI must not silently overwrite a locally modified file.

## Detachment

Detachment removes registry tracking and leaves source-owned files intact.

Detachment is an explicit supported exit path, not an error condition.

## Registries

Supported classes:

- official Vii registry;
- trusted private registry;
- community registry;
- untrusted registry.

The CLI displays registry origin and trust classification before applying changes.

## Security

Required protections:

- schema validation;
- integrity hashes;
- path traversal prevention;
- explicit file plan;
- no hidden executable hooks;
- safe dependency handling;
- conflict detection;
- dry-run support;
- deterministic generation;
- provenance in the lockfile.

## Offline and private use

Schemas, validators, and lockfile tooling must remain open.

A registry may be mirrored or hosted privately. Core installation must not require a Kas Labs cloud account.

## Machine-readable contracts

The registry and lockfile are consumable by:

- CLI;
- CI;
- documentation tooling;
- IDEs;
- InLoom;
- future agent integrations.

## Open questions

- JSON, YAML, or another lockfile serialization?
- How should dependency ranges be represented?
- How are signed registry indexes introduced later without central lock-in?
- What is the cache and offline mirror format?
- How should renamed or moved local files be reconciled?
- Which registries may be trusted automatically in non-interactive CI?
