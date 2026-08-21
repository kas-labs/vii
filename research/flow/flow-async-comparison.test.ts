import { Observable, Subject, VirtualTimeScheduler } from "rxjs";
import { debounceTime, switchMap } from "rxjs/operators";
import { describe, expect, test } from "vitest";
import { createDirectTypeahead } from "./direct-baseline.js";
import {
  createManualSource,
  debounce,
  flow,
  fromAbortablePromise,
  subscribeInScope,
  switchLatest,
} from "./flow-prototype.js";
import { createScope } from "../../packages/core/src/index.js";
import { FakeClock, flushMicrotasks } from "./test-support.js";

const DEBOUNCE_MS = 10;
const QUERY_COUNT = 32;
const LIFECYCLE_CYCLES = 1_000;
const WARMUP_SAMPLES = 3;
const MEASUREMENT_SAMPLES = 8;

interface SearchEntry {
  readonly query: string;
  settled: boolean;
  resolve: (value: readonly string[]) => void;
}

interface SearchStats {
  readonly search: (query: string, signal: AbortSignal) => Promise<readonly string[]>;
  readonly entries: SearchEntry[];
  starts: number;
  aborts: number;
}

interface ScenarioSnapshot {
  readonly starts: number;
  readonly aborts: number;
  readonly delivered: number;
  readonly staleDelivered: number;
  readonly pendingTimerPeak: number | null;
  readonly scopeDisposed: number;
}

interface ScenarioMeasurement {
  readonly elapsedMs: number;
  readonly result: ScenarioSnapshot;
}

interface Runner {
  readonly name: "direct" | "rxjs" | "prototype-functional" | "prototype-fluent";
  readonly runScenario: () => Promise<ScenarioSnapshot>;
  readonly runLifecycle: () => number;
}

interface RuntimeWithDiagnostics {
  readonly process?: { readonly version?: string };
}

function resolveSearches(search: SearchStats): void {
  for (const entry of search.entries) {
    if (!entry.settled) {
      entry.settled = true;
      entry.resolve([entry.query]);
    }
  }
}

function createTrackedSearch(): SearchStats {
  const entries: SearchEntry[] = [];
  const searchStats: SearchStats = {
    entries,
    starts: 0,
    aborts: 0,
    search: (query, signal) => {
      const entry: SearchEntry = {
        query,
        settled: false,
        resolve: () => undefined,
      };
      entries.push(entry);
      searchStats.starts += 1;
      signal.addEventListener(
        "abort",
        () => {
          searchStats.aborts += 1;
        },
        { once: true },
      );
      return new Promise((resolve) => {
        entry.resolve = resolve;
      });
    },
  };
  return searchStats;
}

function queryName(index: number): string {
  return `query-${index}`;
}

function createSnapshot(
  search: SearchStats,
  delivered: number,
  staleDelivered: number,
  pendingTimerPeak: number | null,
  scopeDisposed: number,
): ScenarioSnapshot {
  return {
    starts: search.starts,
    aborts: search.aborts,
    delivered,
    staleDelivered,
    pendingTimerPeak,
    scopeDisposed,
  };
}

async function runDirectScenario(): Promise<ScenarioSnapshot> {
  const clock = new FakeClock();
  const search = createTrackedSearch();
  const results: string[] = [];
  let latestQuery = "";
  let pendingTimerPeak = 0;
  const typeahead = createDirectTypeahead(
    clock,
    search.search,
    (result) => results.push(result[0]!),
    () => undefined,
  );

  for (let index = 0; index < QUERY_COUNT; index += 1) {
    latestQuery = queryName(index);
    typeahead.query(latestQuery);
    pendingTimerPeak = Math.max(pendingTimerPeak, clock.pendingCount);
    clock.advanceBy(DEBOUNCE_MS);
  }
  resolveSearches(search);
  await flushMicrotasks();
  typeahead.dispose();

  const disposalClock = new FakeClock();
  const disposalSearch = createTrackedSearch();
  const disposalTypeahead = createDirectTypeahead(
    disposalClock,
    disposalSearch.search,
    () => undefined,
    () => undefined,
  );
  disposalTypeahead.query("disposed-query");
  disposalClock.advanceBy(DEBOUNCE_MS);
  disposalTypeahead.dispose();
  resolveSearches(disposalSearch);
  await flushMicrotasks();

  return createSnapshot(
    {
      ...search,
      starts: search.starts + disposalSearch.starts,
      aborts: search.aborts + disposalSearch.aborts,
    },
    results.length,
    results.filter((result) => result !== latestQuery).length,
    pendingTimerPeak,
    0,
  );
}

async function runPrototypeScenario(useFluent: boolean): Promise<ScenarioSnapshot> {
  const clock = new FakeClock();
  const search = createTrackedSearch();
  const input = createManualSource<string>();
  const results: string[] = [];
  let latestQuery = "";
  let pendingTimerPeak = 0;
  const searchFlow = (query: string) =>
    fromAbortablePromise((signal) => search.search(query, signal));
  const source = useFluent
    ? flow(input.source).debounce(DEBOUNCE_MS, clock).switchLatest(searchFlow).source
    : switchLatest(searchFlow)(debounce(DEBOUNCE_MS, clock)(input.source));
  const subscription = source.subscribe({
    next: (result) => results.push(result[0]!),
    error: () => undefined,
    complete: () => undefined,
  });

  for (let index = 0; index < QUERY_COUNT; index += 1) {
    latestQuery = queryName(index);
    input.emit(latestQuery);
    pendingTimerPeak = Math.max(pendingTimerPeak, clock.pendingCount);
    clock.advanceBy(DEBOUNCE_MS);
  }
  resolveSearches(search);
  await flushMicrotasks();

  subscription.dispose();
  const disposalClock = new FakeClock();
  const disposalSearch = createTrackedSearch();
  const disposalInput = createManualSource<string>();
  const disposalSource = switchLatest((query: string) =>
    fromAbortablePromise((signal) => disposalSearch.search(query, signal)),
  )(debounce(DEBOUNCE_MS, disposalClock)(disposalInput.source));
  const disposalSubscription = disposalSource.subscribe({
    next: () => undefined,
    error: () => undefined,
    complete: () => undefined,
  });
  disposalInput.emit("disposed-query");
  disposalClock.advanceBy(DEBOUNCE_MS);
  disposalSubscription.dispose();
  resolveSearches(disposalSearch);
  await flushMicrotasks();

  return createSnapshot(
    {
      ...search,
      starts: search.starts + disposalSearch.starts,
      aborts: search.aborts + disposalSearch.aborts,
    },
    results.length,
    results.filter((result) => result !== latestQuery).length,
    pendingTimerPeak,
    0,
  );
}

async function runRxjsScenario(): Promise<ScenarioSnapshot> {
  const scheduler = new VirtualTimeScheduler();
  const queries = new Subject<string>();
  const search = createTrackedSearch();
  const results: string[] = [];
  let latestQuery = "";
  const searchSource = (query: string): Observable<readonly string[]> =>
    new Observable((subscriber) => {
      const controller = new AbortController();
      void search.search(query, controller.signal).then(
        (result) => {
          if (!controller.signal.aborted) {
            subscriber.next(result);
            subscriber.complete();
          }
        },
        (error: unknown) => subscriber.error(error),
      );
      return () => controller.abort();
    });
  const subscription = queries
    .pipe(debounceTime(DEBOUNCE_MS, scheduler), switchMap(searchSource))
    .subscribe({
      next: (result) => results.push(result[0]!),
      error: () => undefined,
      complete: () => undefined,
    });

  for (let index = 0; index < QUERY_COUNT; index += 1) {
    const query = queryName(index);
    latestQuery = query;
    scheduler.schedule(() => queries.next(query), index * (DEBOUNCE_MS * 2));
  }
  scheduler.schedule(
    () => resolveSearches(search),
    (QUERY_COUNT - 1) * (DEBOUNCE_MS * 2) + DEBOUNCE_MS + 1,
  );
  scheduler.flush();
  await flushMicrotasks();

  subscription.unsubscribe();
  const disposalScheduler = new VirtualTimeScheduler();
  const disposalQueries = new Subject<string>();
  const disposalSearch = createTrackedSearch();
  const disposalSource = disposalQueries.pipe(
    debounceTime(DEBOUNCE_MS, disposalScheduler),
    switchMap(
      (query) =>
        new Observable<readonly string[]>((subscriber) => {
          const controller = new AbortController();
          void disposalSearch.search(query, controller.signal).then((result) => {
            if (!controller.signal.aborted) {
              subscriber.next(result);
              subscriber.complete();
            }
          });
          return () => controller.abort();
        }),
    ),
  );
  const disposalSubscription = disposalSource.subscribe({
    next: () => undefined,
    error: () => undefined,
    complete: () => undefined,
  });
  disposalScheduler.schedule(() => disposalQueries.next("disposed-query"), 0);
  disposalScheduler.schedule(() => disposalSubscription.unsubscribe(), DEBOUNCE_MS + 1);
  disposalScheduler.schedule(() => resolveSearches(disposalSearch), DEBOUNCE_MS + 2);
  disposalScheduler.flush();
  await flushMicrotasks();

  return createSnapshot(
    {
      ...search,
      starts: search.starts + disposalSearch.starts,
      aborts: search.aborts + disposalSearch.aborts,
    },
    results.length,
    results.filter((result) => result !== latestQuery).length,
    null,
    0,
  );
}

function createDirectLifecycle(): number {
  const clock = new FakeClock();
  const start = performance.now();
  for (let cycle = 0; cycle < LIFECYCLE_CYCLES; cycle += 1) {
    const typeahead = createDirectTypeahead(
      clock,
      async () => [],
      () => undefined,
      () => undefined,
    );
    typeahead.dispose();
  }
  return performance.now() - start;
}

function createPrototypeLifecycle(useFluent: boolean): number {
  const start = performance.now();
  for (let cycle = 0; cycle < LIFECYCLE_CYCLES; cycle += 1) {
    const input = createManualSource<number>();
    const clock = new FakeClock();
    const search = fromAbortablePromise(async () => [] as readonly string[]);
    const source = useFluent
      ? flow(input.source)
          .debounce(DEBOUNCE_MS, clock)
          .switchLatest(() => search).source
      : switchLatest(() => search)(debounce(DEBOUNCE_MS, clock)(input.source));
    const subscription = source.subscribe({
      next: () => undefined,
      error: () => undefined,
      complete: () => undefined,
    });
    subscription.dispose();
  }
  return performance.now() - start;
}

function createRxjsLifecycle(): number {
  const start = performance.now();
  for (let cycle = 0; cycle < LIFECYCLE_CYCLES; cycle += 1) {
    const source = new Subject<number>();
    const subscription = source.pipe(
      debounceTime(DEBOUNCE_MS),
      switchMap(() => []),
    );
    const active = subscription.subscribe({
      next: () => undefined,
      error: () => undefined,
      complete: () => undefined,
    });
    active.unsubscribe();
  }
  return performance.now() - start;
}

function createRunners(): readonly Runner[] {
  return [
    { name: "direct", runScenario: runDirectScenario, runLifecycle: createDirectLifecycle },
    { name: "rxjs", runScenario: runRxjsScenario, runLifecycle: createRxjsLifecycle },
    {
      name: "prototype-functional",
      runScenario: () => runPrototypeScenario(false),
      runLifecycle: () => createPrototypeLifecycle(false),
    },
    {
      name: "prototype-fluent",
      runScenario: () => runPrototypeScenario(true),
      runLifecycle: () => createPrototypeLifecycle(true),
    },
  ];
}

function summarize(samples: readonly number[]): Record<string, number> {
  const durations = [...samples].sort((left, right) => left - right);
  return {
    minMs: durations[0]!,
    p50Ms: durations[Math.floor(durations.length / 2)]!,
    maxMs: durations.at(-1)!,
    meanMs: durations.reduce((sum, value) => sum + value, 0) / durations.length,
  };
}

describe("Flow deterministic async comparison harness", () => {
  test("passes stale cancellation and disposal correctness before measurement", async () => {
    const runners = createRunners();
    const snapshots = [] as ScenarioSnapshot[];
    for (const runner of runners) {
      const snapshot = await runner.runScenario();
      snapshots.push(snapshot);
      expect(snapshot).toMatchObject({
        starts: QUERY_COUNT + 1,
        delivered: 1,
        staleDelivered: 0,
        scopeDisposed: 0,
      });
      expect(snapshot.aborts).toBe(
        runner.name.startsWith("prototype") ? QUERY_COUNT : QUERY_COUNT + 1,
      );
    }
    expect(snapshots.map((snapshot) => snapshot.pendingTimerPeak)).toEqual([1, null, 1, 1]);
    expect(snapshots.every((snapshot) => snapshot.scopeDisposed === 0)).toBe(true);
  });

  test("Scope disposal cuts off an owned async branch synchronously", async () => {
    const scope = createScope();
    const clock = new FakeClock();
    const input = createManualSource<string>();
    const search = createTrackedSearch();
    const results: string[] = [];
    const source = switchLatest((query: string) =>
      fromAbortablePromise((signal) => search.search(query, signal)),
    )(debounce(DEBOUNCE_MS, clock)(input.source));
    subscribeInScope(scope, source, {
      next: (result) => results.push(result[0]!),
      error: () => undefined,
      complete: () => undefined,
    });

    input.emit("owned-query");
    clock.advanceBy(DEBOUNCE_MS);
    scope.dispose();
    resolveSearches(search);
    await flushMicrotasks();

    expect(results).toEqual([]);
    expect(search.aborts).toBe(1);
  });

  test("prints structural temporal and async evidence after the correctness gate", async () => {
    const runners = createRunners();
    for (const runner of runners) {
      for (let sample = 0; sample < WARMUP_SAMPLES; sample += 1) {
        await runner.runScenario();
        runner.runLifecycle();
      }
    }

    const report = {
      status: "correctness-passed",
      fixture: "deterministic rapid-query debounce and abortable switch-latest",
      semantics: {
        source: "subscription-driven source; no replay or implicit retention",
        ordering: "synchronous FIFO for direct and prototype source notifications",
        cancellation:
          "previous async work receives AbortSignal.abort(); stale completions are suppressed",
        disposal: "semantic cutoff precedes async platform cleanup; Scope disposal is synchronous",
        timers:
          "explicit debounce boundary; fake clock for direct/prototype; RxJS scheduler internals not counted",
      },
      environment: {
        node: (globalThis as RuntimeWithDiagnostics).process?.version ?? "unavailable",
        pnpm: "10.12.4 (recorded repository environment)",
        rxjs: "7.8.2",
        timerMode: "deterministic fake/virtual clocks",
      },
      methodology: {
        warmupSamples: WARMUP_SAMPLES,
        measurementSamples: MEASUREMENT_SAMPLES,
        queryCount: QUERY_COUNT,
        lifecycleCycles: LIFECYCLE_CYCLES,
        measurementClock:
          "performance.now() around deterministic orchestration and explicit microtask flushing",
        asyncCompletion: "controlled Promise resolution followed by explicit microtask flush",
        rawValues: "not emitted in report; only structural counts and timings",
      },
      runners: runners.map((runner) => {
        const scenarioSamples: ScenarioMeasurement[] = [];
        const lifecycleSamples: number[] = [];
        return (async () => {
          for (let sample = 0; sample < MEASUREMENT_SAMPLES; sample += 1) {
            const start = performance.now();
            const resultPromise = runner.runScenario();
            const result = await resultPromise;
            scenarioSamples.push({ elapsedMs: performance.now() - start, result });
            lifecycleSamples.push(runner.runLifecycle());
          }
          return {
            name: runner.name,
            scenarioSamples,
            scenarioSummary: summarize(scenarioSamples.map((sample) => sample.elapsedMs)),
            lifecycleSamples,
            lifecycleSummary: summarize(lifecycleSamples),
          };
        })();
      }),
    };
    const runnersReport = await Promise.all(report.runners);
    console.log(JSON.stringify({ ...report, runners: runnersReport }));
  });
});
