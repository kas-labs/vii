# Vii Performance Budgets

## Principle

Performance claims must be measured, reproducible, and scoped. Vii does not use the words fast, lightweight, or zero-cost without a published benchmark context.

## Budget categories

### Transfer budget

Tracks package payloads after minification and compression.

Each package must publish:

- entry-point size
- dependency contribution
- side-effect status
- representative consumer bundle impact

Initial targets are provisional and must be validated by prototypes. The goal is to keep Core independently usable without pulling framework adapters, Devtools, UI, Query, or server code.

### Execution budget

Measures representative operations:

- store creation
- reads and writes
- subscription registration and disposal
- batching
- derived recomputation
- invalidation propagation
- scope creation and disposal
- diagnostics event production

Benchmarks must compare behaviorally equivalent operations and disclose methodology.

### Memory budget

Tracks:

- per-store overhead
- per-subscription overhead
- reactive graph nodes
- retained diagnostic events
- cache and scope ownership
- cleanup after disposal

A benchmark must include steady state and post-disposal measurements.

### Type-check budget

Public TypeScript APIs must not create disproportionate compiler cost. Measurements should include:

- declaration generation
- cold type-check time
- incremental type-check time
- editor responsiveness in representative projects
- complex inferred contract usage

APIs that require excessive recursive conditional types or produce unstable declarations must be simplified.

### Diagnostics budget

Diagnostics modes are measured separately:

- `off`
- `development`
- `production-safe`

When diagnostics are off, overhead should be minimized and inactive code should be removable where practical. Development diagnostics may add cost, but limits and buffers must prevent unbounded memory growth.

## Regression policy

A performance regression requires:

1. a reproducible benchmark change
2. an explanation of the product benefit
3. explicit review
4. updated baseline or remediation plan

No single benchmark determines architecture. Correctness, clarity, accessibility, security, and lifecycle safety remain mandatory.

## Benchmark repository rules

Benchmarks must record:

- Vii commit or package version
- runtime and version
- operating system
- hardware
- command and configuration
- sample size
- warm-up policy
- raw results

## Public reporting

Public comparisons must avoid misleading charts and cherry-picked scenarios. Results should include limitations and should not imply that synthetic speed guarantees application-level performance.

## Initial acceptance goals

Before State Alpha, the project should establish baseline suites for:

- store update throughput
- derived dependency chains
- batch fan-out
- subscription disposal
- scope cleanup
- diagnostics on/off comparison
- packed Core bundle impact
- TypeScript consumer fixture compile time

Numeric release gates will be adopted only after stable prototypes provide realistic baselines.
