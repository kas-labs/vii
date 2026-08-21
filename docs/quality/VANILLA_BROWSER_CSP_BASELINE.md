# Vanilla Consumer Browser CSP & Trusted Types Baseline

Status: Phase 4 validation evidence, bounded reference consumer only

## Scope

This document records the Content Security Policy (CSP) and Trusted Types enforcement validation for
the experimental `@vii-labs/core` runtime inside the clean Vanilla reference consumer:

    vii-reference-vanilla-onboarding

The validation verifies that:

1. The packed Vanilla reference consumer operates without violations under strict Content Security
   Policy headers with no `unsafe-eval` and restricted script sources (`'self'`).
2. The runtime operates under full Trusted Types enforcement (`require-trusted-types-for 'script'`).
3. Core primitives (`State`, `Computed`, `Batch`, `Scope`, `Diagnostics`) do not use `eval()`, `new Function()`,
   implicit timer strings, or dynamic script injection sinks.
4. Interactive DOM UI lifecycles (creation, mutation, batching, disposal) and programmatic Core Scope
   workflows execute cleanly with zero CSP security violation events and zero console errors.
5. Strict CSP policy enforcement is actively verified via negative probes (`eval()` execution is blocked
   by the browser).

This is empirical validation evidence for the reference consumer. It changes no Core runtime behavior,
package exports, or public API contracts.

## Methodology and environment

The measurement uses headless Google Chrome automated directly via the Chrome DevTools Protocol (CDP)
over Node 22 native WebSocket, serving the production-built Vanilla onboarding application over an
ephemeral local HTTP server with dynamically configured CSP response headers. Each scenario executes in
an isolated, clean browser context (`Target.createBrowserContext`).

Reproduction command:

```bash
node scripts/benchmarks/vanilla-browser-csp.mjs
```

Environment captured on 2026-08-22:

- Core package: `@vii-labs/core@0.1.0-experimental.2` (packed ESM artifact)
- Consumer application: `vii-reference-vanilla-onboarding` (Vite 8.2.1 / TypeScript 6.0.2)
- Browser: `Google Chrome 151.0.7922.170` (Headless)
- Browser harness: Chrome DevTools Protocol (CDP) via Node 22 native WebSocket
- Node.js: `v22.17.0`
- pnpm: `10.12.4`
- Host OS: `macOS Darwin arm64 25.5.0` (Apple M4)
- Base commit: `b780547d797f0a09458d2d587d420c4253f15d2b`

## Tested CSP configurations

### 1. Strict Baseline CSP

Policy header:

```http
Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none';
```

- **Restrictions**: `default-src 'none'`, no `unsafe-eval`, script execution confined strictly to `'self'`.
- **UI Lifecycle**: `create-scope` -> `increment` (count=1) -> `batch` (count=3, doubled=6) -> `dispose-scope` (status="Scope disposed").
- **Programmatic Scope**: `createScope`, `state`, `computed`, `batch`, subscriber notification, and `scope.dispose()`.
- **Observed Violations**: **0** `securitypolicyviolation` events during lifecycle execution.
- **Console Errors**: **0** unexpected errors.

### 2. Strict CSP with Trusted Types Enforcement

Policy header:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types default;
```

- **Restrictions**: requires Trusted Types for all script evaluation sinks (`require-trusted-types-for 'script'`), restricts allowed policy names to `default`.
- **UI Lifecycle**: completed full DOM mount, counter updates, and Scope disposal cleanly.
- **Programmatic Scope**: full Core reactive graph executed with zero Trusted Types sink errors.
- **Observed Violations**: **0** `securitypolicyviolation` events.
- **Console Errors**: **0** unexpected errors.

### 3. Active Policy Enforcement Verification (Negative Probes)

To verify that the browser is actively enforcing CSP restrictions and not silently ignoring headers:

- An explicit `window.eval("1 + 1")` probe was executed in each scenario.
- In both configurations, Chromium actively blocked evaluation with an `EvalError` / CSP security policy
  violation, confirming active policy enforcement.

## Results summary

| Scenario | CSP Header Highlights | UI Scope Lifecycle | Programmatic Scope | Eval Blocked | CSP Violations | Console Errors |
| --- | --- | :---: | :---: | :---: | :---: | :---: |
| **Strict Baseline CSP** | `default-src 'none'`, `script-src 'self'` | Pass | Pass | Yes | 0 | 0 |
| **Strict Trusted Types** | `require-trusted-types-for 'script'` | Pass | Pass | Yes | 0 | 0 |

The raw JSON report is committed at `benchmarks/results/vanilla-browser-csp.json`.

## Core platform-neutral security contract

The `@vii-labs/core` runtime is designed to be platform-neutral and strict CSP compliant:

- **Zero dynamic code generation**: Core contains no `eval()`, `new Function()`, `WebAssembly.compile`, or string-to-code execution.
- **Zero DOM dependency**: Core contains no `document`, `window`, `innerHTML`, or DOM manipulation sinks; all DOM interactions remain strictly at host application / adapter boundaries.
- **Deterministic lifecycle**: reactive updates and Scope disposal operate through synchronous references without implicit timer strings or unsafe execution contexts.

## Limitations and non-claims

- **No universal security certification**: these measurements demonstrate that `@vii-labs/core` and the tested Vanilla reference consumer operate cleanly under strict CSP and Trusted Types in Google Chrome 151; they do not constitute a formal penetration test, compliance audit, or universal guarantee for unreviewed host applications.
- **No external alpha**: deployment CSP and Trusted Types validation is internal verification evidence; it does not promote Phase 4 to an external alpha or support commitment.
- **No release budget**: this document records local empirical security baseline evidence; numeric release budgets remain a separate open gate.
