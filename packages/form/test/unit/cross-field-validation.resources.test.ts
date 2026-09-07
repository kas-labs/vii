import { describe, expect, it } from "vitest";
import { createField } from "../../src/core/field.js";
import { getInternalNode } from "../../src/core/internal.js";
import type { ValidationRuleContext } from "../../src/validation/types.js";

function trackSignal(signal: { subscribe(fn: (v: unknown) => void): () => void }): {
  activeCount: () => number;
} {
  let subCount = 0;
  let unsubCount = 0;
  const orig = signal.subscribe.bind(signal);
  signal.subscribe = (fn) => {
    subCount++;
    const unsub = orig(fn);
    let done = false;
    return () => {
      if (!done) {
        done = true;
        unsubCount++;
      }
      unsub();
    };
  };
  return { activeCount: () => subCount - unsubCount };
}

describe("P2c: Cross-Field Resource Leaks & Cleanup", () => {
  it("500 create/mutate/dispose cycles verify 0 residual subscriptions and clean references", () => {
    const root = createField<number>({ initialValue: 0 });
    const rootInternal = getInternalNode(root)!;
    const tracker = trackSignal(root.value);

    for (let i = 0; i < 500; i++) {
      const dep = createField<number>({
        initialValue: i,
        dependencies: [root],
        rules: [
          (_val: number, ctx: ValidationRuleContext) => {
            ctx.get(root);
            return null;
          },
        ],
      });

      // Mutate root -> triggers wave to dep
      root.setValue(i);

      // Verify dep is registered as dependent of root
      expect(rootInternal.dependents?.has(dep)).toBe(true);

      // Dispose dep
      dep.dispose();

      // Verify dep has been removed from root's dependents Set
      expect(rootInternal.dependents?.has(dep)).toBe(false);
    }

    // After all 500 cycles, root has 0 dependents left
    expect(rootInternal.dependents?.size ?? 0).toBe(0);
    expect(tracker.activeCount()).toBe(0);

    root.dispose();
  });
});
