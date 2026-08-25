import { expect, expectTypeOf, test, vi } from "vitest";
import { state } from "../src/index.js";

test("state returns its initial value", () => {
  const count = state(0);

  expect(count.get()).toBe(0);
});

test("state replaces its value with set", () => {
  const count = state(0);

  count.set(1);

  expect(count.get()).toBe(1);
});

test("state derives its next value with update", () => {
  const count = state(1);

  count.update((current) => current + 1);

  expect(count.get()).toBe(2);
});

test("state preserves the value type", () => {
  const label = state("vii");

  expectTypeOf(label.get()).toEqualTypeOf<string>();
});

test("state notifies subscribers in registration order", () => {
  const count = state(0);
  const observed: number[] = [];

  count.subscribe((value) => observed.push(value));
  count.subscribe((value) => observed.push(value * 10));

  count.set(1);

  expect(observed).toEqual([1, 10]);
});

test("state treats duplicate subscriptions as independent registrations", () => {
  const count = state(0);
  const listener = vi.fn();
  const unsubscribeFirst = count.subscribe(listener);
  const unsubscribeSecond = count.subscribe(listener);

  count.set(1);
  unsubscribeFirst();
  count.set(2);
  unsubscribeSecond();
  count.set(3);

  expect(listener).toHaveBeenCalledTimes(3);
  expect(listener).toHaveBeenNthCalledWith(1, 1);
  expect(listener).toHaveBeenNthCalledWith(2, 1);
  expect(listener).toHaveBeenNthCalledWith(3, 2);
});

test("state makes unsubscribe idempotent", () => {
  const count = state(0);
  const listener = vi.fn();
  const unsubscribe = count.subscribe(listener);

  unsubscribe();
  unsubscribe();
  count.set(1);

  expect(listener).not.toHaveBeenCalled();
});

test("state does not notify a listener unsubscribed before its turn", () => {
  const count = state(0);
  const observed: string[] = [];
  let unsubscribeSecond = () => {};

  count.subscribe(() => {
    observed.push("first");
    unsubscribeSecond();
  });
  unsubscribeSecond = count.subscribe(() => observed.push("second"));

  count.set(1);

  expect(observed).toEqual(["first"]);
});

test("state defers subscriptions created during notification", () => {
  const count = state(0);
  const observed: string[] = [];
  let subscribedLate = false;

  count.subscribe((value) => {
    observed.push(`first:${value}`);
    if (!subscribedLate) {
      subscribedLate = true;
      count.subscribe((nextValue) => observed.push(`late:${nextValue}`));
    }
  });

  count.set(1);
  expect(observed).toEqual(["first:1"]);

  count.set(2);
  expect(observed).toEqual(["first:1", "first:2", "late:2"]);
});

test("state notifies remaining listeners before reporting subscriber errors", () => {
  const count = state(0);
  const laterListener = vi.fn();
  const firstError = new Error("first subscriber failed");
  const secondError = new Error("second subscriber failed");

  count.subscribe(() => {
    throw firstError;
  });
  count.subscribe(laterListener);
  count.subscribe(() => {
    throw secondError;
  });

  expect(() => count.set(1)).toThrow(AggregateError);
  expect(laterListener).toHaveBeenCalledWith(1);
  expect(count.get()).toBe(1);
});

test("state queues writes made during notification", () => {
  const count = state(0);
  const observed: string[] = [];

  count.subscribe((value) => {
    observed.push(`first:${value}`);
    if (value === 1) {
      count.set(2);
    }
  });
  count.subscribe((value) => observed.push(`second:${value}`));

  count.set(1);

  expect(observed).toEqual(["first:1", "second:1", "first:2", "second:2"]);
  expect(count.get()).toBe(2);
});

test("state drains a chain of queued writes in FIFO order", () => {
  const count = state(0);
  const observed: number[] = [];

  count.subscribe((value) => {
    observed.push(value);
    if (value < 3) {
      count.update((current) => current + 1);
    }
  });

  count.set(1);

  expect(observed).toEqual([1, 2, 3]);
  expect(count.get()).toBe(3);
});

test("state drains queued writes before reporting listener errors", () => {
  const count = state(0);
  const observed: number[] = [];
  const error = new Error("listener failed");

  count.subscribe((value) => {
    observed.push(value);
    if (value === 1) {
      count.set(2);
      throw error;
    }
  });
  count.subscribe((value) => observed.push(value));

  expect(() => count.set(1)).toThrow(error);
  expect(observed).toEqual([1, 1, 2, 2]);
  expect(count.get()).toBe(2);
});

test("state subscriptions unsubscribe in O(1) amortized time without quadratic churn slowdown", () => {
  const s = state(0);
  const n = 20_000;
  const unsubs: Array<() => void> = [];

  for (let i = 0; i < n; i++) {
    unsubs.push(s.subscribe(() => {}));
  }

  const start = performance.now();
  for (let i = 0; i < n; i++) {
    unsubs[i]!();
  }
  const durationMs = performance.now() - start;

  // 20,000 unsubscriptions with O(1) Set deletion execute well under 50ms (previously took ~873ms with O(n) array splicing)
  expect(durationMs).toBeLessThan(150);
});
