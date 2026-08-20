import { Observable, Subject, VirtualTimeScheduler } from "rxjs";
import { debounceTime, distinctUntilChanged, switchMap } from "rxjs/operators";
import { describe, expect, test } from "vitest";
import { createScope } from "../../packages/core/src/index.js";
import { createDirectTypeahead } from "./direct-baseline.js";
import {
  catchError,
  createManualSource,
  debounce,
  distinct,
  flow,
  fromAbortablePromise,
  fromAsyncIterable,
  fromReadableStream,
  map,
  subscribeInScope,
  switchLatest,
} from "./flow-prototype.js";
import { createPendingSearch, FakeClock, flushMicrotasks } from "./test-support.js";

async function runDirectTypeahead(): Promise<{
  results: readonly (readonly string[])[];
  aborted: readonly string[];
}> {
  const clock = new FakeClock();
  const search = createPendingSearch();
  const results: Array<readonly string[]> = [];
  const typeahead = createDirectTypeahead(
    clock,
    search.search,
    (result) => results.push(result),
    () => undefined,
  );
  typeahead.query("v");
  clock.advanceBy(5);
  typeahead.query("vi");
  clock.advanceBy(10);
  typeahead.query("vii");
  clock.advanceBy(10);
  search.resolve("vi", ["stale"]);
  search.resolve("vii", ["current"]);
  await flushMicrotasks();
  return { results, aborted: search.abortedQueries };
}

async function runPrototypeTypeahead(useFluent: boolean): Promise<{
  results: readonly (readonly string[])[];
  aborted: readonly string[];
}> {
  const clock = new FakeClock();
  const search = createPendingSearch();
  const input = createManualSource<string>();
  const results: Array<readonly string[]> = [];
  const observer = {
    next: (value: readonly string[]) => results.push(value),
    error: () => undefined,
    complete: () => undefined,
  };
  const searchFlow = (query: string) =>
    fromAbortablePromise((signal) => search.search(query, signal));
  const source = useFluent
    ? flow(input.source).debounce(10, clock).distinct().switchLatest(searchFlow).source
    : switchLatest(searchFlow)(distinct()(debounce(10, clock)(input.source)));
  const subscription = source.subscribe(observer);

  input.emit("v");
  clock.advanceBy(5);
  input.emit("vi");
  clock.advanceBy(10);
  input.emit("vii");
  clock.advanceBy(10);
  search.resolve("vi", ["stale"]);
  search.resolve("vii", ["current"]);
  await flushMicrotasks();
  subscription.dispose();
  return { results, aborted: search.abortedQueries };
}

async function runRxjsTypeahead(): Promise<{
  results: readonly (readonly string[])[];
  aborted: readonly string[];
}> {
  const scheduler = new VirtualTimeScheduler();
  const queries = new Subject<string>();
  const results: Array<readonly string[]> = [];
  const aborted: string[] = [];
  const resolvers = new Map<string, Array<(result: readonly string[]) => void>>();
  const search = (query: string): Observable<readonly string[]> =>
    new Observable((subscriber) => {
      const controller = new AbortController();
      const queryResolvers = resolvers.get(query) ?? [];
      queryResolvers.push((result) => {
        if (!controller.signal.aborted) {
          subscriber.next(result);
          subscriber.complete();
        }
      });
      resolvers.set(query, queryResolvers);
      return () => {
        controller.abort();
        aborted.push(query);
      };
    });
  const subscription = queries
    .pipe(debounceTime(10, scheduler), distinctUntilChanged(), switchMap(search))
    .subscribe((result) => results.push(result));

  scheduler.schedule(() => queries.next("v"), 0);
  scheduler.schedule(() => queries.next("vi"), 5);
  scheduler.schedule(() => queries.next("vii"), 20);
  scheduler.schedule(() => {
    for (const resolve of resolvers.get("vi") ?? []) {
      resolve(["stale"]);
    }
    for (const resolve of resolvers.get("vii") ?? []) {
      resolve(["current"]);
    }
  }, 40);
  scheduler.flush();
  await flushMicrotasks();
  subscription.unsubscribe();
  return { results, aborted };
}

describe("Flow research correctness fixtures", () => {
  test("direct, functional prototype, fluent prototype, and RxJS agree on stale cancellation", async () => {
    const direct = await runDirectTypeahead();
    const functional = await runPrototypeTypeahead(false);
    const fluent = await runPrototypeTypeahead(true);
    const rxjs = await runRxjsTypeahead();

    expect(direct.results).toEqual([["current"]]);
    expect(functional.results).toEqual(direct.results);
    expect(fluent.results).toEqual(direct.results);
    expect(rxjs.results).toEqual(direct.results);
    expect(direct.aborted).toEqual(["vi"]);
    expect(functional.aborted).toEqual(["vi"]);
    expect(fluent.aborted).toEqual(["vi"]);
    expect(rxjs.aborted).toEqual(["vi", "vii"]);
  });

  test("re-entrant emissions remain synchronous but FIFO within one subscription", () => {
    const source = createManualSource<number>();
    const observed: string[] = [];
    source.source.subscribe({
      next: (value) => {
        observed.push(`start:${value}`);
        if (value === 1) {
          source.emit(2);
        }
        observed.push(`end:${value}`);
      },
      error: () => undefined,
      complete: () => undefined,
    });

    source.emit(1);

    expect(observed).toEqual(["start:1", "end:1", "start:2", "end:2"]);
  });

  test("disposal blocks stale completion and is owned by Scope as one resource", async () => {
    const scope = createScope();
    const clock = new FakeClock();
    const search = createPendingSearch();
    const input = createManualSource<string>();
    const results: Array<readonly string[]> = [];
    const source = switchLatest((query: string) =>
      fromAbortablePromise((signal) => search.search(query, signal)),
    )(debounce(10, clock)(input.source));

    subscribeInScope(scope, source, {
      next: (result) => results.push(result),
      error: () => undefined,
      complete: () => undefined,
    });
    input.emit("query");
    clock.advanceBy(10);
    scope.dispose();
    search.resolve("query", ["stale"]);
    await flushMicrotasks();

    expect(results).toEqual([]);
    expect(search.abortedQueries).toEqual(["query"]);
  });

  test("source errors terminate a branch; catch is explicit recovery", () => {
    const source = createManualSource<number>();
    const observed: number[] = [];
    const errors: unknown[] = [];
    source.source.subscribe({
      next: (value) => observed.push(value),
      error: (error) => errors.push(error),
      complete: () => undefined,
    });
    source.emit(1);
    const failure = new Error("source failed");
    source.fail(failure);
    source.emit(2);

    expect(observed).toEqual([1]);
    expect(errors).toEqual([failure]);

    const recovering = createManualSource<number>();
    let fallback!: ReturnType<typeof createManualSource<number>>;
    const recovered: number[] = [];
    catchError(() => {
      fallback = createManualSource<number>();
      return fallback.source;
    })(recovering.source).subscribe({
      next: (value) => recovered.push(value),
      error: () => undefined,
      complete: () => undefined,
    });
    recovering.fail(failure);
    fallback.emit(99);
    expect(recovered).toEqual([99]);
  });

  test("inner errors terminate switchLatest and clear the outer subscription", () => {
    const outer = createManualSource<string>();
    const inner = createManualSource<number>();
    const errors: unknown[] = [];
    let innerSubscriptions = 0;
    const subscription = switchLatest(() => {
      innerSubscriptions += 1;
      return inner.source;
    })(outer.source).subscribe({
      next: () => undefined,
      error: (error) => errors.push(error),
      complete: () => undefined,
    });
    const failure = new Error("inner failed");

    outer.emit("first");
    inner.fail(failure);
    outer.emit("second");

    expect(errors).toEqual([failure]);
    expect(innerSubscriptions).toBe(1);
    subscription.dispose();
  });

  test("AsyncIterable disposal calls return without adding Flow backpressure", async () => {
    let returned = false;
    let resolveNext!: (result: IteratorResult<number>) => void;
    const iterable: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise<IteratorResult<number>>((resolve) => (resolveNext = resolve)),
        return: async () => {
          returned = true;
          return { done: true, value: undefined };
        },
      }),
    };
    const subscription = fromAsyncIterable(iterable).subscribe({
      next: () => undefined,
      error: () => undefined,
      complete: () => undefined,
    });
    subscription.dispose();
    resolveNext({ done: false, value: 1 });
    await flushMicrotasks();

    expect(returned).toBe(true);
  });

  test("ReadableStream disposal calls native cancel", async () => {
    let cancelled = false;
    const stream = new ReadableStream<number>({
      cancel: () => {
        cancelled = true;
      },
    });
    const subscription = fromReadableStream(stream).subscribe({
      next: () => undefined,
      error: () => undefined,
      complete: () => undefined,
    });
    subscription.dispose();
    await flushMicrotasks();

    expect(cancelled).toBe(true);
  });

  test("map keeps diagnostics payloads structural by construction", () => {
    const events: Array<{ type: string; count: number }> = [];
    const source = createManualSource<string>();
    map((value: string) => value.length)(source.source).subscribe({
      next: () => events.push({ type: "subscription.notified", count: 1 }),
      error: () => events.push({ type: "subscription.error", count: 1 }),
      complete: () => events.push({ type: "subscription.completed", count: 1 }),
    });
    source.emit("secret user content");

    expect(events).toEqual([{ type: "subscription.notified", count: 1 }]);
    expect(JSON.stringify(events)).not.toContain("secret");
  });
});
