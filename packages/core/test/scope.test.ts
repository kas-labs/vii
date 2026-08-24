import { expect, test, vi } from "vitest";
import { computed, createDiagnostics, createScope, state, type ViiResource } from "../src/index.js";

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

test("self-unsubscribed subscriptions are detached and do not produce resource.disposed events at scope disposal", () => {
  const diagnostics = createDiagnostics();
  const s = state(0);

  diagnostics.run(() => {
    const scope = createScope();
    scope.run(() => {
      for (let i = 0; i < 50; i++) {
        const unsubscribe = s.subscribe(() => {});
        unsubscribe();
      }
    });

    const beforeDisposeEvents = diagnostics.getEvents().slice();
    scope.dispose();
    const afterDisposeEvents = diagnostics.getEvents().slice(beforeDisposeEvents.length);

    const disposedResourceEvents = afterDisposeEvents.filter((e) => e.type === "resource.disposed");
    expect(disposedResourceEvents).toHaveLength(0);
  });
});

test("preserves LIFO disposal order when detaches are interleaved with attaches", () => {
  const events: string[] = [];
  const scope = createScope();

  scope.use({ dispose: () => events.push("first") });
  const d2 = scope.use({ dispose: () => events.push("second") });
  scope.use({ dispose: () => events.push("third") });
  const d4 = scope.use({ dispose: () => events.push("fourth") });

  d2();
  d4();

  scope.use({ dispose: () => events.push("fifth") });

  d2();

  scope.dispose();

  expect(events).toEqual(["fifth", "third", "first"]);
});

test("disposing a scope whose resources detach themselves during teardown does not skip or double-dispose", () => {
  const events: string[] = [];
  const scope = createScope();

  let detachFirst = (): void => undefined;
  let detachSecond = (): void => undefined;

  detachFirst = scope.use({
    dispose: () => {
      events.push("first");
      detachFirst();
    },
  });

  detachSecond = scope.use({
    dispose: () => {
      events.push("second");
      detachSecond();
      detachFirst();
    },
  });

  scope.use({
    dispose: () => {
      events.push("third");
    },
  });

  expect(() => scope.dispose()).not.toThrow();
  expect(events).toEqual(["third", "second", "first"]);
});
