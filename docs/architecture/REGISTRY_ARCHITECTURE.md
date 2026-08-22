# Vii Registry Architecture

Status: Draft / Research

## Purpose

The Vii Registry is a candidate declarative distribution system for source files, themes, tokens, examples, and later ecosystem items through a deterministic CLI workflow.

The registry begins with Vii UI research, but the contract should remain reusable without forcing UI-specific assumptions into future Vii ecosystem work.

## Core principle

A registry item is declarative metadata plus files.

It is not arbitrary executable installation code.

Registry parsing, validation, provenance, integrity, and path safety must be established before mutation code is allowed to trust registry input.

## Initial research item types

```text
ui:component
ui:primitive
ui:block
ui:theme
ui:tokens
example:application
template:project
```

Later item types require independent governance and evidence.

## Provisional item model

An illustrative research shape may include:

```json
{
  "schemaVersion": 1,
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
  "tokens": ["color.primary", "focus.ring"],
  "capabilities": ["keyboard", "focus-visible"]
}
```

The exact schema, `$schema` URL, package names, dependency representation, and remote addressing remain provisional while RFC 0010 is Draft.

Do not publish a final compatibility schema from a throwaway P6.3 fixture.

## Validation before trust

Registry data is untrusted structured input.

Validation must happen before path planning or writes and should cover:

- supported manifest/schema version;
- finite allowed item types;
- expected primitive/value shapes;
- duplicate fields or destinations where relevant;
- prototype-pollution-shaped keys;
- excessive nesting, file count, and metadata size;
- integrity format;
- target/mode compatibility;
- dependency metadata policy;
- token/capability metadata bounds.

Parsing must not mutate global or object prototypes.

## Path containment

Every destination path must resolve inside the approved project root.

Required rejection cases include:

- `..` traversal;
- absolute paths;
- drive/root prefixes where applicable;
- encoded or normalized traversal variants;
- duplicate destinations;
- parent-directory symlink escape;
- destination symlink escape;
- path collisions with directories/non-files;
- unsupported path normalization.

Path validation must be descriptor/no-follow aware where the existing CLI security model requires it. String-prefix checks alone are not sufficient proof of containment.

## Integrity

Registry content should be verified before apply.

Research must distinguish:

- manifest integrity;
- individual file integrity;
- transport trust;
- registry provenance;
- signing/attestation.

A cryptographic content hash proves content identity, not publisher identity. Signature or attestation policy is a later trust decision and must not be implied by a SHA-256 field.

## Registry addressing

Remote registry addressing is deferred until the local fixture contract and mutation safety model are proven.

Future research may support official, private, community, or other registries, but labels such as `official` or `trusted` are metadata and policy inputs. They must not bypass schema, integrity, path, dependency, preview, or mutation checks.

No Kas Labs cloud account is required by the registry data model.

## File ownership

Source-mode files become application-owned after successful installation.

Registry/lock state may record original hashes and provenance for future comparison, but it must not silently overwrite local modifications.

The application must retain an explicit exit path.

## Provisional lock state

RFC 0010 currently uses `vii.lock` as a provisional filename.

The first research representation should record only data needed to prove deterministic source ownership, for example:

- lock schema version;
- registry item identity;
- item version;
- registry/provenance identity;
- manifest/content integrity;
- installed target/mode;
- installed file paths;
- original installed file hashes.

The final serialization format remains open for prototype validation.

A lock entry is evidence about what was installed. It is not authority to overwrite local files later.

## Installation workflow

The research workflow is:

```text
Resolve local item
-> Validate item and integrity
-> Analyze project
-> Build explicit file/dependency plan
-> Preview / dry-run
-> Apply
-> Validate generated project
-> Record lock state
-> Report
```

This reuses the Vii CLI mutation discipline while adding registry-specific Resolve and validation steps before mutation.

The first P6.4 slice should use local fixtures. Remote network resolution and dependency installation are separate capabilities.

## Conflict policy

First-time `add` must fail closed when a planned destination is already locally owned unless the content is already exactly the expected installed content and the idempotency contract explicitly permits it.

Do not introduce a generic `--force` overwrite path in the first mutation slice.

Three-way comparison belongs to update research:

1. original installed content;
2. current local content;
3. requested upstream content.

Locally modified files must never be silently replaced.

## Detachment

A future operation such as:

```bash
vii ui detach button
```

may remove registry tracking while preserving application-owned source files.

Detachment is a first-class no-lock-in requirement. It must not delete files merely because they were once registry-managed.

## Dependency handling

Registry manifests may declare dependency intent, but declaration does not grant execution authority.

Initial source installation should separate:

- dependency metadata;
- dependency plan;
- package-manager execution.

Automatic dependency installation, lifecycle scripts, postinstall hooks, and arbitrary commands require separate policy and approval. Registry items themselves must never carry executable install hooks.

## Security and content policy

Security is a precondition for P6.4, not a P6.6-only audit.

Required research fixtures include:

- traversal/root escape;
- symlink escape;
- duplicate targets;
- prototype pollution;
- malformed/oversized manifests;
- integrity mismatch;
- generated template/content injection;
- unexpected executable file types where policy restricts them;
- dependency metadata abuse;
- deterministic dry-run behavior.

CSP and Trusted Types apply to rendered/runtime UI output rather than registry JSON itself, but registry-distributed templates must not introduce dynamic-code or unsafe script requirements without an explicit reviewed boundary.

## Offline and private use

Schemas, validators, lock-state tooling, and local fixtures remain open and usable without a hosted Vii service.

Future registries may be mirrored or hosted privately.

## Machine consumers

Registry metadata may eventually be consumed by:

- Vii CLI;
- CI;
- documentation tooling;
- IDEs;
- InLoom;
- future agent integrations.

Machine consumers use the same explicit contracts and trust boundaries. No private hidden registry format is required for correctness.

## Graduation gate

Before RFC 0010 can move toward acceptance, P6.3/P6.4 evidence should answer:

- whether the manifest/lock model is deterministic and small;
- whether path and prototype-pollution boundaries fail closed;
- whether source ownership and detachment work without hidden lock-in;
- whether the lock state is actually required for the validated workflows;
- whether remote registry transport adds enough value to justify its security and maintenance cost;
- whether mature existing registry/source-distribution tools solve the same need more cheaply.
