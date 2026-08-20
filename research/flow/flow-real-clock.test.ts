import { describe, expect, test } from "vitest";
import {
  createManualSource,
  debounce,
  fromAbortablePromise,
  switchLatest,
} from "./flow-prototype.js";
import { createPendingSearch, flushMicrotasks } from "./test-support.js";

class RealClock {
  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  set(delay: number, callback: () => void): number {
    const id = this.nextId++;
    this.timers.set(
      id,
      setTimeout(() => {
        this.timers.delete(id);
        callback();
      }, delay),
    );
    return id;
  }

  clear(timerId: number): void {
    const timer = this.timers.get(timerId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.timers.delete(timerId);
    }
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

describe("Flow real-clock validation layer", () => {
  test("real timers preserve stale cancellation and latest-result delivery", async () => {
    const clock = new RealClock();
    const search = createPendingSearch();
    const input = createManualSource<string>();
    const results: Array<readonly string[]> = [];
    const source = switchLatest((query: string) =>
      fromAbortablePromise((signal) => search.search(query, signal)),
    )(debounce(8, clock)(input.source));
    const subscription = source.subscribe({
      next: (value) => results.push(value),
      error: () => undefined,
      complete: () => undefined,
    });

    input.emit("old");
    await wait(16);
    input.emit("new");
    await wait(16);
    search.resolve("old", ["stale"]);
    search.resolve("new", ["current"]);
    await flushMicrotasks();
    subscription.dispose();

    expect(results).toEqual([["current"]]);
    expect(search.abortedQueries).toContain("old");
  });

  test("real timer disposal cuts off pending work before its completion", async () => {
    const clock = new RealClock();
    const search = createPendingSearch();
    const input = createManualSource<string>();
    const results: Array<readonly string[]> = [];
    const source = switchLatest((query: string) =>
      fromAbortablePromise((signal) => search.search(query, signal)),
    )(debounce(8, clock)(input.source));
    const subscription = source.subscribe({
      next: (value) => results.push(value),
      error: () => undefined,
      complete: () => undefined,
    });

    input.emit("pending");
    await wait(16);
    subscription.dispose();
    search.resolve("pending", ["stale"]);
    await flushMicrotasks();

    expect(results).toEqual([]);
    expect(search.abortedQueries).toContain("pending");
  });
});
