# Vii Performance Budgets

## Principle

Performance claims must be measured, reproducible, and scoped. Vii does not use the words fast, lightweight, low-memory, or zero-cost without a published benchmark context.

Performance never overrides correctness, security, accessibility, lifecycle safety, or understandable behavior.

## Budget categories

### Transfer budget

Tracks package and application payloads after minification and compression.

Each package should publish:

- entry-point size;
- dependency contribution;
- side-effect status;
- representative consumer bundle impact;
- optional feature boundaries;
- development code removed from production.

Initial targets are provisional and must be validated by prototypes.

Core must remain independently usable without pulling framework adapters, Devtools, UI, Query, Server, native compiler, Build System, or application framework code.

A future native application build should also track:

- route-level JavaScript;
- hydration runtime;
- component runtime;
- CSS;
- preload and manifest overhead;
- server-only code accidentally entering client output.

### State execution budget

Measures representative operations:

- State creation;
- reads and writes;
- subscription registration and disposal;
- batching;
- computed recomputation;
- invalidation propagation;
- Scope creation and disposal;
- diagnostics event production.

Benchmarks compare behaviorally equivalent operations and disclose methodology.

### Rendering execution budget

A future native renderer should measure:

- component initialization;
- text and attribute updates;
- list insertion, removal, and movement;
- conditional regions;
- event binding;
- mount and unmount;
- update fan-out;
- hydration;
- SSR rendering;
- streaming regions.

The intended fine-grained model should be evaluated by affected work, not only operations per second in an isolated microbenchmark.

### Memory budget

Tracks:

- per-State-node overhead;
- per-subscription overhead;
- reactive graph nodes;
- retained diagnostic events;
- cache and Scope ownership;
- component and renderer allocations;
- route and request resources;
- cleanup after disposal;
- build graph and compiler peak memory where applicable.

A benchmark includes steady state and post-disposal measurements.

Low allocation count is not sufficient if objects remain retained after ownership ends.

### Type-check budget

Public TypeScript APIs must not create disproportionate compiler cost.

Measurements include:

- declaration generation;
- cold type-check time;
- incremental type-check time;
- editor responsiveness in representative projects;
- complex inferred contract usage;
- generated component and route declarations;
- schema and server-function types.

APIs that require excessive recursive conditional types or produce unstable declarations must be simplified.

### Compiler budget

A future `.vii` compiler should measure:

- cold parse and transform time;
- incremental transform time;
- source-map generation;
- template analysis;
- style processing;
- accessibility and security diagnostics;
- Component IR memory;
- invalidation breadth;
- malformed-input behavior.

SFC, split, and TSX profiles should be compared using equivalent components.

### Development server budget

Track:

- cold startup;
- dependency preparation;
- first route or page response;
- file-change detection;
- transform latency;
- HMR delivery;
- SSR restart or invalidation;
- memory after repeated edits;
- large-workspace behavior.

A fast startup that shifts excessive delay into the first user interaction must be reported honestly.

### Production build budget

Track:

- clean build time;
- incremental or watch rebuild;
- peak memory;
- CPU utilization;
- cache hit and miss behavior;
- client and server graph generation;
- route splitting;
- minification;
- source maps;
- manifest generation;
- packed output size.

The first research baseline uses Vite and Rolldown. Optional Bun and Rspack adapters require equivalent fixtures before comparisons.

### SSR budget

Track:

- request startup;
- route matching;
- loader time separately from rendering;
- render-to-string or stream start;
- time to first byte;
- stream completion;
- serialization;
- hydration payload size;
- request cleanup;
- concurrent-request memory.

Data source time must not be misrepresented as framework rendering cost.

### Diagnostics budget

Diagnostics modes are measured separately:

- `off`;
- `development`;
- `production-safe`.

When diagnostics are off, overhead should be minimized and inactive code removable where practical.

Development diagnostics may add cost, but limits and buffers prevent unbounded memory growth.

Security checks that protect runtime trust boundaries must not be removed merely to improve a benchmark.

### Security overhead budget

Measure representative cost of:

- context-safe rendering;
- sanitizer use only where raw HTML is explicitly enabled;
- schema validation;
- safe serialization;
- URL policy checks;
- security diagnostics;
- integrity verification;
- CSP nonce generation where relevant.

Security budgets inform optimization. They do not justify disabling required controls.

## Build-engine comparison rules

Comparisons between Vite/Rolldown, Bun, Rspack, Webpack, or another engine require:

- equivalent application behavior;
- equivalent production optimization;
- equivalent source maps;
- equivalent CSS and asset handling;
- equivalent client/server graphs;
- equivalent security checks;
- equivalent cache state;
- disclosed engine and runtime versions.

A partial or unsupported feature set cannot be presented as a faster equivalent build.

## Regression policy

A performance regression requires:

1. a reproducible benchmark change;
2. an explanation of the product benefit;
3. explicit review;
4. updated baseline or remediation plan;
5. confirmation that the change does not hide a lifecycle or security defect.

No single benchmark determines architecture.

## Benchmark repository rules

Benchmarks record:

- Vii commit or package version;
- runtime and version;
- build engine and version;
- operating system;
- hardware;
- command and configuration;
- sample size;
- warm-up policy;
- cache state;
- raw results;
- fixture source;
- known limitations.

## Public reporting

Public comparisons avoid misleading charts and cherry-picked scenarios.

Results include limitations and do not imply that synthetic speed guarantees application-level performance.

Framework comparisons must distinguish different rendering, hydration, caching, compiler, and compatibility semantics.

## Core Alpha Numeric Release Budgets

Based on reproducible baselines recorded in `CORE_PERFORMANCE_BASELINE.md`,
`VANILLA_BROWSER_RETENTION_BASELINE.md`, and `VANILLA_BROWSER_CSP_BASELINE.md`, the following numeric
release budgets are binding for `@vii-labs/core` Alpha releases:

### 1. Transfer and bundle size budget

| Surface | Raw Limit | Gzip Limit | Baseline Reference |
| --- | ---: | ---: | --- |
| `@vii-labs/core` ESM artifact | $\le$ 15.0 kB | $\le$ 5.0 kB | 11.8 kB raw / 4.4 kB gzip |
| `@vii-labs/react` adapter | $\le$ 3.0 kB | $\le$ 1.2 kB | 1.2 kB raw / 0.6 kB gzip |
| `@vii-labs/angular` adapter | $\le$ 4.0 kB | $\le$ 1.5 kB | 1.8 kB raw / 0.8 kB gzip |
| `@vii-labs/vue` adapter | $\le$ 3.0 kB | $\le$ 1.2 kB | 1.1 kB raw / 0.6 kB gzip |
| Vanilla Reference App output | $\le$ 16.0 kB | $\le$ 6.0 kB | 11.9 kB raw / 4.5 kB gzip |

### 2. Memory lifecycle and retention budget

Measured across 1,000 deterministic Scope creation, exercise, and disposal cycles in real browser execution:

| Metric | Release Threshold | Baseline Reference |
| --- | ---: | --- |
| Retained Event Listeners delta | **0** | 0 listener accumulation |
| Retained DOM Nodes delta (post-GC) | **0** | 0 node accumulation |
| Post-GC Heapcompaction delta (1,000 cycles) | $\le$ 100.0 kB | +53.9 kB |
| Console errors / uncaught exceptions | **0** | 0 errors |

### 3. State execution and throughput budget

Measured via `pnpm benchmark:core` under Node 22+ V8 baseline:

| Operation | Minimum Throughput | Baseline Reference |
| --- | ---: | --- |
| State reads / writes | $\ge$ 8,000,000 ops/s | > 10,000,000 ops/s |
| Computed recomputation | $\ge$ 4,000,000 ops/s | > 5,000,000 ops/s |
| Batch update fan-out (100 dependents) | $\ge$ 800,000 ops/s | > 1,000,000 ops/s |
| Scope create + dispose cycle | $\ge$ 1,500,000 ops/s | > 2,000,000 ops/s |
| Diagnostics `off` vs `development` overhead | $\le$ 20% | < 15% |

### 4. Deployment security and CSP gates

| Gate | Requirement | Status |
| --- | --- | --- |
| Strict CSP compliance | 0 `securitypolicyviolation` events under `default-src 'none'`, `script-src 'self'` | **Verified** |
| Trusted Types compliance | 0 sink violations under `require-trusted-types-for 'script'` | **Verified** |
| Code evaluation sinks | Zero `eval()`, `new Function()`, or dynamic code injection in Core runtime | **Verified** |

### 5. Regression verification protocol

Any proposed change exceeding a release budget requires:

1. A reproducible benchmark reproduction in `benchmarks/results/`.
2. Documented architectural justification in an RFC or ADR.
3. Verification that no memory, lifecycle, or CSP violation regressions are introduced.
