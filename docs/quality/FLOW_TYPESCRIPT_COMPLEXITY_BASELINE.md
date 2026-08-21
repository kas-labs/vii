# Vii Flow TypeScript and Complexity Baseline

Status: Research evidence, bounded fixture only

## Scope

This record measures the TypeScript surface of the same small/deep synchronous pipeline shape for
three research baselines:

- direct callback operators;
- RxJS `7.8.2` with an explicit `Subject` source;
- the throwaway Flow prototype.

The fixture source files are under `research/flow/typecheck-fixtures/`. They are type-check inputs,
not runtime consumers or public API examples. The prototype remains throwaway research code.

## Reproduction

Commands run on 2026-08-21:

```text
pnpm exec vitest run research/flow/flow-research.test.ts research/flow/flow-real-clock.test.ts research/flow/flow-platform-robustness.test.ts research/flow/flow-comparison.test.ts
pnpm exec tsc --noEmit -p research/flow/tsconfig.json
pnpm exec node research/flow/flow-typecheck-comparison.mjs
```

The correctness preflight passed with 4 files and 18 tests. The strict research TypeScript check
passed. The comparator completed 9 successful compiler runs: non-incremental cold, incremental
first run, and incremental second run for each baseline.

Environment: Node `v22.17.0`, pnpm `10.12.4`, TypeScript `6.0.2`, RxJS `7.8.2`.

The comparator invokes `tsc --noEmit --extendedDiagnostics --pretty false`. Cold runs have no
incremental build-info file. Incremental first and second runs use the same temporary build-info
file; all temporary files are removed after the report. The command emits JSON containing each
run's raw compiler diagnostics.

## Type surface

| Fixture      | Own source lines | Program files | TypeScript lines | Definition lines |
| ------------ | ---------------: | ------------: | ---------------: | ---------------: |
| direct.ts    |               74 |            64 |               75 |                0 |
| rxjs.ts      |               33 |           253 |               34 |            7,351 |
| prototype.ts |               32 |            75 |            1,609 |                0 |

The program surface is part of the result: RxJS includes its installed declaration graph, while the
prototype follows its import into the throwaway prototype and Core source. Removing those
transitive surfaces would answer a different question and is not done here.

## Compiler diagnostics

Values below are TypeScript's own `--extendedDiagnostics` output. `Total` is compiler-reported total
time, not a universal wall-clock budget. A dash means that the incremental second run did not report
a check phase after reusing the build graph.

| Fixture      | Mode               |  Memory | Types | Instantiations | Check | Total |
| ------------ | ------------------ | ------: | ----: | -------------: | ----: | ----: |
| direct.ts    | cold               | 62,597K |   194 |            156 | 0.03s | 0.42s |
| direct.ts    | incremental first  | 64,152K |   194 |            156 | 0.03s | 0.28s |
| direct.ts    | incremental second | 60,347K |    85 |              0 |     — | 0.19s |
| rxjs.ts      | cold               | 71,316K |   878 |          2,008 | 0.04s | 0.54s |
| rxjs.ts      | incremental first  | 75,762K |   878 |          2,008 | 0.03s | 0.28s |
| rxjs.ts      | incremental second | 67,686K |    85 |              0 |     — | 0.21s |
| prototype.ts | cold               | 73,400K | 1,921 |          1,593 | 0.10s | 0.29s |
| prototype.ts | incremental first  | 72,577K | 1,921 |          1,593 | 0.10s | 0.30s |
| prototype.ts | incremental second | 63,619K |    85 |              0 |     — | 0.22s |

## Complexity interpretation

This fixture shows three different type-surface costs rather than one winner:

- direct callbacks have the smallest transitive program surface in this setup;
- RxJS has the largest declaration/file surface because the comparison includes its actual operator
  and Observable declarations;
- the prototype has a larger TypeScript graph than its own 32 lines because importing the prototype
  also type-checks its research implementation and Core dependency.

These observations are specific to the exact fixture, versions, compiler flags, and repository
dependency graph. They are not claims about application-wide TypeScript performance or API quality.

## Deferred work and limitations

- No bundle/tree-shaking, allocation, temporal, async-switching, or real-consumer measurement is
  included.
- One fixture file per baseline cannot represent all generic chains, unions, State bridges, or
  application project graphs.
- The optional memory numbers are compiler process readings, not retained-memory evidence.
- Repeated compiler samples and incremental edits are required before any budget is considered.
- Flow remains Research-only; this record does not authorize a package, public API, or support tier.
