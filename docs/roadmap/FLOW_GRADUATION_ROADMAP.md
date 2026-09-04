# Vii Flow Post-Research Graduation Roadmap

Maturity: Research
Execution: Deferred

This document defines the exact evidence sequence that may follow the completed Vii Flow research integration from PRs #94 through #108. It is a planning and stop/go contract only.

It does **not** start a production Flow implementation, create `@vii-labs/flow`, freeze a public API, change Flow maturity, add dependencies, or change the current implementation priority.

The active delivery sequence remains authoritative. In particular, the ongoing Production Form Phase 1 work is not blocked, reordered, or made dependent on Flow by this roadmap.

## 1. Why this roadmap exists

The existing Flow research already established a useful semantic boundary:

```text
State     = current retained value
Computed  = derived current value
Task      = one async execution lifecycle
Flow      = zero or more values/events over time
```

The research also established the intended product direction:

```text
signal-like simplicity
+ temporal composition
+ Scope ownership
+ AbortSignal cancellation
+ AsyncIterable / ReadableStream interoperability
+ value-safe Diagnostics
```

However, research evidence is not the same as justification for a maintained production stream library. The remaining question is deliberately narrower:

> Do at least two real Vii consumers demonstrate enough repeated temporal/event orchestration pain that a small first-party Flow is materially better than direct platform primitives or RxJS plus a thin Vii adapter?

The answer may still be **no**. Direct platform code, an RxJS adapter, reduced scope, or stopping are valid graduation outcomes.

## 2. Existing evidence inventory

The following evidence is already present and must not be repeated merely to create more work:

- Flow architecture, strategy, semantic boundaries, anti-goals, and candidate API direction;
- deterministic synchronous FIFO and re-entrant behavior fixtures;
- explicit factory/cold versus explicit hot source semantics;
- debounce and switch-latest cancellation with `Promise` + `AbortSignal`;
- real-clock validation for temporal behavior and disposal;
- producer error, completion, cancellation, disposal, and subscriber-failure separation;
- AsyncIterable `return()` and ReadableStream `cancel()` lifecycle fixtures;
- cancellation-rejection observation without converting cleanup failure into the Flow source error channel;
- per-subscription ownership and Scope-owned disposal evidence;
- explicit hot-sharing, late-subscriber no-replay, and ref-count reset research;
- direct callbacks versus RxJS versus throwaway Flow synchronous comparison;
- direct callbacks versus RxJS versus throwaway Flow temporal/async comparison;
- TypeScript complexity comparison;
- value-safe structural Diagnostics research;
- the later audit regression that exposed a synchronous-inner-completion edge case in `switchLatest` and was fixed in PR #155.

The existing evidence is intentionally mixed. Some fixtures show ergonomic promise, while the bounded synchronous comparison did not establish a performance advantage for the throwaway prototype. This is a reason to preserve the build-vs-integrate gate, not a reason to optimize a prototype until it wins a benchmark.

## 3. Remaining evidence gaps

Flow must remain Research until the following gaps are closed or explicitly judged unnecessary by a stop decision:

1. Two independent real consumers with genuine temporal/event orchestration needs.
2. Real consumer comparison against direct platform primitives and RxJS plus a thin Vii integration.
3. Explicit closure of the remaining source, ownership, completion, error, and cleanup-rejection semantics.
4. Adversarial coverage for malformed iterator/stream behavior and hostile subscriber behavior.
5. Reproducible allocation, retained-memory, bundle/tree-shaking, runtime, and TypeScript cost evidence on a production-shaped prototype only if real consumers justify continuing.
6. A final maintenance-aware Build vs Integrate decision.
7. An accepted RFC before any first-party public Flow contract is implemented.

## 4. Non-interference rules

These rules are binding for every Flow graduation slice:

- Flow remains optional. Core, Form, Query, HTTP, Router, Storage, and framework adapters do not gain a Flow dependency merely because Flow exists.
- This roadmap does not modify `docs/roadmap/IMPLEMENTATION_ROADMAP.md` and does not insert Flow into the active implementation sequence.
- Current higher-priority delivery work, including Production Form Phase 1, wins scheduling conflicts.
- No Flow graduation slice begins automatically after the previous slice. Every slice requires separate maintainer authorization.
- Every slice begins from the latest accepted `main`, uses a focused branch, opens a Draft PR, and hard-stops at its exit gate.
- Research code remains throwaway until a Build decision and accepted public-contract RFC exist.
- No benchmark may claim global superiority over RxJS, native streams, or direct callbacks.
- No real consumer may be invented solely to satisfy the two-consumer gate.
- No replay, current-value retention, hidden scheduler, hidden retry, cache, or global event-bus semantics may enter Flow by convenience.

## 5. Graduation sequence

### FG0 — Post-Research Inventory & Graduation Contract

Status: This documentation slice.

Purpose:

- reconcile PR #94–#108 and later Flow-related audit evidence;
- separate completed research from real remaining gaps;
- freeze the non-interference and stop/go process;
- avoid re-running research that already exists.

Deliverables:

- this roadmap;
- documentation index reference;
- explicit confirmation that the existing durable product state remains unchanged: Flow is still Research, no package exists, and no implementation priority is changed;
- explicit statement that Flow execution remains deferred.

Exit gate:

- documentation is internally consistent;
- no runtime, package, dependency, public API, maturity, or active-roadmap change;
- repository review confirms the current Form delivery sequence is untouched.

Hard stop:

- FG1 is not authorized by merging FG0.

### FG1 — Real Consumer A: UI Temporal Orchestration

Status: Future, separately authorized research.

Use a real Vii-owned application feature where current-value State crosses into temporal orchestration. A typeahead/autocomplete/search workflow is a good candidate only if a real consumer actually needs it.

The same behavior must be implemented and compared through:

1. `State` + `Promise` + `AbortController` + direct timers/callbacks;
2. RxJS with the smallest Vii Scope/State interoperability layer needed by the consumer;
3. the existing throwaway Flow direction.

Required evidence:

- debounce or equivalent temporal coordination;
- stale-work cancellation;
- Scope-owned cleanup;
- State input/output bridge where useful;
- application-level error ownership;
- repeated mount/dispose lifecycle;
- implementation complexity explained by concepts and lifecycle obligations, not only lines of code;
- consumer-level bundle and type-check delta when practical.

Decision at exit:

- `continue`: Flow materially removes repeated orchestration/lifecycle complexity without hiding semantics;
- `adapt`: RxJS plus a small Vii adapter is already the better boundary;
- `direct`: platform primitives are sufficiently clear;
- `stop`: the problem does not justify more Flow research.

Hard stop:

- no production package or public Flow API.

### FG2 — Real Consumer B: Independent Event / Platform Stream Workload

Status: Future, conditional on FG1 showing enough value to continue.

Use an independent workload, not another typeahead variant. Suitable candidates may include a real worker message channel, AI token/event stream, SSE or ReadableStream consumer, WebSocket/event source, upload progress stream, or another application feature that genuinely exists at the time.

The consumer must preserve its native platform semantics. In particular, AsyncIterable/ReadableStream demand and cancellation behavior must remain visible rather than being advertised as universal Flow backpressure.

Required evidence:

- at least one real platform/event source;
- early consumer disposal and upstream cleanup;
- source error versus cancellation versus cleanup failure distinction;
- late subscriber behavior where the source is shared;
- no implicit replay or retained current value;
- direct platform versus RxJS-adapter versus throwaway-Flow comparison;
- repeated lifecycle/retention checks.

Exit gate:

- two independent consumers now exist;
- the same Vii-specific lifecycle/composition advantages appear in both;
- otherwise select `adapt`, `direct`, or `stop` and do not continue toward a first-party runtime.

Hard stop:

- no production package or public API.

### FG3 — Semantic Closure & Adversarial Contract

Status: Future, conditional on successful FG1 + FG2 evidence.

Close the semantic questions that are acceptable in throwaway research but unacceptable in a maintained runtime.

Required decisions and fixtures:

- factory/cold subscription identity remains explicit;
- hot event/channel ownership, if still justified, remains explicit and non-retaining;
- no implicit replay or BehaviorSubject-equivalent current value;
- exact completed-inner ownership rule for switch-latest work;
- exact producer/operator error termination and recovery rule;
- subscriber callback failures remain caller/subscriber failures rather than source failures;
- cancellation remains distinct from failure;
- native async cleanup rejection has an explicit observation boundary without making synchronous `dispose(): void` dishonest;
- synchronous sources propagate synchronously by default;
- no scheduler abstraction unless a real consumer from FG1/FG2 proved the requirement;
- sharing/multicast support is excluded unless a real consumer proved that explicit source sharing is insufficient.

Adversarial fixtures should include:

- malformed iterator result objects;
- throwing `next`, `return`, or stream cancellation behavior;
- hostile subscriber callbacks;
- recursive/re-entrant emission;
- rapid timer storms;
- rapid cancellation/supersession races;
- abandoned consumers and repeated subscribe/dispose cycles;
- high event rates without unbounded implicit buffering.

Exit gate:

- semantics can be described with a small mental model and tested without hidden queues, retention, or ownership rules.

Hard stop:

- still no public package.

### FG4 — Production-Shaped Evidence Harness

Status: Future, conditional on FG3.

Only now create a production-shaped but still private/throwaway candidate for measurement. Do not optimize the earlier research helper into production by incremental accident.

Required comparison groups:

- direct callbacks/EventTarget where semantically equivalent;
- RxJS at the then-current pinned version;
- native AsyncIterable/ReadableStream where appropriate;
- the production-shaped Flow candidate.

Required evidence:

- subscription setup and disposal;
- synchronous pipeline throughput and latency;
- temporal operator correctness and timer cleanup;
- switch-latest cancellation latency and stale-result safety;
- allocations per representative emission/pipeline where measurable;
- retained memory after repeated lifecycle cycles;
- State bridge overhead;
- AsyncIterable and ReadableStream adapter overhead;
- minimal and representative bundle sizes, minified/gzip/brotli;
- tree-shaking of unused operators;
- TypeScript cold and representative incremental cost;
- Diagnostics-off and Diagnostics-enabled overhead.

Benchmark rules:

- correctness assertions run before timing;
- compare equivalent semantics only;
- publish exact environment, versions, warmup, repetitions, and raw results;
- negative results are valid and may terminate first-party Flow work.

Exit gate:

- evidence is reproducible and no important lifecycle/performance claim depends on the old throwaway prototype.

### FG5 — Build vs Integrate Graduation Gate

Status: Future, conditional on FG4.

This is the decisive gate. It must compare the complete cost of three realistic options:

#### Outcome A — Direct / Stop

Use State, Promise, AbortController, AsyncIterable, ReadableStream, EventTarget, and focused handwritten helpers. Maintain Flow only as architectural guidance/recipes if useful.

Choose this when the first-party abstraction does not reduce enough real complexity.

#### Outcome B — RxJS Adapter

Do not build a Flow runtime. Provide only the smallest optional Vii interoperability needed for Scope ownership, State bridges, or Diagnostics around RxJS.

Choose this when RxJS already solves the real consumer problems more safely or cheaply than Vii ownership.

#### Outcome C — Build First-Party Flow

Authorize an RFC for a small first-party runtime only when both consumers and production-shaped evidence demonstrate material Vii-specific value.

The decision matrix must include:

- consumer ergonomics and conceptual load;
- cancellation and lifecycle clarity;
- semantic correctness burden;
- platform interoperability;
- RxJS ecosystem leverage;
- bundle/tree-shaking;
- runtime and allocation evidence;
- retained memory;
- TypeScript compiler/IDE cost;
- Diagnostics integration;
- maintenance and security burden;
- likely five-year API/compatibility cost;
- migration/escape hatch to native streams or RxJS.

Exit gate:

- record one explicit outcome: `Direct/Stop`, `RxJS Adapter`, or `Build`.

Hard stop:

- only `Build` authorizes FG6.

### FG6 — Public Contract RFC

Status: Conditional, only after an FG5 `Build` verdict.

Public architecture changes require an RFC before implementation.

The RFC must freeze the smallest sufficient contract, including:

- package boundary, likely `@vii-labs/flow` only if the Build verdict still supports it;
- Flow/source/subscription/disposal types;
- Scope ownership;
- AbortSignal integration;
- exact error/cancellation/completion model;
- State bridge;
- AsyncIterable and ReadableStream bridges;
- value-safe Diagnostics;
- the minimum operator surface proven by FG1/FG2 consumers;
- fluent versus functional composition decision based on evidence rather than aesthetic preference.

The RFC must explicitly reject, unless independently re-authorized:

- RxJS catalog parity;
- Subject-family cloning;
- implicit replay/current-value retention;
- general scheduler hierarchy;
- hidden retry/cache semantics;
- global event bus;
- Query/Task/Web Streams replacement;
- mandatory Flow dependencies in unrelated Vii modules.

Exit gate:

- accepted RFC plus explicit maintainer authorization for a production phase.

### FG7 — Production Phase 1 Authorization

Status: Conditional, not authorized by this roadmap.

If and only if FG6 is accepted, create a separate production implementation roadmap. Do not implement production Flow directly from this document.

A likely bounded production shape to evaluate at that time is:

- **FP1a** — package skeleton, governance, package/export boundaries;
- **FP1b** — source, Flow, subscription, disposal, and ownership core;
- **FP1c** — synchronous stateless operators (`map`, `filter`, `tap`, `distinct`, `take` as proven);
- **FP1d** — temporal operators actually proven by consumers (`debounce`, `throttle`, `timeout` as justified);
- **FP1e** — async flattening/switch-latest and AbortSignal ownership;
- **FP1f** — State, AsyncIterable, ReadableStream and required platform adapters;
- **FP1g** — Scope, Diagnostics, error/cancellation boundaries and robustness regressions;
- **FP1h** — browser/runtime, bundle, memory, TypeScript, package and clean-consumer acceptance gates;
- **FP1i** — experimental graduation, documentation, changeset and public API review.

This outline is not a commitment. FG7 exists so a future Build decision does not silently turn research code into a production package.

## 6. Decision table

| Gate | Required before advancing | Valid outcomes |
| --- | --- | --- |
| FG0 | Research inventory + non-interference contract | Merge docs / revise docs |
| FG1 | Real UI temporal consumer comparison | Continue / Adapt / Direct / Stop |
| FG2 | Independent real event/platform-stream consumer | Continue / Adapt / Direct / Stop |
| FG3 | Semantic and adversarial closure | Continue / Reduce / Stop |
| FG4 | Reproducible production-shaped evidence | Continue / Adapt / Direct / Stop |
| FG5 | Maintenance-aware Build vs Integrate decision | Direct/Stop / RxJS Adapter / Build |
| FG6 | Accepted public contract RFC | Accept / Revise / Stop |
| FG7 | Explicit production-phase authorization | Create separate production roadmap / Stop |

## 7. Recommended present-day state

At the time this roadmap is introduced:

- keep Flow at **Research**;
- keep Flow execution **Deferred** until a real consumer and separate maintainer authorization justify FG1;
- do not create `packages/flow`;
- do not create a public Flow export or package manifest;
- do not add Flow dependencies to Core, Form, Query, HTTP, Router, Storage, or framework adapters;
- do not interrupt the active Production Form Phase 1 sequence;
- preserve the existing research fixtures as evidence, not production source;
- begin FG1 only when a real Vii consumer naturally presents the required temporal orchestration problem and the maintainer explicitly authorizes that slice.

This is intentionally conservative. The desired end state is not “Vii owns its own RxJS.” The desired end state is the smallest maintainable solution that gives Vii applications clear temporal composition without weakening platform interoperability or the simplicity of the existing reactive core.
