# Vii Registry Contract & Threat-Model Research (P6.3)

> **Throwaway research only.** This directory is not a package, public API, support fixture, or production implementation.

This directory contains research prototypes validating the foundational security and manifest architecture of Phase 6 Registry (P6.3):

- **Core Principle**: A registry item is strictly declarative metadata plus files. It is not arbitrary executable installation code.
- **Threat-Model Gating**: Establishes fail-closed validation for path containment, prototype pollution, executable rejection, and hostile payloads before mutation code is allowed to trust registry inputs.
- **Content Integrity**: Validates individual files and manifests using SHA-256 base64 cryptographic hashes (`sha256-<hash>`).
- **Provisional Lockfile Model**: Implements deterministic lock state recording, tracking original file hashes to enable future three-way comparison without silently overwriting local changes.
- **Source Detachment**: Proves clean detachment semantics where registry tracking is removed from the project lockfile while preserving application-owned source files intact.

---

## Verification Commands

Run the focused test suite and type check:

```bash
pnpm exec vitest run research/registry/*.test.ts
pnpm exec tsc --noEmit -p research/registry/tsconfig.json
```

---

## 1. Threat Model & Validation Rules

| Threat Vector | Mitigation Strategy | Policy Outcome |
| --- | --- | --- |
| **Prototype Pollution** | Deep scan rejecting `__proto__`, `constructor`, `prototype` as keys. | Fails closed with `SECURITY_VIOLATION` |
| **Directory Traversal** | Rejects `..`, `%2e%2e`, encoded variants, and root escapes. | Fails closed with `PATH_TRAVERSAL` |
| **Absolute Paths** | Rejects `/...`, `\...`, `C:\...` path prefixes. | Fails closed with `ABSOLUTE_PATH` |
| **Executable Injection** | Rejects `.sh`, `.exe`, `.bat`, `.cmd` files and `executable: true` flags. | Fails closed with `EXECUTABLE_REJECTED` |
| **Duplicate Destinations** | Detects collisions where multiple files target the same project destination. | Fails closed with `DUPLICATE_DESTINATION` |
| **Hostile Nesting/Size** | Enforces max depth (15) and node limits on manifest ASTs. | Fails closed with `DEPTH_LIMIT_EXCEEDED` |
| **Integrity Tampering** | Verifies SHA-256 hash against actual file byte payload. | Fails closed with `INVALID_INTEGRITY` |

---

## 2. Lockfile Representation & Serialization

The provisional lock state records:

1. `schemaVersion: 1`
2. `name`, `type`, `version`, `target`, `mode`, `registry`
3. `manifestIntegrity` (deterministic SHA-256 hash of canonical manifest AST)
4. `files`: Map of targets to original installed cryptographic hashes
5. `dependencies` and required `tokens`
6. `detached`: Boolean indicating explicit separation from upstream tracking

### Deterministic Serialization
Lockfiles are serialized with lexicographically sorted item and file keys, ensuring byte-stable commits across runs.

---

## 3. Source Ownership & Detachment

- **Local Modification Safety**: Tooling compares current file hashes against `originalIntegrity` recorded in the lockfile to detect local user modifications before any update.
- **Clean Detach Path**: Detaching an item deletes its entry from `vii.lock` while leaving all installed source files in the project completely untouched.
