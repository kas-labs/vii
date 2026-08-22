# Vii UI Security Hardening & Distribution Modes Research (P6.6)

> **Throwaway research only.** This directory is not a package, public API, support fixture, or production implementation.

This directory contains research prototypes consolidating distribution mode trade-offs and security hardening for Phase 6 UI Foundation (P6.6):

- **Distribution Mode Decisions**:
  - **Source Mode (`vii ui add`)**: Primary mechanism for components, templates, and themes. Full ownership, zero peer-dependency drag, clean lockfile detachment.
  - **Package Mode (`npm`)**: Retained strictly for headless behavior state machines (`@vii-labs/ui-behaviors`).
  - **Custom Elements**: Light DOM is mandatory for form-associated or ARIA cross-referencing components. Shadow DOM is restricted to isolated visual widgets.
- **Security Hardening**:
  - Strict Content Security Policy (CSP) & Trusted Types compliance (zero `eval`, `new Function`, `innerHTML`, or inline JS URIs).
  - CSS Custom Property generation from DTCG tokens conforming to strict `script-src 'self'`.
  - Comprehensive threat-model consolidation across registry parsing and local file mutation.

---

## Verification Commands

Run the focused test suite and type check:

```bash
pnpm exec vitest run research/security-hardening/*.test.ts
pnpm exec tsc --noEmit -p research/security-hardening/tsconfig.json
```

---

## Strategic Documentation Reference

See the full architectural evaluation in [`docs/strategy/UI_DISTRIBUTION_MODES_AND_SECURITY_HARDENING.md`](../../docs/strategy/UI_DISTRIBUTION_MODES_AND_SECURITY_HARDENING.md).
