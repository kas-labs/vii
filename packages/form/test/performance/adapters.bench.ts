import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { createAngularField } from "../../src/adapters/angular/index.js";
import { useField } from "../../src/adapters/react/index.js";
import { bindField } from "../../src/adapters/vanilla/index.js";
import { createVueField } from "../../src/adapters/vue/index.js";
import { createField } from "../../src/core/field.js";
import type { FieldState } from "../../src/core/types.js";
import { benchmarkWithSetup, type BenchmarkResult } from "./helpers.js";

// Ensure React act environment is set
const reactGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
reactGlobal.IS_REACT_ACT_ENVIRONMENT = true;

class BenchmarkMockElement {
  value = "";
  tagName = "INPUT";
  nodeName = "INPUT";
  type = "text";
  id = "bench-input";
  private attributes = new Map<string, string>();
  private listeners = new Map<string, Set<(event: unknown) => void>>();

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }
  addEventListener(event: string, handler: (event: unknown) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }
  removeEventListener(event: string, handler: (event: unknown) => void): void {
    this.listeners.get(event)?.delete(handler);
  }
  dispatch(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((fn) => fn(data));
  }
}

export interface AdapterBenchmarkSuiteResults {
  reactBridge: BenchmarkResult;
  vanillaBridge: BenchmarkResult;
  angularBridge: BenchmarkResult;
  vueBridge: BenchmarkResult;
}

export function runAdapterBenchmarks(): AdapterBenchmarkSuiteResults {
  // 1. React Adapter Bridge
  function ReactFieldConsumer({ field }: { field: FieldState<string> }) {
    const binding = useField(field);
    return createElement("div", null, binding.value);
  }

  const reactBridge = benchmarkWithSetup({
    name: "react_bridge_lifecycle",
    iterations: 100,
    warmup: 10,
    setup: () => {
      const field = createField({ initialValue: "hello" });
      return { field };
    },
    operation: ({ field }) => {
      let renderer: { unmount(): void } | undefined;
      act(() => {
        renderer = create(createElement(ReactFieldConsumer, { field }));
      });
      act(() => {
        field.setValue("world");
      });
      act(() => {
        renderer?.unmount();
      });
    },
    teardown: ({ field }) => {
      field.dispose();
    },
  });

  // 2. Vanilla Adapter Bridge
  const vanillaBridge = benchmarkWithSetup({
    name: "vanilla_bridge_lifecycle",
    iterations: 100,
    warmup: 10,
    setup: () => {
      const field = createField({ initialValue: "alpha" });
      const el = new BenchmarkMockElement();
      return { field, el };
    },
    operation: ({ field, el }) => {
      const binding = bindField(field, el as unknown as HTMLInputElement);
      el.value = "beta";
      el.dispatch("input", { target: el });
      binding.dispose();
    },
    teardown: ({ field }) => {
      field.dispose();
    },
  });

  // 3. Angular Adapter Bridge
  const angularBridge = benchmarkWithSetup({
    name: "angular_bridge_lifecycle",
    iterations: 100,
    warmup: 10,
    setup: () => {
      const field = createField({ initialValue: "start" });
      return { field };
    },
    operation: ({ field }) => {
      const handle = createAngularField(field);
      field.setValue("next");
      void handle.value();
      handle.dispose();
    },
    teardown: ({ field }) => {
      field.dispose();
    },
  });

  // 4. Vue Adapter Bridge
  const vueBridge = benchmarkWithSetup({
    name: "vue_bridge_lifecycle",
    iterations: 100,
    warmup: 10,
    setup: () => {
      const field = createField({ initialValue: "vue_start" });
      return { field };
    },
    operation: ({ field }) => {
      const handle = createVueField(field);
      field.setValue("vue_next");
      void handle.value.value;
      handle.dispose();
    },
    teardown: ({ field }) => {
      field.dispose();
    },
  });

  return {
    reactBridge,
    vanillaBridge,
    angularBridge,
    vueBridge,
  };
}
