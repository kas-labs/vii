# Vii Registry Contract & Threat-Model Research (P6.3)

> **Throwaway research only.** This directory is not a package, public API, support fixture, or production implementation.

This directory contains research prototypes validating the foundational security and manifest architecture of Phase 6 Registry (P6.3):

- **Execution Model & Containment Principle**: The payload of a source-distribution item is executable code by nature. Registry security controls strictly constrain **where** source code lands, not **what it does** once executed by the host toolchain or runtime.
- **Threat-Model Gating**: Establishes fail-closed validation enforcing root path containment, a destination denylist, optional destination `allowedRoots`, an executable-extension blocklist, and prototype pollution defenses before mutation code is allowed to trust registry inputs.
- **Content Integrity**: Validates individual files and manifests using recursive canonical JSON serialization and SHA-256 base64 cryptographic hashes (`sha256-<hash>`).
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
| **Root Dotfiles / Dotdirs** | Rejects destinations starting with `.` (`.git/`, `.husky/`, `.github/`, `.env`, `.npmrc`). | Fails closed with `FORBIDDEN_ROOT_DOTPATH` |
| **Node Modules Injection** | Rejects any destination path containing a `node_modules` segment. | Fails closed with `FORBIDDEN_NODE_MODULES` |
| **Toolchain Config Overwrites** | Rejects root config/manifest files (`package.json`, `package-lock.json`, `pnpm-lock.yaml`, `tsconfig*.json`, `*.config.*`). | Fails closed with `FORBIDDEN_CONFIG_FILE` |
| **Outside Allowed Roots** | Enforces optional `allowedRoots` destination boundary constraints. | Fails closed with `DISALLOWED_ROOT` |
| **Executable Extension Injection**| Rejects `.sh`, `.exe`, `.bat`, `.cmd`, `.ps1`, `.vbs` files and `executable: true` flags (defence in depth). | Fails closed with `EXECUTABLE_REJECTED` |
| **Duplicate Destinations** | Detects collisions where multiple files target the same project destination. | Fails closed with `DUPLICATE_DESTINATION` |
| **Hostile Nesting/Size** | Enforces max depth (15) and node limits on manifest ASTs. | Fails closed with `DEPTH_LIMIT_EXCEEDED` |
| **Integrity Tampering** | Verifies SHA-256 hash against actual file byte payload and manifest AST. | Fails closed with `INVALID_INTEGRITY` |


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
