import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it } from "vitest";
import { createDiagnostics } from "@vii-labs/core";
import { createAngularField } from "../../src/adapters/angular/index.js";
import { useField } from "../../src/adapters/react/index.js";
import { bindField } from "../../src/adapters/vanilla/index.js";
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

class PerfMockElement {
  value = "";
  tagName = "INPUT";
  type = "text";
  listeners = new Map<string, Set<(e: unknown) => void>>();
  attributes = new Map<string, string>();

  addEventListener(type: string, listener: (e: unknown) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }
  removeEventListener(type: string, listener: (e: unknown) => void): void {
    this.listeners.get(type)?.delete(listener);
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  dispatch(type: string, eventObj: Record<string, unknown> = {}): void {
    const handlers = this.listeners.get(type);
    if (handlers) {
      for (const h of handlers) h({ type, target: this, currentTarget: this, ...eventObj });
    }
  }
  get activeListenerCount(): number {
    let count = 0;
    for (const set of this.listeners.values()) count += set.size;
    return count;
  }
}

describe("P1l Memory, Lifecycle, and Retained Resource Gate", () => {
  it("completes 500 form create/dispose cycles with zero residual subscriptions", () => {
    let residualFailures = 0;
    for (let i = 0; i < 500; i++) {
      const fieldA = createField({ initialValue: "a" });
      const fieldB = createField({ initialValue: "b" });
      const trackerA = trackSignal(fieldA.value);
      const trackerB = trackSignal(fieldB.value);

      const form = createForm({ fields: { a: fieldA, b: fieldB } });
      const unsubA = fieldA.value.subscribe(() => {});
      const unsubForm = form.value.subscribe(() => {});

      fieldA.setValue(`a_${i}`);
      form.validate();

      unsubA();
      unsubForm();
      form.dispose();

      if (trackerA.activeCount() !== 0 || trackerB.activeCount() !== 0) {
        residualFailures++;
      }
    }
    expect(residualFailures).toBe(0);
  });

  it("disposes removed FieldArray items and verifies surviving item identity", () => {
    const item1 = createField({ initialValue: "Item 1" });
    const item2 = createField({ initialValue: "Item 2" });
    const item3 = createField({ initialValue: "Item 3" });
    const array = createFieldArray({ items: [item1, item2, item3] });

    const initialSnapshot = array.items.get();
    const id2 = initialSnapshot[1]!.id;
    const node2 = initialSnapshot[1]!.node;

    array.remove(0);
    const afterRemove = array.items.get();
    expect(afterRemove.length).toBe(2);
    expect(afterRemove[0]!.id).toBe(id2);
    expect(afterRemove[0]!.node).toBe(node2);

    array.append(createField({ initialValue: "Item 4" }));
    expect(array.items.get().length).toBe(3);
    array.dispose();
  });

  it("cancels debounce timers on disposal with zero outstanding timers", () => {
    let scheduled = 0;
    let cancelled = 0;
    const origSet = globalThis.setTimeout;
    const origClear = globalThis.clearTimeout;
    const activeIds = new Set<unknown>();

    globalThis.setTimeout = ((
      fn: (...args: unknown[]) => void,
      ms?: number,
      ...args: unknown[]
    ) => {
      scheduled++;
      const id = origSet(fn, ms, ...args);
      activeIds.add(id);
      return id;
    }) as typeof globalThis.setTimeout;

    globalThis.clearTimeout = ((id: unknown) => {
      if (activeIds.has(id)) {
        cancelled++;
        activeIds.delete(id);
      }
      return origClear(id as Parameters<typeof origClear>[0]);
    }) as typeof globalThis.clearTimeout;

    try {
      const field = createField({
        initialValue: "test",
        debounceMs: 50,
        rules: [() => null],
      });
      field.setValue("new value");
      field.dispose();

      expect(scheduled).toBeGreaterThanOrEqual(1);
      expect(cancelled).toBe(scheduled);
      expect(scheduled - cancelled).toBe(0);
    } finally {
      globalThis.setTimeout = origSet;
      globalThis.clearTimeout = origClear;
    }
  });

  it("verifies production Scope cleanup via Core diagnostics trace", () => {
    const diag = createDiagnostics({ mode: "development" });
    diag.run(() => {
      const f1 = createField({ initialValue: "a" });
      const f2 = createField({ initialValue: "b" });
      const form = createForm({ fields: { a: f1, b: f2 } });
      f1.setValue("mod");
      form.validate();
      form.dispose();
    });
    const trace = diag.exportTrace();
    const createdScopes = trace.events.filter((e) => e.type === "scope.created");
    const disposedScopes = trace.events.filter((e) => e.type === "scope.disposed");
    expect(createdScopes.length).toBeGreaterThan(0);
    expect(disposedScopes.length).toBe(createdScopes.length);
  });

  it("supersedes obsolete async validation generations across 200 rapid mutations", async () => {
    const capturedUnhandled: unknown[] = [];
    const onUnhandled = (err: unknown) => capturedUnhandled.push(err);
    process.on("unhandledRejection", onUnhandled);

    try {
      const observedSignals: AbortSignal[] = [];
      let staleCommits = 0;
      let authoritativeCommits = 0;

      const field = createField({
        initialValue: "init",
        rules: [
          async (val: string, ctx: { signal?: AbortSignal }) => {
            if (ctx.signal) observedSignals.push(ctx.signal);
            await new Promise((r) => setTimeout(r, 10));
            if (ctx.signal?.aborted) return null;
            if (val === "final_value") {
              authoritativeCommits += 1;
            } else {
              staleCommits += 1;
            }
            return null;
          },
        ],
      });

      for (let i = 0; i < 200; i++) {
        field.setValue(i === 199 ? "final_value" : `val_${i}`);
      }

      await field.validate();

      expect(observedSignals.length).toBeGreaterThan(0);
      const abortedSignals = observedSignals.filter((s) => s.aborted);
      expect(abortedSignals.length).toBe(observedSignals.length - 1);
      expect(staleCommits).toBe(0);
      expect(authoritativeCommits).toBe(1);
      expect(capturedUnhandled.length).toBe(0);
      field.dispose();
    } finally {
      process.removeListener("unhandledRejection", onUnhandled);
    }
  });

  it("cleans up resources across repeated submission cancellation cycles", async () => {
    const form = createForm({
      fields: { username: createField({ initialValue: "test" }) },
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
    const freshResult = await form.submit(async () => ({ ok: true }));
    expect(freshResult.status).toBe("succeeded");
    expect(form.submissionStatus.get()).toBe("succeeded");
    form.dispose();
  });

  it("restores active subscriptions and listeners to baseline across repeated adapter cycles", () => {
    const field = createField({ initialValue: "test" });
    const tracker = trackSignal(field.value);

    // React
    function Comp() {
      const binding = useField(field);
      return createElement("div", null, binding.value);
    }
    let renderer: { unmount(): void } | undefined;
    const origErr = console.error;
    console.error = () => {};
    act(() => {
      renderer = create(createElement(Comp));
    });
    expect(tracker.activeCount()).toBeGreaterThan(0);
    act(() => {
      renderer?.unmount();
    });
    expect(tracker.activeCount()).toBe(0);
    console.error = origErr;

    // Vanilla DOM
    const el = new PerfMockElement();
    const binding = bindField(field, el as unknown as HTMLInputElement);
    expect(tracker.activeCount()).toBeGreaterThan(0);
    expect(el.activeListenerCount).toBeGreaterThan(0);
    binding.dispose();
    expect(tracker.activeCount()).toBe(0);
    expect(el.activeListenerCount).toBe(0);

    // Angular
    const ngHandle = createAngularField(field);
    expect(tracker.activeCount()).toBeGreaterThan(0);
    ngHandle.dispose();
    expect(tracker.activeCount()).toBe(0);

    // Vue
    const vueHandle = createVueField(field);
    expect(tracker.activeCount()).toBeGreaterThan(0);
    vueHandle.dispose();
    expect(tracker.activeCount()).toBe(0);

    field.dispose();
  });
});
