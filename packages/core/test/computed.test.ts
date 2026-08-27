import { expect, test, vi } from "vitest";
import { computed, createScope, state, type Computed } from "../src/index.js";

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

test("computed reactivity is not stolen by ambient scope active during first evaluation", () => {
  const s = state(1);
  const c = computed(() => s.get() * 2);
  const child = createScope({ name: "unrelated" });

  child.run(() => c.get());
  child.dispose();
  s.set(10);

  expect(c.get()).toBe(20);
});

test("computed evaluated in scope keeps recomputing after scope disposal while user subscription in scope is disposed", () => {
  const s = state(1);
  const c = computed(() => s.get() * 2);
  const child = createScope({ name: "unrelated" });
  const observed: number[] = [];

  child.run(() => {
    expect(c.get()).toBe(2);
    s.subscribe((value) => observed.push(value));
  });

  child.dispose();

  s.set(10);
  expect(observed).toEqual([]);
  expect(c.get()).toBe(20);
});

test("computed tracks state holding a promise value without throwing", () => {
  const initialPromise = Promise.resolve(42);
  const s = state(initialPromise);
  const c = computed(() => s.get());

  expect(c.get()).toBe(initialPromise);
});

test("computed tracks plain object with a then method without throwing", () => {
  const thenableData = { then: () => undefined, name: "user record" };
  const c = computed(() => thenableData);

  expect(c.get()).toBe(thenableData);
});

test("subscriber is notified when get() recomputes between invalidation and the scheduled recompute", () => {
  const count = state(1);
  const doubled = computed(() => count.get() * 2);
  const observed: number[] = [];

  doubled.subscribe((value) => observed.push(value));
  count.subscribe(() => {
    // Synchronous read in the same flush wave evaluates the computed and
    // clears the dirty flag before the scheduled recompute job runs.
    doubled.get();
  });

  count.set(2);

  expect(observed).toEqual([4]);
});

test("a recompute that throws does not permanently detach subscribers", () => {
  const count = state(1);
  const brittle = computed(() => {
    const value = count.get();
    if (value === 2) {
      throw new Error("transient failure");
    }
    return value * 10;
  });
  const observed: number[] = [];

  brittle.subscribe((value) => observed.push(value));

  expect(() => count.set(2)).toThrow("transient failure");

  count.set(3);

  expect(observed).toEqual([30]);
});

test("computed invalidation follows source state subscriber registration order", () => {
  const source = state("initial");
  let seenDerivedInEarlySubscriber: string | undefined;

  // 1. Early subscriber attached to source BEFORE computed evaluates dependencies
  source.subscribe(() => {
    // When source changes, this subscriber runs before computed's dependency listener
    // has invalidated its cache, so get() returns previous cached value.
    if (derived) {
      seenDerivedInEarlySubscriber = derived.get();
    }
  });

  // 2. Computed created and evaluated (registers dependency listener on source)
  const derived = computed(() => `derived:${source.get()}`);
  expect(derived.get()).toBe("derived:initial");

  // 3. Mutate source
  source.set("updated");

  // Inside the early subscriber callback, derived was not yet invalidated
  expect(seenDerivedInEarlySubscriber).toBe("derived:initial");

  // Outside the notification cycle, reading derived observes the fresh value
  expect(derived.get()).toBe("derived:updated");
});
