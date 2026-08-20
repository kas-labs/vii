import { describe, expect, test } from "vitest";
import {
  createManualSource,
  debounce,
  fromAsyncIterable,
  fromReadableStream,
} from "./flow-prototype.js";
import { FakeClock, flushMicrotasks } from "./test-support.js";

describe("Flow platform and timer robustness fixtures", () => {
  test("debounce timer boundaries stay bounded under a synchronous timer storm", () => {
    const clock = new FakeClock();
    const source = createManualSource<number>();
    const observed: number[] = [];
    debounce<number>(
      10,
      clock,
    )(source.source).subscribe({
      next: (value) => observed.push(value),
      error: () => undefined,
      complete: () => undefined,
    });

    for (let value = 0; value < 1000; value += 1) {
      source.emit(value);
    }

    expect(clock.pendingCount).toBe(1);
    clock.advanceBy(10);
    expect(observed).toEqual([999]);
  });

  test("AsyncIterable disposal calls return without adding Flow backpressure", async () => {
    let returned = false;
    let returnCompleted = false;
    let resolveReturn!: (result: IteratorResult<number>) => void;
    let resolveNext!: (result: IteratorResult<number>) => void;
    const iterable: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise<IteratorResult<number>>((resolve) => (resolveNext = resolve)),
        return: () =>
          new Promise<IteratorResult<number>>((resolve) => {
            returned = true;
            resolveReturn = (result) => {
              returnCompleted = true;
              resolve(result);
            };
          }),
      }),
    };
    const subscription = fromAsyncIterable(iterable).subscribe({
      next: () => undefined,
      error: () => undefined,
      complete: () => undefined,
    });

    subscription.dispose();
    expect(subscription.closed).toBe(true);
    expect(returned).toBe(true);
    expect(returnCompleted).toBe(false);
    resolveNext({ done: false, value: 1 });
    resolveReturn({ done: true, value: undefined });
    await flushMicrotasks();

    expect(returned).toBe(true);
    expect(returnCompleted).toBe(true);
  });

  test("AsyncIterable cancellation rejection does not become a Flow source error", async () => {
    let resolveNext!: (result: IteratorResult<number>) => void;
    const errors: unknown[] = [];
    const iterable: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise<IteratorResult<number>>((resolve) => (resolveNext = resolve)),
        return: () => Promise.reject(new Error("return failed")),
      }),
    };
    const subscription = fromAsyncIterable(iterable).subscribe({
      next: () => undefined,
      error: (error) => errors.push(error),
      complete: () => undefined,
    });

    subscription.dispose();
    resolveNext({ done: false, value: 1 });
    await flushMicrotasks();

    expect(errors).toEqual([]);
  });

  test("ReadableStream disposal calls native cancel without claiming completion", async () => {
    let cancelled = false;
    let cancelCompleted = false;
    let resolveCancel!: () => void;
    const stream = new ReadableStream<number>({
      cancel: () => {
        cancelled = true;
        return new Promise<void>((resolve) => {
          resolveCancel = () => {
            cancelCompleted = true;
            resolve();
          };
        });
      },
    });
    const subscription = fromReadableStream(stream).subscribe({
      next: () => undefined,
      error: () => undefined,
      complete: () => undefined,
    });

    subscription.dispose();
    expect(subscription.closed).toBe(true);
    expect(cancelled).toBe(true);
    expect(cancelCompleted).toBe(false);
    resolveCancel();
    await flushMicrotasks();

    expect(cancelled).toBe(true);
    expect(cancelCompleted).toBe(true);
  });

  test("ReadableStream cancellation rejection does not become a Flow source error", async () => {
    let cancelled = false;
    const errors: unknown[] = [];
    const stream = new ReadableStream<number>({
      cancel: () => {
        cancelled = true;
        return Promise.reject(new Error("cancel failed"));
      },
    });
    const subscription = fromReadableStream(stream).subscribe({
      next: () => undefined,
      error: (error) => errors.push(error),
      complete: () => undefined,
    });

    subscription.dispose();
    await flushMicrotasks();

    expect(cancelled).toBe(true);
    expect(errors).toEqual([]);
  });
});
