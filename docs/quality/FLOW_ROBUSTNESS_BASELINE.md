# Vii Flow Malicious and Cancellation-Race Robustness Baseline

Status: Research evidence, bounded correctness fixture only

## Scope

This slice adds deterministic robustness coverage for the existing throwaway Flow platform
adapters. It does not change Vii Core, a public API, package boundaries, or the native platform
contracts.

The fixtures cover:

- synchronous AsyncIterable producer failure through the explicit error channel;
- fast/unbounded AsyncIterable production stopping at the semantic disposal boundary;
- idempotent AsyncIterable `return()` initiation during a pending `next()` race;
- ReadableStream producer failure through the explicit error channel;
- ReadableStream cancellation while a pending `read()` is being released.

Test-local values and error objects are used only for assertions. No raw payloads are emitted in a
diagnostic report, and no network, browser automation, worker, or socket integration is claimed.

## Reproduction

Commands run on 2026-08-21:

```text
pnpm exec vitest run research/flow/flow-robustness-races.test.ts --reporter=verbose --silent=false
pnpm exec vitest run research/flow/flow-platform-robustness.test.ts research/flow/flow-robustness-races.test.ts --reporter=verbose --silent=false
pnpm exec tsc --noEmit -p research/flow/tsconfig.json
```

The new file passed: one file and five tests passed. The combined robustness run passed: two files
and ten tests passed. Environment: Node `v22.17.0`, pnpm `10.12.4`, Vitest `4.1.10`.

## Evidence

All five new fixtures passed. The structural outcomes were:

| Fixture                           | Result                                                  |
| --------------------------------- | ------------------------------------------------------- |
| AsyncIterable producer failure    | one producer failure reached the explicit error channel |
| Fast AsyncIterable after disposal | one `next()` initiation, zero downstream values         |
| AsyncIterable pending-next race   | one `return()` initiation, zero downstream values       |
| ReadableStream producer failure   | one producer failure reached the explicit error channel |
| ReadableStream pending-read race  | one native cancel initiation, zero downstream values    |

The existing platform robustness fixtures also remain green for the 1,000-event debounce storm,
deferred AsyncIterable return cleanup, deferred ReadableStream cancel cleanup, and cancellation
rejection isolation. Cancellation rejection is not converted into a Flow source error and is not
claimed to be asynchronously complete before synchronous disposal returns.

## Interpretation and limits

The prototype currently demonstrates bounded semantic cutoff for fast AsyncIterable production,
idempotent cleanup initiation, and suppression of late values in both native stream adapters. It
also preserves the explicit distinction between producer failure and cancellation/disposal.

This is correctness evidence, not a throughput, memory, backpressure, browser compatibility, or
security certification. Malformed iterator result shapes, hostile subscriber callbacks, broader
unbounded ReadableStream production, asynchronous cancellation-rejection surfacing, and real
platform consumers remain separate research work. Flow remains Research-only.
