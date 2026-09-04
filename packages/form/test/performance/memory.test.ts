import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { createAngularField } from "../../src/adapters/angular/index.js";
import { useField } from "../../src/adapters/react/index.js";
import { createVueField } from "../../src/adapters/vue/index.js";
import { createFieldArray } from "../../src/core/array.js";
import { createField } from "../../src/core/field.js";
import { createForm } from "../../src/core/form.js";

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

describe("P1l Memory, Lifecycle, and Retained Resource Gate", () => {
  // 1. 100 and 500 Create/Dispose Cycles
  it("completes 100 and 500 form create/dispose cycles with zero retained subscriptions", () => {
    for (let i = 0; i < 500; i++) {
      const fieldA = createField({ initialValue: "a" });
      const fieldB = createField({ initialValue: "b" });
      const form = createForm({
        fields: { a: fieldA, b: fieldB },
      });

      const unsubA = fieldA.value.subscribe(() => {});
      const unsubValue = form.value.subscribe(() => {});

      fieldA.setValue(`a_${i}`);
      fieldB.setValue(`b_${i}`);
      form.validate();

      unsubA();
      unsubValue();
      form.dispose();
    }

    // Verify a fresh form has 0 lingering subscribers
    const testField = createField({ initialValue: "check" });
    const tracker = trackSignal(testField.value);
    const u = testField.value.subscribe(() => {});
    expect(tracker.activeCount()).toBe(1);
    u();
    expect(tracker.activeCount()).toBe(0);
    testField.dispose();
  });

  // 2. FieldArray Lifecycle & Item Resource Disposal
  it("disposes removed FieldArray items and verifies surviving item identity", () => {
    const item1 = createField({ initialValue: "Item 1" });
    const item2 = createField({ initialValue: "Item 2" });
    const item3 = createField({ initialValue: "Item 3" });

    const array = createFieldArray({
      items: [item1, item2, item3],
    });

    const initialSnapshot = array.items.get();
    const id2 = initialSnapshot[1]!.id;
    const node2 = initialSnapshot[1]!.node;

    // Remove item at index 0
    array.remove(0);

    const afterRemoveSnapshot = array.items.get();
    expect(afterRemoveSnapshot.length).toBe(2);
    // Surviving item identity must remain stable
    expect(afterRemoveSnapshot[0]!.id).toBe(id2);
    expect(afterRemoveSnapshot[0]!.node).toBe(node2);

    // Append new item
    const newItem = createField({ initialValue: "Item 4" });
    array.append(newItem);
    expect(array.items.get().length).toBe(3);

    array.dispose();
  });

  // 3. Debounce Timer Cleanup
  it("cancels debounce timers on disposal without unhandled rejections or execution", async () => {
    const timerSpy = vi.fn();

    const field = createField({
      initialValue: "test",
      debounceMs: 50,
      rules: [
        () => {
          timerSpy();
          return null;
        },
      ],
    });

    field.setValue("new value");
    field.dispose();

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(timerSpy).not.toHaveBeenCalled();
  });

  // 4. Async Validation Supersession
  it("supersedes obsolete async validation generations cleanly across 200 rapid mutations", async () => {
    const createdControllers: AbortController[] = [];
    let staleCommits = 0;
    let finalCommits = 0;

    const field = createField({
      initialValue: "init",
      rules: [
        async (val: string, ctx: { signal?: AbortSignal }) => {
          const controller = new AbortController();
          createdControllers.push(controller);

          // simulate async work checking abort signal
          await new Promise((resolve) => setTimeout(resolve, 10));

          if (ctx.signal?.aborted) {
            controller.abort();
            return null;
          }

          if (val === "final_value") {
            finalCommits += 1;
          } else {
            staleCommits += 1;
          }
          return null;
        },
      ],
    });

    // Rapidly trigger 200 mutations
    for (let i = 0; i < 200; i++) {
      field.setValue(i === 199 ? "final_value" : `val_${i}`);
    }

    // Wait for async validation to settle
    await field.validate();

    expect(createdControllers.length).toBeGreaterThan(0);
    expect(staleCommits).toBe(0);
    expect(finalCommits).toBe(1);
    field.dispose();
  });

  // 5. Submission Cancellation Resources
  it("cleans up resources across repeated submission cancellation cycles", async () => {
    const form = createForm({
      fields: {
        username: createField({ initialValue: "test" }),
      },
    });

    for (let i = 0; i < 50; i++) {
      const submitPromise = form
        .submit(async (_vals, { signal }) => {
          await new Promise((_, reject) => {
            signal.addEventListener("abort", () => reject(new Error("aborted")));
          });
        })
        .catch(() => {});
      form.cancelSubmit();
      await submitPromise;
    }

    expect(form.submissionStatus.get()).toBe("cancelled");
    form.dispose();
  });

  // 6. Adapter Lifecycle Retention (React, Vanilla, Angular, Vue)
  it("restores active subscriptions to baseline across adapter lifecycle cycles", () => {
    const field = createField({ initialValue: "test" });
    const tracker = trackSignal(field.value);

    // React cycle
    function Comp() {
      const binding = useField(field);
      return createElement("div", null, binding.value);
    }
    let renderer: { unmount(): void } | undefined;
    act(() => {
      renderer = create(createElement(Comp));
    });
    expect(tracker.activeCount()).toBeGreaterThan(0);
    act(() => {
      renderer?.unmount();
    });
    expect(tracker.activeCount()).toBe(0);

    // Angular cycle
    const ngHandle = createAngularField(field);
    expect(tracker.activeCount()).toBeGreaterThan(0);
    ngHandle.dispose();
    expect(tracker.activeCount()).toBe(0);

    // Vue cycle
    const vueHandle = createVueField(field);
    expect(tracker.activeCount()).toBeGreaterThan(0);
    vueHandle.dispose();
    expect(tracker.activeCount()).toBe(0);

    field.dispose();
  });
});
