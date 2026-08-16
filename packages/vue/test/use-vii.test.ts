import { batch, state } from "@vii-labs/core";
import { effect, effectScope, isReactive, isReadonly } from "vue";
import { expect, expectTypeOf, test } from "vitest";
import { createViiRef, useVii } from "../src/index.js";

test("useVii exposes the initial Core value and updates in a Vue scope", () => {
  const source = state(0);
  const scope = effectScope();
  const observed: number[] = [];

  scope.run(() => {
    const count = useVii(source);
    effect(() => observed.push(count.value));
  });

  source.set(1);

  expect(observed).toEqual([0, 1]);
  scope.stop();
});

test("useVii applies selector equality before Vue effects rerun", () => {
  const source = state({ count: 0 });
  const scope = effectScope();
  const observed: number[] = [];

  scope.run(() => {
    const parity = useVii(source, (value) => value.count % 2, Object.is);
    effect(() => observed.push(parity.value));
  });

  source.set({ count: 2 });
  expect(observed).toEqual([0]);

  source.set({ count: 3 });
  expect(observed).toEqual([0, 1]);
  scope.stop();
});

test("useVii accepts custom equality for selected values", () => {
  const source = state({ count: 0 });
  const scope = effectScope();
  const observed: number[] = [];

  scope.run(() => {
    const selected = useVii(
      source,
      (value) => ({ parity: value.count % 2 }),
      (previous, next) => previous.parity === next.parity,
    );
    effect(() => observed.push(selected.value.parity));
  });

  source.set({ count: 2 });
  expect(observed).toEqual([0]);

  source.set({ count: 3 });
  expect(observed).toEqual([0, 1]);
  scope.stop();
});

test("useVii preserves Core batch propagation", () => {
  const source = state(0);
  const scope = effectScope();
  const observed: number[] = [];

  scope.run(() => {
    const count = useVii(source);
    effect(() => observed.push(count.value));
  });

  batch(() => {
    source.set(1);
    source.set(2);
  });

  expect(observed).toEqual([0, 2]);
  scope.stop();
});

test("useVii exposes a readonly shallow ref", () => {
  const nested = { label: "original" };
  const source = state(nested);
  const scope = effectScope();
  let count!: ReturnType<typeof useVii<typeof nested>>;

  scope.run(() => {
    count = useVii(source);
  });

  expect(isReadonly(count)).toBe(true);
  expect(isReactive(count.value)).toBe(false);
  expect(count.value).toBe(nested);
  scope.stop();
});

test("useVii disposes the Core subscription with its Vue scope", () => {
  const source = state(0);
  let activeSubscriptions = 0;
  const store = {
    get: source.get,
    subscribe(listener: (value: number) => void) {
      activeSubscriptions += 1;
      const unsubscribe = source.subscribe(listener);
      return () => {
        activeSubscriptions -= 1;
        unsubscribe();
      };
    },
  };
  const scope = effectScope();

  scope.run(() => {
    useVii(store);
  });

  expect(activeSubscriptions).toBe(1);
  scope.stop();
  expect(activeSubscriptions).toBe(0);
});

test("createViiRef supports explicit disposal outside a Vue scope", () => {
  const source = state(0);
  const handle = createViiRef(source);

  source.set(1);
  expect(handle.ref.value).toBe(1);

  handle.dispose();
  source.set(2);
  expect(handle.ref.value).toBe(1);
  handle.dispose();
});

test("useVii preserves public type inference", () => {
  const source = state({ count: 0 });
  const snapshot = useVii(source);
  const selected = useVii(source, (value) => value.count);

  expectTypeOf(snapshot.value).toEqualTypeOf<{ count: number }>();
  expectTypeOf(selected.value).toEqualTypeOf<number>();
});
