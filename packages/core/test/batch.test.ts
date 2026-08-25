import { expect, test, vi } from "vitest";
import { batch, computed, state } from "../src/index.js";

test("batch defers notifications until the callback completes", () => {
  const first = state(0);
  const second = state(0);
  const observed: string[] = [];

  first.subscribe((value) => observed.push(`first:${value}`));
  second.subscribe((value) => observed.push(`second:${value}`));

  batch(() => {
    first.set(1);
    second.set(2);
    expect(observed).toEqual([]);
  });

  expect(observed).toEqual(["first:1", "second:2"]);
});

test("batch flushes nested batches only at the outer boundary", () => {
  const count = state(0);
  const observed: number[] = [];

  count.subscribe((value) => observed.push(value));

  batch(() => {
    count.set(1);
    batch(() => {
      count.set(2);
      expect(observed).toEqual([]);
    });
    expect(observed).toEqual([]);
  });

  expect(observed).toEqual([2]);
});

test("batch coalesces repeated writes to one State", () => {
  const count = state(0);
  const observed: number[] = [];

  count.subscribe((value) => observed.push(value));

  batch(() => {
    count.set(1);
    count.set(2);
    count.update((current) => current + 1);
  });

  expect(count.get()).toBe(3);
  expect(observed).toEqual([3]);
});

test("batch recomputes a dependent Computed once", () => {
  const first = state(1);
  const second = state(1);
  const read = vi.fn(() => first.get() + second.get());
  const total = computed(read);
  const observed: number[] = [];

  total.subscribe((value) => observed.push(value));
  batch(() => {
    first.set(2);
    second.set(3);
  });

  expect(total.get()).toBe(5);
  expect(observed).toEqual([5]);
  expect(read).toHaveBeenCalledTimes(2);
});

test("batch flushes committed writes before rethrowing a callback error", () => {
  const count = state(0);
  const observed: number[] = [];
  const callbackError = new Error("batch callback failed");

  count.subscribe((value) => observed.push(value));

  expect(() =>
    batch(() => {
      count.set(1);
      throw callbackError;
    }),
  ).toThrow(callbackError);

  expect(count.get()).toBe(1);
  expect(observed).toEqual([1]);
});

test("batch continues queued notifications after a listener error", () => {
  const first = state(0);
  const second = state(0);
  const firstError = new Error("first listener failed");
  const laterListener = vi.fn();

  first.subscribe(() => {
    throw firstError;
  });
  second.subscribe(laterListener);

  expect(() =>
    batch(() => {
      first.set(1);
      second.set(2);
    }),
  ).toThrow(firstError);

  expect(laterListener).toHaveBeenCalledWith(2);
});

test("scheduler throws cycle error on runaway self-scheduling jobs exceeding MAX_FLUSH_ITERATIONS", () => {
  const s = state(0);
  let runs = 0;

  s.subscribe((v) => {
    runs++;
    s.set(v + 1);
  });

  expect(() => {
    s.set(1);
  }).toThrow(/Runaway notification cycle detected/);

  expect(runs).toBeGreaterThanOrEqual(10_000);
});

test("scheduler completes deep but finite cascades below MAX_FLUSH_ITERATIONS", () => {
  const s = state(0);
  const observed: number[] = [];

  s.subscribe((v) => {
    observed.push(v);
    if (v < 500) {
      s.set(v + 1);
    }
  });

  s.set(1);
  expect(observed.length).toBe(500);
  expect(s.get()).toBe(500);
});

test("nested batch throw leaves outer committed writes in effect and delivered (non-transactional)", () => {
  const outer = state(0);
  const inner = state(0);
  const outerObserved: number[] = [];
  const innerObserved: number[] = [];

  outer.subscribe((v) => outerObserved.push(v));
  inner.subscribe((v) => innerObserved.push(v));

  expect(() => {
    batch(() => {
      outer.set(10);
      batch(() => {
        inner.set(20);
        throw new Error("nested boom");
      });
    });
  }).toThrow("nested boom");

  // Both committed states remain committed and notified
  expect(outer.get()).toBe(10);
  expect(inner.get()).toBe(20);
  expect(outerObserved).toEqual([10]);
  expect(innerObserved).toEqual([20]);
});
