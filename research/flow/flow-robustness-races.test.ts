import { describe, expect, test } from "vitest";
import { fromAsyncIterable, fromReadableStream } from "./flow-prototype.js";
import { flushMicrotasks } from "./test-support.js";

describe("Flow malicious, unbounded, and cancellation-race fixtures", () => {
  test("AsyncIterable producer failure uses the explicit error channel", async () => {
    const failure = new Error("iterator producer failed");
    const errors: unknown[] = [];
    const iterable: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({
        next: () => {
          throw failure;
        },
      }),
    };

    fromAsyncIterable(iterable).subscribe({
      next: () => undefined,
      error: (error) => errors.push(error),
      complete: () => undefined,
    });
    await flushMicrotasks();
    await flushMicrotasks();

    expect(errors).toEqual([failure]);
  });

  test("fast AsyncIterable production stops after semantic disposal", async () => {
    let nextCalls = 0;
    const observed: number[] = [];
    const iterable: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({
        next: async () => {
          nextCalls += 1;
          return { done: false, value: nextCalls };
        },
      }),
    };

    const subscription = fromAsyncIterable(iterable).subscribe({
      next: (value) => observed.push(value),
      error: () => undefined,
      complete: () => undefined,
    });
    subscription.dispose();
    await flushMicrotasks();
    await flushMicrotasks();

    expect(subscription.closed).toBe(true);
    expect(nextCalls).toBe(1);
    expect(observed).toEqual([]);
  });

  test("AsyncIterable cancellation race calls return once and suppresses late next", async () => {
    let resolveNext!: (result: IteratorResult<number>) => void;
    let returnCalls = 0;
    const observed: number[] = [];
    const iterable: AsyncIterable<number> = {
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise<IteratorResult<number>>((resolve) => (resolveNext = resolve)),
        return: () => {
          returnCalls += 1;
          return Promise.resolve({ done: true, value: undefined });
        },
      }),
    };

    const subscription = fromAsyncIterable(iterable).subscribe({
      next: (value) => observed.push(value),
      error: () => undefined,
      complete: () => undefined,
    });
    subscription.dispose();
    subscription.dispose();
    resolveNext({ done: false, value: 1 });
    await flushMicrotasks();

    expect(returnCalls).toBe(1);
    expect(observed).toEqual([]);
  });

  test("ReadableStream producer failure uses the explicit error channel", async () => {
    const failure = new Error("stream producer failed");
    const errors: unknown[] = [];
    const stream = new ReadableStream<number>({
      pull: () => {
        throw failure;
      },
    });

    fromReadableStream(stream).subscribe({
      next: () => undefined,
      error: (error) => errors.push(error),
      complete: () => undefined,
    });
    await flushMicrotasks();
    await flushMicrotasks();

    expect(errors).toEqual([failure]);
  });

  test("ReadableStream cancellation race suppresses a pending read", async () => {
    let releasePull!: () => void;
    let cancelCalls = 0;
    const observed: number[] = [];
    const stream = new ReadableStream<number>({
      pull: () =>
        new Promise<void>((resolve) => {
          releasePull = resolve;
        }),
      cancel: () => {
        cancelCalls += 1;
      },
    });

    const subscription = fromReadableStream(stream).subscribe({
      next: (value) => observed.push(value),
      error: () => undefined,
      complete: () => undefined,
    });
    await flushMicrotasks();
    subscription.dispose();
    releasePull();
    await flushMicrotasks();

    expect(cancelCalls).toBe(1);
    expect(observed).toEqual([]);
  });
});

describe("switchLatest synchronous inner completion (audit regression)", () => {
  test("completes when the projected inner source is already closed at subscribe time", async () => {
    const { createManualSource, switchLatest } = await import("./flow-prototype.js");
    const inner = createManualSource<number>();
    inner.complete();

    const outer = createManualSource<string>();
    let completed = false;
    const received: number[] = [];

    switchLatest(() => inner.source)(outer.source).subscribe({
      next: (value: number) => {
        received.push(value);
      },
      error: () => undefined,
      complete: () => {
        completed = true;
      },
    });

    outer.emit("q");
    outer.complete();

    expect(received).toEqual([]);
    expect(completed).toBe(true);
  });

  test("still switches between live inner sources", async () => {
    const { createManualSource, switchLatest } = await import("./flow-prototype.js");
    const first = createManualSource<number>();
    const second = createManualSource<number>();
    const outer = createManualSource<0 | 1>();
    const received: number[] = [];
    let completed = false;

    switchLatest((index: 0 | 1) => (index === 0 ? first.source : second.source))(
      outer.source,
    ).subscribe({
      next: (value: number) => {
        received.push(value);
      },
      error: () => undefined,
      complete: () => {
        completed = true;
      },
    });

    outer.emit(0);
    first.emit(1);
    outer.emit(1);
    first.emit(99);
    second.emit(2);
    outer.complete();
    expect(completed).toBe(false);
    second.complete();

    expect(received).toEqual([1, 2]);
    expect(completed).toBe(true);
  });
});
