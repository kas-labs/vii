# UI Distribution Modes and Security Hardening Strategy (P6.6)

> **Status**: Accepted Phase 6 Research Strategy  
> **Date**: 2026-08-22  
> **Preceding Slices**: P6.1 (Tokens), P6.2 (Behaviors), P6.3 (Registry), P6.4 (Source Distribution), P6.5 (Cross-Framework Compliance)

---

## Executive Summary

Phase 6 UI Foundation research evaluated three distribution models (**Source Distribution**, **Package Distribution**, and **Custom Elements**) alongside strict **Security Hardening** (CSP compliance, path containment, prototype pollution defense, and cryptographic provenance).

This evaluation establishes clear architectural boundaries:

1. **Source Mode is the Default for Components**: Source distribution (`vii ui add`) provides full code ownership, zero peer-dependency churn across framework versions (e.g. React 18 vs 19, Angular 17 vs 18+), zero runtime abstraction tax, and effortless customization.
2. **Package Mode is Retained Strictly for Headless Behaviors**: Framework-agnostic behavior primitives (`@vii-labs/ui-behaviors`) and DOM capability providers can be packaged safely because they have zero framework dependencies, zero styling baggage, and zero JSX/template compilation overhead.
3. **Light DOM is Mandatory for ARIA & Form Components**: Custom Elements must use Light DOM whenever ARIA cross-referencing (`aria-controls`, `aria-labelledby`) or native form association is required. Shadow DOM is restricted to isolated visual-only widgets.
4. **Shift-Left Security Gating**: All registry inputs are fail-closed: path traversal (`..`, `%2e%2e`), absolute paths, prototype pollution (`__proto__`), executable scripts, and cryptographic tampering are blocked before mutation code touches the disk.
5. **Strict CSP & Trusted Types Compliance**: Zero dynamic code generation (`eval`, `new Function`) and zero unsafe DOM injection (`innerHTML`). Token styling is generated exclusively as standard CSS custom property declarations.

---

## 1. Distribution Modes Evaluation

| Dimension | Source Distribution (`vii ui add`) | Package Distribution (npm) | Custom Elements (Web Components) |
| --- | --- | --- | --- |
| **Code Ownership** | 100% in user repository | Upstream dependency in `node_modules` | Upstream or local script |
| **Framework Churn** | Completely immune to peer-dep mismatch | High risk of peer-dependency lock-in | Platform native, but requires framework wrappers |
| **Customizability** | Direct source edits without patching | CSS variables or rigid prop overrides | CSS variables / `::part` styling hooks |
| **Tree Shaking** | Handled natively by application bundler | Depends on package build configuration | Bundled runtime registry |
| **Detachment Path** | Clean detachment by removing `vii.lock` record | `pnpm remove` | `pnpm remove` |
| **Recommended Scope** | **Primary for UI components, blocks, themes** | **Headless behaviors only (`ui-behaviors`)** | **Selective non-composite widgets only** |

### Source Ownership & Detachment Semantics
- **Lockfile Role**: `vii.lock` records initial installation metadata and original file hashes (`originalIntegrity`).
- **Conflict Prevention**: Tooling compares on-disk hashes against `originalIntegrity` before any update operation. If local modifications are detected, the tool fails closed without silent overwrites (no `--force` in initial releases).
- **Source Detachment**: Calling `detach` removes the lockfile tracking record while leaving all installed source files in the project workspace untouched.

---

## 2. Custom Elements: Shadow DOM vs Light DOM

A critical architectural finding from P6.5 and P6.6 is that **Shadow DOM breaks composite ARIA patterns in modern browsers**:

- **Cross-Root ARIA Limitation**: Browser accessibility trees do not reliably resolve ID references (`aria-controls`, `aria-labelledby`, `aria-describedby`) that cross Shadow DOM boundaries.
- **Form Association**: Standard inputs inside Shadow Roots do not automatically participate in parent `<form>` submission without complex `ElementInternals` plumbing.

### Decision Rule
- **Use Light DOM**: All disclosure buttons, tab lists, dialog triggers/panels, menus, tooltips, and form inputs.
- **Use Shadow DOM**: Only self-contained, purely visual widgets (e.g. avatars, badges, loaders) with zero external ARIA relationships.

---

## 3. Security Hardening & Threat Model Summary

```text
┌─────────────────────────────────────────────────────────────┐
│ Threat Category          │ Mitigation & Enforcement         │
├──────────────────────────┼──────────────────────────────────┤
│ Prototype Pollution      │ Deep key scan rejecting __proto__│
│ Directory Traversal      │ Rejection of .., %2e%2e, /, C:\  │
│ Executable Code Payload  │ Rejection of .sh, .exe, scripts  │
│ Integrity Tampering      │ SHA-256 base64 payload matching  │
│ CSP Violations           │ Zero eval(), zero innerHTML      │
│ Target Collisions        │ Rejection of duplicate targets   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Policy Verdict

1. **Retain Source Distribution** as the primary delivery mechanism for Vii UI components.
2. **Retain Package Distribution** solely for headless behaviors (`@vii-labs/ui-behaviors`) and core signal utilities.
3. **Reject Universal Cross-Framework Compiler** in favor of lightweight, framework-native adapters.
4. **Enforce Light DOM** as the default boundary for any composite ARIA or form-associated Web Component.
