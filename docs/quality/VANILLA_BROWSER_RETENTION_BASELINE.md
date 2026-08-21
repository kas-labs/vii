# Vanilla Consumer Browser Retention Baseline

Status: Phase 4 validation evidence, bounded reference consumer only

## Scope

This document records the browser retention and post-disposal lifecycle validation for the
experimental `@vii-labs/core` runtime inside the clean Vanilla reference consumer:

    vii-reference-vanilla-onboarding

The validation checks that:

1. A demo Scope can be created, exercised with State and Computed updates, and disposed in real browser execution.
2. Owned resources, subscriptions, timers, and event listeners attached to the Scope are released on disposal.
3. No stale emissions, notifications, or stale completions occur after `Scope.dispose()`.
4. Repeated interactive and programmatic lifecycle cycles (1, 100, and 1,000 cycles) execute deterministically without errors or listener/node accumulation.
5. Browser heap and DOM retention metrics remain bounded after garbage collection.

This is validation evidence for the packed reference consumer. It changes no Core runtime behavior,
package exports, or public API contracts.

## Methodology and environment

The measurement uses headless Google Chrome automated directly via the Chrome DevTools Protocol (CDP)
over Node 22 native WebSocket, serving the production-built Vanilla onboarding application over an
ephemeral local HTTP server.

Reproduction command:

```bash
node scripts/benchmarks/vanilla-browser-retention.mjs
```

Environment captured on 2026-08-21:

- Core package: `@vii-labs/core@0.1.0-experimental.2` (packed ESM artifact)
- Consumer application: `vii-reference-vanilla-onboarding` (Vite 8.2.1 / TypeScript 6.0.2)
- Browser: `Google Chrome 151.0.7922.170` (Headless)
- Browser harness: Chrome DevTools Protocol (CDP) via Node 22 native WebSocket
- Node.js: `v22.17.0`
- pnpm: `10.12.4`
- Host OS: `macOS Darwin arm64 25.5.0` (Apple M4)
- Commit: `331943de2429c9c1631ddd60c8f13a3f931df97d`

## Lifecycle and stale emission verification

### Interactive DOM UI lifecycle

The browser harness evaluated the interactive Diagnostics playground mounted in the DOM:

- **Initial state**: `Scope disposed`, action buttons disabled, event list empty.
- **Scope creation**: clicking `create-scope` updates status to `Scope active`, initializes `count = 0` and `doubled = 0`.
- **Updates**: clicking `increment` updates `count = 1`; clicking `batch` commits Batch +2 to `count = 3` and `doubled = 6`, updating the live event timeline.
- **Disposal**: clicking `dispose-scope` transitions status to `Scope disposed` and disables mutation buttons.
- **Stale action cutoff**: subsequent click attempts on disabled increment/batch actions cause zero state changes, zero subscriber emissions, and zero new diagnostics trace events.
- **Recreation**: creating a fresh demo Scope reinitializes the counter from `0` cleanly.

### Programmatic Scope and resource ownership

Direct browser runtime evaluation of the packed `@vii-labs/core` primitives verified:

- **Resource cleanup**: custom `ViiResource` (`dispose()` method), interval timer, and DOM event listener attached to the Scope were all invoked and cleaned up exactly once on `scope.dispose()`.
- **Stale emission cutoff**: mutating a source `State` after its owning `Scope` was disposed produced zero notifications to the disposed `Computed` subscriber.
- **Disposed state rejection**: evaluating a disposed `Computed` threw `Computed is disposed`.
- **Idempotency**: calling `scope.dispose()` a second time produced zero extra cleanup calls and threw no errors.
- **1,000 programmatic cycles**: 1,000 repeated create, attach resource, subscribe, mutate, dispose, and stale-write check cycles passed with zero errors.

## Memory and heap retention observations

Metrics were collected via CDP `Performance.getMetrics` and `HeapProfiler.collectGarbage`:

- **Baseline**: measured after page load, initial DOM render, and explicit baseline GC.
- **Post-disposal (without GC)**: reflects temporary V8 object churn during active rendering.
- **Post-disposal (with GC)**: reflects retained references after `HeapProfiler.collectGarbage`.

### Measurement summary

| Run | Iterations | Elapsed | Baseline Heap | Post-GC Heap | Heap Delta | Baseline Nodes | Post-GC Nodes | Node Delta | Listeners | Console Errors |
| --- | ---------: | ------: | ------------: | -----------: | ---------: | -------------: | ------------: | ---------: | --------: | -------------: |
| 1   | 1          | 23.0 ms | 760.8 kB      | 795.4 kB     | +34.6 kB   | 860            | 1,308         | +448       | 2         | 0              |
| 2   | 100        | 3.37 s  | 795.4 kB      | 960.3 kB     | +164.8 kB  | 1,308          | 1,740         | +432       | 2         | 0              |
| 3   | 1,000      | 26.93 s | 960.3 kB      | 1,014.2 kB   | +53.9 kB   | 1,740          | 1,740         | 0          | 2         | 0              |

### Observations

- **Event listeners**: `JSEventListeners` remained constant at 2 across all 1,000 cycles (zero listener accumulation).
- **DOM nodes**: after initial UI warm-up, `Nodes` delta between baseline and post-disposal + GC for the 1,000-cycle run was **0** (zero DOM node accumulation).
- **Heap boundedness**: `JSHeapUsedSize` grew by only +53.9 kB over 1,000 full interactive cycles after GC, confirming that retained heap does not scale monotonically with iteration count.
- **Console safety**: zero console errors or uncaught exceptions occurred during all runs.

The raw JSON report is committed at `benchmarks/results/vanilla-browser-retention.json`.

## Privacy and data handling

The retention harness captures only structural metrics:

- byte sizes, iteration counts, and elapsed milliseconds;
- DOM node, document, and event listener counts;
- boolean lifecycle states and console error counts.

No user content, raw state values, credentials, tokens, cookies, external network traffic, or
heap snapshot payloads are collected or stored.

## Limitations and non-claims

- **No universal leak-free claim**: these measurements demonstrate retention behavior for the tested
  Vanilla reference consumer in Google Chrome 151; they do not constitute a universal mathematical
  proof that no leaks exist under unreviewed consumer architectures or host environments.
- **No release budget**: this document records a local Phase 4 empirical baseline; it does not define
  a mandatory release threshold or external production guarantee.
- **No external alpha**: internal reference consumer validation does not promote Phase 4 to an external
  alpha or support commitment.
- **No security certification**: this measurement validates memory lifecycle and post-disposal cleanup;
  it is not a penetration test, CSP/Trusted Types deployment audit, or compliance certification.
