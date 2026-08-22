# Vii Source Distribution Mutation Lifecycle Research (P6.4)

> **Throwaway research only.** This directory is not a package, public API, support fixture, or production implementation.

This directory contains research prototypes proving the complete 9-phase source distribution mutation lifecycle for Phase 6 UI Foundation (P6.4):

- **Standard Lifecycle Model**:
  ```text
  Resolve local fixture
  -> Validate manifest & integrity
  -> Analyze project (lstat, symlink, & hash inspection)
  -> Plan (construct machine-readable file plan)
  -> Preview / dry-run (byte-for-byte non-mutating)
  -> Apply (atomic writes with { flag: 'wx' })
  -> Validate result (verify files on disk match expected content & SHA-256 hashes)
  -> Record lock state (update vii.lock with original installed hashes)
  -> Report (machine-readable structured summary)
  ```
- **Local Modification Protection**: Fails closed when existing files have local modifications (no silent overwriting and no `--force` in initial slice).
- **Idempotency**: Re-running installation on an unchanged project reports `unchanged` with zero redundant disk writes.
- **Root & Symlink Containment**: Destination files and parent directories must reside safely within the project root and must not be symbolic links.
- **Source Detachment**: Removing an item from `vii.lock` removes registry tracking while leaving installed application-owned code completely intact.

---

## Verification Commands

Run the focused test suite and type check:

```bash
pnpm exec vitest run research/source-distribution/*.test.ts
pnpm exec tsc --noEmit -p research/source-distribution/tsconfig.json
```

---

## 1. Lifecycle Phases Summary

| Phase | Responsibility | Error / Block Condition |
| --- | --- | --- |
| **1. Resolve** | Loads local manifest and file payloads. | Missing manifest or payload |
| **2. Validate** | Validates schema and verifies SHA-256 payload integrity. | Malformed schema, prototype pollution, hash mismatch |
| **3. Analyze** | Inspects destination paths and existing on-disk files. | Symlinks, parent directory escapes, local changes |
| **4. Plan** | Assembles list of planned actions (`create`, `skip`). | Any unresolved conflict |
| **5. Preview** | Evaluates dry-run mode without modifying file system. | None (returns without write) |
| **6. Apply** | Atomically creates directories and writes files. | System I/O or permission errors |
| **7. Validate Result** | Reads back written files to confirm content identity. | Disk write corruption |
| **8. Record Lock** | Updates `vii.lock` with item metadata and original hashes. | Lock serialization error |
| **9. Report** | Returns machine-readable structured status and summary. | None |
