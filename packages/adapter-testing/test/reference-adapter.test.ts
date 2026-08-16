import { batch, state } from "@vii-labs/core";
import { defineAdapterComplianceSuite, type AdapterComplianceFixture } from "../src/index.js";
import { expectTypeOf, test } from "vitest";

interface ReferenceState {
  count: number;
  label: string;
}

const scenario = {
  initial: { count: 0, label: "idle" },
  update: (current: ReferenceState) => ({ ...current, count: current.count + 1 }),
  sameSelectionUpdate: (current: ReferenceState) => ({ ...current, count: current.count + 2 }),
  select: (current: ReferenceState) => current.count % 2,
  equality: Object.is,
};

defineAdapterComplianceSuite("Core reference", scenario, createReferenceAdapter);

test("reference adapter preserves snapshot and selected-value inference", () => {
  const fixture = createReferenceAdapter(scenario.initial);
  const selected = fixture.select(scenario.select, scenario.equality);

  expectTypeOf(fixture.getSnapshot()).toEqualTypeOf<ReferenceState>();
  expectTypeOf(selected.getSnapshot()).toEqualTypeOf<number>();
  fixture.dispose();
});

function createReferenceAdapter(initial: ReferenceState): AdapterComplianceFixture<ReferenceState> {
  const source = state(initial);
  const subscriptions = new Set<() => void>();
  let disposed = false;

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("Reference adapter is disposed");
    }
  };

  const trackSubscription = (listener: () => void): (() => void) => {
    const sourceUnsubscribe = source.subscribe(listener);
    let active = true;
    const unsubscribe = (): void => {
      if (!active) {
        return;
      }
      active = false;
      subscriptions.delete(unsubscribe);
      sourceUnsubscribe();
    };
    subscriptions.add(unsubscribe);
    return unsubscribe;
  };

  return {
    getSnapshot: () => {
      assertActive();
      return source.get();
    },
    subscribe: (listener) => {
      assertActive();
      return trackSubscription(listener);
    },
    select: (selector, equality = Object.is) => {
      let previous = selector(source.get());
      return {
        getSnapshot: () => {
          assertActive();
          return selector(source.get());
        },
        subscribe: (listener) => {
          assertActive();
          return trackSubscription(() => {
            const next = selector(source.get());
            if (!equality(previous, next)) {
              previous = next;
              listener();
            }
          });
        },
      };
    },
    update: (updater) => {
      assertActive();
      source.update(updater);
    },
    batch: (work) => {
      assertActive();
      batch(work);
    },
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      for (const unsubscribe of [...subscriptions]) {
        unsubscribe();
      }
    },
    getServerSnapshot: () => {
      assertActive();
      return source.get();
    },
  };
}
