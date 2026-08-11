import { expect, test, vi } from "vitest";
import { computed, state, type Computed } from "../src/index.js";

test("computed evaluates lazily and caches its value", () => {
  const count = state(2);
  const read = vi.fn(() => count.get() * 2);
  const doubled = computed(read);

  expect(read).not.toHaveBeenCalled();
  expect(doubled.get()).toBe(4);
  expect(doubled.get()).toBe(4);
  expect(read).toHaveBeenCalledTimes(1);
});

test("computed invalidates when a dependency changes", () => {
  const count = state(1);
  const read = vi.fn(() => count.get() * 2);
  const doubled = computed(read);

  expect(doubled.get()).toBe(2);
  count.set(2);

  expect(read).toHaveBeenCalledTimes(1);
  expect(doubled.get()).toBe(4);
  expect(read).toHaveBeenCalledTimes(2);
});

test("computed subscribers receive only changed computed values", () => {
  const count = state(1);
  const read = vi.fn(() => count.get() % 2);
  const odd = computed(read);
  const observed: number[] = [];

  odd.subscribe((value) => observed.push(value));
  count.set(1);
  count.set(3);
  count.set(4);

  expect(observed).toEqual([0]);
  expect(read).toHaveBeenCalledTimes(3);
});

test("computed tracks dependencies through other computed values", () => {
  const count = state(2);
  const doubledRead = vi.fn(() => count.get() * 2);
  const doubled = computed(doubledRead);
  const quadrupledRead = vi.fn(() => doubled.get() * 2);
  const quadrupled = computed(quadrupledRead);

  expect(quadrupled.get()).toBe(8);
  count.set(3);

  expect(quadrupled.get()).toBe(12);
  expect(doubledRead).toHaveBeenCalledTimes(2);
  expect(quadrupledRead).toHaveBeenCalledTimes(2);
});

test("computed detects circular dependencies", () => {
  const firstReference: { current?: Computed<number> } = {};
  const second = computed(() => firstReference.current!.get() + 1);
  const first = computed(() => second.get() + 1);
  firstReference.current = first;

  expect(() => first.get()).toThrow("Computed cycle detected");
});

test("computed disposal releases dependencies and rejects later use", () => {
  const count = state(1);
  const read = vi.fn(() => count.get() * 2);
  const doubled = computed(read);
  const listener = vi.fn();

  doubled.subscribe(listener);
  doubled.dispose();
  doubled.dispose();
  count.set(2);

  expect(read).toHaveBeenCalledTimes(1);
  expect(listener).not.toHaveBeenCalled();
  expect(() => doubled.get()).toThrow("Computed is disposed");
  expect(() => doubled.subscribe(listener)).toThrow("Computed is disposed");
});

test("computed subscribes to a repeated dependency only once", () => {
  const count = state(1);
  const read = vi.fn(() => count.get() + count.get());
  const doubled = computed(read);

  expect(doubled.get()).toBe(2);
  count.set(2);

  expect(doubled.get()).toBe(4);
  expect(read).toHaveBeenCalledTimes(2);
});

test("computed releases dependencies no longer read", () => {
  const useLeft = state(true);
  const left = state(1);
  const right = state(10);
  const read = vi.fn(() => (useLeft.get() ? left.get() : right.get()));
  const selected = computed(read);

  expect(selected.get()).toBe(1);
  useLeft.set(false);
  expect(selected.get()).toBe(10);

  left.set(2);
  expect(read).toHaveBeenCalledTimes(2);
  right.set(11);
  expect(selected.get()).toBe(11);
  expect(read).toHaveBeenCalledTimes(3);
});
