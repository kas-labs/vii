import { from, type Subscription } from "rxjs";
import { share } from "rxjs/operators";
import { describe, expect, test } from "vitest";
import {
  fromAsyncIterable,
  type FlowObserver,
  type FlowSource,
  type FlowSubscription,
} from "./flow-prototype.js";
import { flushMicrotasks } from "./test-support.js";

interface ControlledIterator extends AsyncIterator<number> {
  readonly id: number;
  readonly returnCalls: number;
  push(value: number): void;
}

interface ControlledFactory {
  readonly iterable: AsyncIterable<number>;
  readonly iterators: ControlledIterator[];
}

interface TestSubscription {
  dispose(): void;
}

interface TestSource {
  subscribe(next: (value: number) => void): TestSubscription;
}

interface SharingSnapshot {
  readonly first: readonly number[];
  readonly second: readonly number[];
  readonly third: readonly number[];
  readonly iteratorIds: readonly number[];
  readonly returnCalls: readonly number[];
}

function createControlledFactory(): ControlledFactory {
  const iterators: ControlledIterator[] = [];
  const iterable: AsyncIterable<number> = {
    [Symbol.asyncIterator]: () => {
      let resolveNext: ((result: IteratorResult<number>) => void) | undefined;
      let returnCalls = 0;
      const iterator: ControlledIterator = {
        id: iterators.length + 1,
        get returnCalls() {
          return returnCalls;
        },
        next: () =>
          new Promise<IteratorResult<number>>((resolve) => {
            resolveNext = resolve;
          }),
        return: () => {
          returnCalls += 1;
          resolveNext?.({ done: true, value: undefined });
          resolveNext = undefined;
          return Promise.resolve({ done: true, value: undefined });
        },
        push: (value) => {
          if (resolveNext === undefined) {
            throw new Error("controlled iterator has no pending next() call");
          }
          const resolve = resolveNext;
          resolveNext = undefined;
          resolve({ done: false, value });
        },
      };
      iterators.push(iterator);
      return iterator;
    },
  };
  return { iterable, iterators };
}

function createDirectAsyncIterableSource(iterable: AsyncIterable<number>): TestSource {
  return {
    subscribe: (next) => {
      const iterator = iterable[Symbol.asyncIterator]();
      let active = true;
      void (async () => {
        try {
          while (active) {
            const result = await iterator.next();
            if (!active) {
              return;
            }
            if (result.done) {
              return;
            }
            next(result.value);
          }
        } catch {
          // The fixture observes lifecycle ownership, not a direct error channel.
        }
      })();
      return {
        dispose: () => {
          if (!active) {
            return;
          }
          active = false;
          void iterator.return?.();
        },
      };
    },
  };
}

function createDirectSharedSource(source: TestSource): TestSource {
  const observers = new Set<(value: number) => void>();
  let upstream: TestSubscription | undefined;
  return {
    subscribe: (next) => {
      let active = true;
      observers.add(next);
      if (observers.size === 1) {
        upstream = source.subscribe((value) => {
          for (const observer of [...observers]) {
            observer(value);
          }
        });
      }
      return {
        dispose: () => {
          if (!active) {
            return;
          }
          active = false;
          observers.delete(next);
          if (observers.size === 0) {
            upstream?.dispose();
            upstream = undefined;
          }
        },
      };
    },
  };
}

function createThrowawayPrototypeSharedSource(source: FlowSource<number>): TestSource {
  const observers = new Set<FlowObserver<number>>();
  let upstream: FlowSubscription | undefined;
  return {
    subscribe: (next) => {
      let active = true;
      const observer: FlowObserver<number> = {
        next,
        error: () => undefined,
        complete: () => undefined,
      };
      observers.add(observer);
      if (observers.size === 1) {
        upstream = source.subscribe({
          next: (value) => {
            for (const subscriber of [...observers]) {
              subscriber.next(value);
            }
          },
          error: () => undefined,
          complete: () => undefined,
        });
      }
      return {
        dispose: () => {
          if (!active) {
            return;
          }
          active = false;
          observers.delete(observer);
          if (observers.size === 0) {
            upstream?.dispose();
            upstream = undefined;
          }
        },
      };
    },
  };
}

function createRxjsSharedSource(iterable: AsyncIterable<number>): TestSource {
  const shared = from(iterable).pipe(share());
  return {
    subscribe: (next) => {
      const subscription: Subscription = shared.subscribe({ next });
      return { dispose: () => subscription.unsubscribe() };
    },
  };
}

async function runSharingScenario(
  createSource: (factory: ControlledFactory) => TestSource,
  expectedFirstReturnCalls: number,
): Promise<SharingSnapshot> {
  const factory = createControlledFactory();
  const source = createSource(factory);
  const first: number[] = [];
  const second: number[] = [];
  const third: number[] = [];

  const firstSubscription = source.subscribe((value) => first.push(value));
  expect(factory.iterators).toHaveLength(1);
  factory.iterators[0]!.push(1);
  await flushMicrotasks();

  const secondSubscription = source.subscribe((value) => second.push(value));
  factory.iterators[0]!.push(2);
  await flushMicrotasks();
  firstSubscription.dispose();
  expect(factory.iterators[0]!.returnCalls).toBe(0);
  factory.iterators[0]!.push(3);
  await flushMicrotasks();
  secondSubscription.dispose();
  await flushMicrotasks();

  expect(factory.iterators[0]!.returnCalls).toBe(expectedFirstReturnCalls);
  const thirdSubscription = source.subscribe((value) => third.push(value));
  expect(factory.iterators).toHaveLength(2);
  factory.iterators[1]!.push(4);
  await flushMicrotasks();
  thirdSubscription.dispose();
  await flushMicrotasks();

  return {
    first,
    second,
    third,
    iteratorIds: factory.iterators.map(({ id }) => id),
    returnCalls: factory.iterators.map(({ returnCalls }) => returnCalls),
  };
}

describe("Flow hot-sharing and late-subscriber boundaries", () => {
  test("direct, RxJS, and prototype forms agree on explicit ref-count ownership", async () => {
    const direct = await runSharingScenario(
      (factory) => createDirectSharedSource(createDirectAsyncIterableSource(factory.iterable)),
      1,
    );
    const rxjs = await runSharingScenario((factory) => createRxjsSharedSource(factory.iterable), 0);
    const prototype = await runSharingScenario(
      (factory) => createThrowawayPrototypeSharedSource(fromAsyncIterable(factory.iterable)),
      1,
    );

    expect(direct).toEqual({
      first: [1, 2],
      second: [2, 3],
      third: [4],
      iteratorIds: [1, 2],
      returnCalls: [1, 1],
    });
    expect(rxjs).toEqual({
      ...direct,
      returnCalls: [0, 0],
    });
    expect(prototype).toEqual(direct);
  });

  test("a late subscriber observes only future emissions and receives no replay", async () => {
    const factory = createControlledFactory();
    const source = createThrowawayPrototypeSharedSource(fromAsyncIterable(factory.iterable));
    const first: number[] = [];
    const second: number[] = [];

    const firstSubscription = source.subscribe((value) => first.push(value));
    factory.iterators[0]!.push(10);
    await flushMicrotasks();
    const secondSubscription = source.subscribe((value) => second.push(value));
    expect(second).toEqual([]);
    factory.iterators[0]!.push(11);
    await flushMicrotasks();

    expect(first).toEqual([10, 11]);
    expect(second).toEqual([11]);
    firstSubscription.dispose();
    secondSubscription.dispose();
  });
});
