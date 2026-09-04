import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const FORM_DIST = resolve(REPO_ROOT, "packages/form/dist");
const reactPath = resolve(REPO_ROOT, "packages/form/node_modules/react/index.js");
const reactRendererPath = resolve(
  REPO_ROOT,
  "packages/form/node_modules/react-test-renderer/index.js",
);

const { createElement } = await import(pathToFileURL(reactPath).href);
const { act, create } = await import(pathToFileURL(reactRendererPath).href);

const { createDiagnostics } = await import(
  pathToFileURL(resolve(REPO_ROOT, "packages/core/dist/index.js")).href
);
const { inspectTrace } = await import(
  pathToFileURL(resolve(REPO_ROOT, "packages/cli-core/dist/index.js")).href
);

const { createField, createForm } = await import(pathToFileURL(`${FORM_DIST}/index.js`).href);
const { useField } = await import(pathToFileURL(`${FORM_DIST}/adapters/react/index.js`).href);
const { bindField } = await import(pathToFileURL(`${FORM_DIST}/adapters/vanilla/index.js`).href);
const { createAngularField } = await import(
  pathToFileURL(`${FORM_DIST}/adapters/angular/index.js`).href
);
const { createVueField } = await import(pathToFileURL(`${FORM_DIST}/adapters/vue/index.js`).href);

function trackSignal(signal) {
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
  listeners = new Map();
  attributes = new Map();

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }
  removeEventListener(type, listener) {
    if (this.listeners.has(type)) this.listeners.get(type).delete(listener);
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  dispatch(type, eventObj = {}) {
    const handlers = this.listeners.get(type);
    if (handlers) {
      for (const h of handlers) h({ type, target: this, currentTarget: this, ...eventObj });
    }
  }
  get activeListenerCount() {
    let count = 0;
    for (const set of this.listeners.values()) count += set.size;
    return count;
  }
}

export async function measureFormMemory() {
  // 1. 500 Create/Dispose Cycles with per-cycle instrumentation
  let cyclesWithResidualSubscriptions = 0;
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
      cyclesWithResidualSubscriptions++;
    }
  }

  // 2. Core Scope Diagnostics & Retained Scope Count
  const diag = createDiagnostics({ mode: "development" });
  diag.run(() => {
    const f1 = createField({ initialValue: "a" });
    const f2 = createField({ initialValue: "b" });
    const form = createForm({ fields: { a: f1, b: f2 } });
    f1.setValue("mod");
    form.validate();
    form.dispose();
  });
  const trace = inspectTrace(diag.exportTrace());
  const activeScopes = trace.scopeGraph.scopes.filter((s) => s.status === "active");

  // 3. Debounce Timer Tracking
  let scheduledTimers = 0;
  let cancelledTimers = 0;
  const origSet = globalThis.setTimeout;
  const origClear = globalThis.clearTimeout;
  const activeTimerIds = new Set();

  globalThis.setTimeout = (fn, ms, ...args) => {
    scheduledTimers++;
    const id = origSet(fn, ms, ...args);
    activeTimerIds.add(id);
    return id;
  };
  globalThis.clearTimeout = (id) => {
    if (activeTimerIds.has(id)) {
      cancelledTimers++;
      activeTimerIds.delete(id);
    }
    return origClear(id);
  };

  const timerField = createField({
    initialValue: "init",
    debounceMs: 50,
    rules: [(v) => (v.length > 0 ? null : { code: "req", message: "req" })],
  });
  timerField.setValue("mutated");
  timerField.dispose();

  globalThis.setTimeout = origSet;
  globalThis.clearTimeout = origClear;

  // 4. Async Validation Stress & Production AbortSignal
  const capturedUnhandled = [];
  const onUnhandled = (err) => capturedUnhandled.push(err);
  process.on("unhandledRejection", onUnhandled);

  const observedSignals = [];
  let authoritativeCommits = 0;
  let staleCommits = 0;

  const asyncField = createField({
    initialValue: "init",
    rules: [
      async (val, ctx) => {
        if (ctx.signal) observedSignals.push(ctx.signal);
        await new Promise((r) => setTimeout(r, 10));
        if (ctx.signal?.aborted) return null;
        if (val === "final_value") {
          authoritativeCommits++;
        } else {
          staleCommits++;
        }
        return null;
      },
    ],
  });

  for (let i = 0; i < 200; i++) {
    asyncField.setValue(i === 199 ? "final_value" : `val_${i}`);
  }

  await asyncField.validate();
  asyncField.dispose();
  process.removeListener("unhandledRejection", onUnhandled);

  const abortedSignals = observedSignals.filter((s) => s.aborted);

  // 5. Repeated Adapter Cycles (100 each)
  let reactResiduals = 0;
  const origError = console.error;
  console.error = () => {};
  for (let i = 0; i < 100; i++) {
    const f = createField({ initialValue: "react" });
    const t = trackSignal(f.value);
    function Comp() {
      const b = useField(f);
      return createElement("div", null, b.value);
    }
    let renderer;
    act(() => {
      renderer = create(createElement(Comp));
    });
    act(() => {
      f.setValue("mod");
    });
    act(() => {
      renderer.unmount();
    });
    if (t.activeCount() !== 0) reactResiduals++;
    f.dispose();
  }
  console.error = origError;

  let vanillaResiduals = 0;
  let vanillaListenerResiduals = 0;
  for (let i = 0; i < 100; i++) {
    const f = createField({ initialValue: "vanilla" });
    const el = new PerfMockElement();
    const t = trackSignal(f.value);
    const binding = bindField(f, el);
    el.value = "mod";
    el.dispatch("input");
    binding.dispose();
    if (t.activeCount() !== 0) vanillaResiduals++;
    if (el.activeListenerCount !== 0) vanillaListenerResiduals++;
    f.dispose();
  }

  let angularResiduals = 0;
  for (let i = 0; i < 100; i++) {
    const f = createField({ initialValue: "angular" });
    const t = trackSignal(f.value);
    const handle = createAngularField(f);
    handle.dispose();
    if (t.activeCount() !== 0) angularResiduals++;
    f.dispose();
  }

  let vueResiduals = 0;
  for (let i = 0; i < 100; i++) {
    const f = createField({ initialValue: "vue" });
    const t = trackSignal(f.value);
    const handle = createVueField(f);
    handle.dispose();
    if (t.activeCount() !== 0) vueResiduals++;
    f.dispose();
  }

  return {
    cyclesChecked: 500,
    cyclesWithResidualSubscriptions,
    retainedSubscriptions: cyclesWithResidualSubscriptions,
    retainedScopes: activeScopes.length,
    retainedTimers: scheduledTimers - cancelledTimers,
    staleCommits,
    authoritativeCommits,
    unhandledRejections: capturedUnhandled.length,
    scopeMeasurementMethod: "core-diagnostics-trace",
    timerMeasurementMethod: "debounce-timer-tracking",
    scheduledFormTimers: scheduledTimers,
    cancelledFormTimers: cancelledTimers,
    outstandingFormTimers: scheduledTimers - cancelledTimers,
    asyncMutations: 200,
    observedProductionSignals: observedSignals.length,
    abortedProductionSignals: abortedSignals.length,
    adapterCycles: {
      react: { cycles: 100, residualSubscriptions: reactResiduals },
      vanilla: {
        cycles: 100,
        residualSubscriptions: vanillaResiduals,
        residualListeners: vanillaListenerResiduals,
      },
      angular: { cycles: 100, residualSubscriptions: angularResiduals },
      vue: { cycles: 100, residualSubscriptions: vueResiduals },
    },
  };
}
