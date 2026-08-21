import { describe, expect, test } from "vitest";
import { createScope } from "../../packages/core/src/index.js";
import { createManualSource, fromAsyncIterable, map, subscribeInScope } from "./flow-prototype.js";
import { flushMicrotasks } from "./test-support.js";

interface ControlledIterator extends AsyncIterator<number> {
  readonly nextCalls: number;
  readonly returnCalls: number;
  resolveNext(result: IteratorResult<number>): void;
}

function createControlledIterator(): ControlledIterator {
  let nextCalls = 0;
  let returnCalls = 0;
  let resolveNext!: (result: IteratorResult<number>) => void;

  return {
    get nextCalls() {
      return nextCalls;
    },
    get returnCalls() {
      return returnCalls;
    },
    next: () => {
      nextCalls += 1;
      return new Promise<IteratorResult<number>>((resolve) => {
        resolveNext = resolve;
      });
    },
    return: () => {
      returnCalls += 1;
      return Promise.resolve({ done: true, value: undefined });
    },
    resolveNext: (result) => resolveNext(result),
  };
}

describe("Flow subscription identity and upstream ownership fixtures", () => {
  test("each AsyncIterable subscription owns a distinct iterator", async () => {
    const iterators: ControlledIterator[] = [];
    const iterable: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => {
        const iterator = createControlledIterator();
        iterators.push(iterator);
        return iterator;
      },
    };
    const firstValues: number[] = [];
    const secondValues: number[] = [];
    const first = fromAsyncIterable(iterable).subscribe({
      next: (value) => firstValues.push(value),
      error: () => undefined,
      complete: () => undefined,
    });
    const second = fromAsyncIterable(iterable).subscribe({
      next: (value) => secondValues.push(value),
      error: () => undefined,
      complete: () => undefined,
    });

    expect(iterators).toHaveLength(2);
    iterators[0]!.resolveNext({ done: false, value: 1 });
    await flushMicrotasks();
    first.dispose();

    expect(firstValues).toEqual([1]);
    expect(secondValues).toEqual([]);
    expect(iterators[0]!.returnCalls).toBe(1);
    expect(iterators[1]!.returnCalls).toBe(0);

    iterators[1]!.resolveNext({ done: false, value: 2 });
    await flushMicrotasks();
    second.dispose();

    expect(secondValues).toEqual([2]);
    expect(iterators[1]!.returnCalls).toBe(1);
  });

  test("composed subscriptions isolate downstream disposal", () => {
    const source = createManualSource<number>();
    const mapped = map((value: number) => value + 1)(source.source);
    const firstValues: number[] = [];
    const secondValues: number[] = [];
    const first = mapped.subscribe({
      next: (value) => firstValues.push(value),
      error: () => undefined,
      complete: () => undefined,
    });
    const second = mapped.subscribe({
      next: (value) => secondValues.push(value),
      error: () => undefined,
      complete: () => undefined,
    });

    source.emit(1);
    first.dispose();
    source.emit(2);

    expect(firstValues).toEqual([2]);
    expect(secondValues).toEqual([2, 3]);
    second.dispose();
  });

  test("Scope ownership isolates subscriptions sharing one explicit hot source", () => {
    const source = createManualSource<number>();
    const firstScope = createScope();
    const secondScope = createScope();
    const firstValues: number[] = [];
    const secondValues: number[] = [];

    subscribeInScope(firstScope, source.source, {
      next: (value) => firstValues.push(value),
      error: () => undefined,
      complete: () => undefined,
    });
    subscribeInScope(secondScope, source.source, {
      next: (value) => secondValues.push(value),
      error: () => undefined,
      complete: () => undefined,
    });

    source.emit(1);
    firstScope.dispose();
    source.emit(2);
    secondScope.dispose();
    source.emit(3);

    expect(firstValues).toEqual([1]);
    expect(secondValues).toEqual([1, 2]);
  });
});
