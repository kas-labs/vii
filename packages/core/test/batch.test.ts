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
