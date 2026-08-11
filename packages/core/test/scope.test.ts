import { expect, test, vi } from "vitest";
import { computed, createScope, state, type ViiResource } from "../src/index.js";

test("scope releases subscriptions created during run", () => {
  const count = state(0);
  const observed: number[] = [];
  const scope = createScope();

  scope.run(() => {
    count.subscribe((value) => observed.push(value));
  });

  count.set(1);
  scope.dispose();
  count.set(2);

  expect(observed).toEqual([1]);
});

test("scope disposes child scopes", () => {
  const count = state(0);
  const observed: number[] = [];
  const root = createScope();
  const child = root.createChild();

  child.run(() => {
    count.subscribe((value) => observed.push(value));
  });

  root.dispose();
  count.set(1);
  child.dispose();

  expect(observed).toEqual([]);
});

test("scope disposes resources in reverse registration order and is idempotent", () => {
  const events: string[] = [];
  const scope = createScope();
  const first: ViiResource = { dispose: () => events.push("first") };
  const second: ViiResource = { dispose: () => events.push("second") };

  scope.use(first);
  scope.use(second);
  scope.dispose();
  scope.dispose();

  expect(events).toEqual(["second", "first"]);
});

test("scope aggregates cleanup errors after attempting every resource", () => {
  const firstError = new Error("first cleanup failed");
  const secondError = new Error("second cleanup failed");
  const scope = createScope();
  const cleanupOrder: string[] = [];

  scope.use(() => {
    cleanupOrder.push("first");
    throw firstError;
  });
  scope.use(() => {
    cleanupOrder.push("second");
    throw secondError;
  });

  let disposalError: unknown;
  try {
    scope.dispose();
  } catch (error) {
    disposalError = error;
  }

  expect(cleanupOrder).toEqual(["second", "first"]);
  expect(disposalError).toBeInstanceOf(AggregateError);
  expect((disposalError as AggregateError).errors).toEqual([secondError, firstError]);
});

test("scope owns computed values created during run", () => {
  const count = state(1);
  const read = vi.fn(() => count.get() * 2);
  const scope = createScope();
  let doubled!: ReturnType<typeof computed<number>>;

  scope.run(() => {
    doubled = computed(read);
    expect(doubled.get()).toBe(2);
  });

  scope.dispose();
  count.set(2);

  expect(read).toHaveBeenCalledTimes(1);
  expect(() => doubled.get()).toThrow("Computed is disposed");
});

test("disposed scope rejects new work and resources", () => {
  const scope = createScope();
  scope.dispose();

  expect(() => scope.run(() => undefined)).toThrow("Scope is disposed");
  expect(() => scope.use(() => undefined)).toThrow("Scope is disposed");
  expect(() => scope.createChild()).toThrow("Scope is disposed");
});
