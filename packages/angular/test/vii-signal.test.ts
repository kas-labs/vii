import { batch, state } from "@vii/core";
import {
  createEnvironmentInjector,
  computed,
  Injector,
  runInInjectionContext,
  type EnvironmentInjector,
} from "@angular/core";
import { expect, expectTypeOf, test } from "vitest";
import { createViiSignal, viiSignal } from "../src/index.js";

test("viiSignal reads and updates a Core State value", () => {
  const source = state(0);
  const injector = createTestInjector();
  const value = runInInjectionContext(injector, () => viiSignal(source));

  expect(value()).toBe(0);
  source.set(1);
  expect(value()).toBe(1);

  injector.destroy();
});

test("viiSignal applies selector equality before Angular consumers recompute", () => {
  const source = state({ count: 0 });
  const injector = createTestInjector();
  const value = runInInjectionContext(injector, () =>
    viiSignal(source, (current) => current.count % 2),
  );
  let runs = 0;
  const parity = computed(() => {
    runs += 1;
    return value();
  });

  expect(parity()).toBe(0);
  source.set({ count: 2 });
  expect(parity()).toBe(0);
  expect(runs).toBe(1);

  source.set({ count: 3 });
  expect(parity()).toBe(1);
  expect(runs).toBe(2);
  injector.destroy();
});

test("createViiSignal applies custom equality to selected values", () => {
  const source = state({ count: 0 });
  const handle = createViiSignal(source, (current) => ({ parity: current.count % 2 }), {
    equal: (previous, next) => previous.parity === next.parity,
  });
  let runs = 0;
  const parity = computed(() => {
    runs += 1;
    return handle.signal().parity;
  });

  expect(parity()).toBe(0);
  source.set({ count: 2 });
  expect(parity()).toBe(0);
  expect(runs).toBe(1);

  source.set({ count: 3 });
  expect(parity()).toBe(1);
  expect(runs).toBe(2);
  handle.dispose();
});

test("viiSignal preserves Core batch propagation", () => {
  const source = state(0);
  const injector = createTestInjector();
  const value = runInInjectionContext(injector, () => viiSignal(source));

  batch(() => {
    source.set(1);
    source.set(2);
  });

  expect(value()).toBe(2);
  injector.destroy();
});

test("viiSignal cleans its Core subscription with DestroyRef", () => {
  const source = state(0);
  const injector = createTestInjector();
  const value = runInInjectionContext(injector, () => viiSignal(source));

  source.set(1);
  expect(value()).toBe(1);
  injector.destroy();
  source.set(2);

  expect(value()).toBe(1);
});

test("createViiSignal supports explicit cleanup outside an injection context", () => {
  const source = state(0);
  const handle = createViiSignal(source);

  source.set(1);
  expect(handle.signal()).toBe(1);
  handle.dispose();
  source.set(2);

  expect(handle.signal()).toBe(1);
  handle.dispose();
});

test("Angular adapter preserves public type inference", () => {
  function TypeProbe() {
    const source = state({ count: 0 });
    const value = createViiSignal(source).signal;
    const selected = createViiSignal(source, (current) => current.count).signal;

    expectTypeOf(value).toMatchTypeOf<() => { count: number }>();
    expectTypeOf(selected).toMatchTypeOf<() => number>();
    return null;
  }

  expect(TypeProbe).toBeTypeOf("function");
});

function createTestInjector(): EnvironmentInjector {
  return createEnvironmentInjector(
    [],
    Injector.create({ providers: [] }) as unknown as EnvironmentInjector,
  );
}
