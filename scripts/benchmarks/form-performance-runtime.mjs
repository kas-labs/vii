import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

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

const { createField, createFieldGroup, createFieldArray, createForm, createNumberParser } =
  await import(pathToFileURL(`${FORM_DIST}/index.js`).href);

const { useField } = await import(pathToFileURL(`${FORM_DIST}/adapters/react/index.js`).href);
const { bindField } = await import(pathToFileURL(`${FORM_DIST}/adapters/vanilla/index.js`).href);
const { createAngularField } = await import(
  pathToFileURL(`${FORM_DIST}/adapters/angular/index.js`).href
);
const { createVueField } = await import(pathToFileURL(`${FORM_DIST}/adapters/vue/index.js`).href);

// Mock Element for Vanilla Adapter
class PerfMockElement {
  value = "";
  tagName = "INPUT";
  nodeName = "INPUT";
  type = "text";
  id = "perf-input";
  listeners = new Map();
  getAttribute() {
    return null;
  }
  setAttribute() {}
  removeAttribute() {}
  hasAttribute() {
    return false;
  }
  addEventListener(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
  }
  removeEventListener(event, fn) {
    this.listeners.get(event)?.delete(fn);
  }
  dispatch(event, data) {
    this.listeners.get(event)?.forEach((fn) => fn(data));
  }
}

function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 !== 0 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function round(val, digits = 3) {
  return Number(val.toFixed(digits));
}

function benchBatch(name, iterations, batchSize, warmup, op) {
  for (let w = 0; w < warmup * batchSize; w++) op(w);
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    for (let b = 0; b < batchSize; b++) op(i * batchSize + b);
    samples.push((performance.now() - start) / batchSize);
  }
  const medMs = median(samples);
  return {
    name,
    medianMs: round(medMs, 6),
    medianUs: round(medMs * 1000, 3),
  };
}

function bench(name, iterations, warmup, setup, op, teardown) {
  for (let w = 0; w < warmup; w++) {
    const ctx = setup();
    op(ctx);
    teardown?.(ctx);
  }
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const ctx = setup();
    const start = performance.now();
    op(ctx);
    samples.push(performance.now() - start);
    teardown?.(ctx);
  }
  const medMs = median(samples);
  return {
    name,
    medianMs: round(medMs, 4),
    medianUs: round(medMs * 1000, 2),
  };
}

async function benchAsync(name, iterations, warmup, setup, op, teardown) {
  for (let w = 0; w < warmup; w++) {
    const ctx = await setup();
    await op(ctx);
    await teardown?.(ctx);
  }
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const ctx = await setup();
    const start = performance.now();
    await op(ctx);
    samples.push(performance.now() - start);
    await teardown?.(ctx);
  }
  const medMs = median(samples);
  return {
    name,
    medianMs: round(medMs, 4),
    medianUs: round(medMs * 1000, 2),
  };
}

function createFormFixture(count, withRules = false, counter = null) {
  const fields = {};
  for (let i = 0; i < count; i++) {
    const key = `field_${i}`;
    const rules = [];
    if (withRules) {
      rules.push((val) => {
        if (counter) counter.count += 1;
        return val ? null : { code: "req", message: "req" };
      });
    }
    fields[key] = createField({ initialValue: `val_${i}`, rules });
  }
  return { form: createForm({ fields }), fields };
}

function createNestedFormFixture() {
  const addressItems = [];
  for (let i = 0; i < 10; i++) {
    addressItems.push(
      createFieldGroup({
        fields: {
          street: createField({ initialValue: `Street ${i}` }),
          suite: createField({ initialValue: `Apt ${i}` }),
          city: createField({ initialValue: "Berlin" }),
          state: createField({ initialValue: "BE" }),
          zip: createField({ initialValue: `1000${i}` }),
          country: createField({ initialValue: "DE" }),
        },
      }),
    );
  }
  const historyItems = [];
  for (let i = 0; i < 10; i++) {
    historyItems.push(
      createFieldGroup({
        fields: {
          company: createField({ initialValue: `Company ${i}` }),
          role: createField({ initialValue: "Engineer" }),
          years: createField({ initialValue: `${i + 1}` }),
        },
      }),
    );
  }
  const form = createForm({
    fields: {
      profile: createFieldGroup({
        fields: {
          firstName: createField({ initialValue: "Ada" }),
          lastName: createField({ initialValue: "Lovelace" }),
          email: createField({ initialValue: "ada@example.com" }),
          title: createField({ initialValue: "Analyst" }),
          division: createField({ initialValue: "Eng" }),
        },
      }),
      preferences: createFieldGroup({
        fields: {
          notifications: createField({ initialValue: "enabled" }),
          theme: createField({ initialValue: "dark" }),
        },
      }),
      addresses: createFieldArray({ items: addressItems }),
      history: createFieldArray({ items: historyItems }),
    },
  });
  return { form, leafCount: 97 };
}

export async function measureFormRuntime() {
  const sizes = [10, 100, 500, 1000];

  // 1. Construction
  const construction = {};
  for (const s of sizes) {
    construction[s] = bench(
      `construct_${s}`,
      30,
      5,
      () => ({}),
      () => {
        const { form } = createFormFixture(s);
        form.dispose();
      },
    );
  }
  construction["nested_97"] = bench(
    "construct_nested_97",
    30,
    5,
    () => ({}),
    () => {
      const { form } = createNestedFormFixture();
      form.dispose();
    },
  );

  // 2. Leaf-Only Mutation
  let siblingNotifications = 0;
  const leafMutation = {};
  for (const s of sizes) {
    const { form, fields } = createFormFixture(s);
    const target = fields.field_0;
    const sibling = fields[`field_${s - 1}`];
    let siblingCalls = 0;
    const u1 = target.value.subscribe(() => {});
    const u2 = sibling.value.subscribe(() => {
      siblingCalls++;
    });
    leafMutation[s] = benchBatch(`leaf_${s}`, 100, 50, 5, (step) => {
      target.setValue(step % 2 === 0 ? "alpha" : "beta");
    });
    u1();
    u2();
    siblingNotifications += siblingCalls;
    form.dispose();
  }

  // 3. Aggregate-Consumer Mutation
  const aggregateMutation = {};
  for (const s of sizes) {
    const { form, fields } = createFormFixture(s);
    const target = fields.field_0;
    const u1 = form.value.subscribe(() => {});
    const u2 = form.dirty.subscribe(() => {});
    const u3 = form.issues.subscribe(() => {});
    aggregateMutation[s] = benchBatch(`agg_${s}`, 80, 20, 5, (step) => {
      target.setValue(step % 2 === 0 ? "apple" : "banana");
      void form.value.get();
      void form.dirty.get();
      void form.issues.get();
    });
    u1();
    u2();
    u3();
    form.dispose();
  }

  // 4. Sync Validation
  const validation = {};
  const validationCounters = {};
  for (const s of sizes) {
    const counter = { count: 0 };
    const { form } = createFormFixture(s, true, counter);
    validation[s] = bench(
      `val_${s}`,
      40,
      5,
      () => form,
      (f) => {
        f.validate();
      },
    );
    validationCounters[s] = counter.count;
    form.dispose();
  }

  // 5. FieldArray Operations (10, 100, 1000 items)
  const fieldArray = {};
  for (const count of [10, 100, 1000]) {
    fieldArray[`push_${count}`] = bench(
      `push_${count}`,
      40,
      5,
      () => {
        const items = Array.from({ length: count }, (_, i) =>
          createField({ initialValue: `i_${i}` }),
        );
        const arr = createFieldArray({ items });
        const pushed = createField({ initialValue: "pushed" });
        return { arr, pushed };
      },
      ({ arr, pushed }) => {
        arr.append(pushed);
      },
      ({ arr }) => {
        arr.dispose();
      },
    );

    fieldArray[`insert_${count}`] = bench(
      `insert_${count}`,
      40,
      5,
      () => {
        const items = Array.from({ length: count }, (_, i) =>
          createField({ initialValue: `i_${i}` }),
        );
        const arr = createFieldArray({ items });
        const inserted = createField({ initialValue: "inserted" });
        return { arr, inserted };
      },
      ({ arr, inserted }) => {
        arr.insert(0, inserted);
      },
      ({ arr }) => {
        arr.dispose();
      },
    );

    fieldArray[`remove_${count}`] = bench(
      `remove_${count}`,
      40,
      5,
      () => {
        const items = Array.from({ length: count }, (_, i) =>
          createField({ initialValue: `i_${i}` }),
        );
        return { arr: createFieldArray({ items }) };
      },
      ({ arr }) => {
        arr.remove(0);
      },
      ({ arr }) => {
        arr.dispose();
      },
    );

    fieldArray[`swap_${count}`] = bench(
      `swap_${count}`,
      40,
      5,
      () => {
        const items = Array.from({ length: count }, (_, i) =>
          createField({ initialValue: `i_${i}` }),
        );
        return { arr: createFieldArray({ items }) };
      },
      ({ arr }) => {
        arr.swap(0, 1);
      },
      ({ arr }) => {
        arr.dispose();
      },
    );

    fieldArray[`move_${count}`] = bench(
      `move_${count}`,
      40,
      5,
      () => {
        const items = Array.from({ length: count }, (_, i) =>
          createField({ initialValue: `i_${i}` }),
        );
        return { arr: createFieldArray({ items }) };
      },
      ({ arr }) => {
        arr.move(count - 1, 0);
      },
      ({ arr }) => {
        arr.dispose();
      },
    );
  }

  // Stable identity verification
  const testArr = createFieldArray({
    items: [createField({ initialValue: "a" }), createField({ initialValue: "b" })],
  });
  const id0 = testArr.items.get()[0].id;
  const id1 = testArr.items.get()[1].id;
  testArr.swap(0, 1);
  const identityVerified = testArr.items.get()[0].id === id1 && testArr.items.get()[1].id === id0;
  testArr.dispose();

  // 6. Submission
  const submitSuccess = await benchAsync(
    "submit_success",
    50,
    5,
    () => {
      return createForm({ fields: { a: createField({ initialValue: "ok" }) } });
    },
    async (f) => {
      await f.submit(async () => ({ ok: true }));
    },
    (f) => f.dispose(),
  );

  const submitBlocked = await benchAsync(
    "submit_blocked",
    50,
    5,
    () => {
      return createForm({
        fields: {
          a: createField({ initialValue: "", rules: [(v) => (v ? null : { code: "req" })] }),
        },
      });
    },
    async (f) => {
      await f.submit(async () => ({ ok: true }));
    },
    (f) => f.dispose(),
  );

  const submitFailure = await benchAsync(
    "submit_failure",
    50,
    5,
    () => {
      return createForm({ fields: { a: createField({ initialValue: "ok" }) } });
    },
    async (f) => {
      try {
        await f.submit(async () => {
          throw new Error("fail");
        });
      } catch {
        // expected action rejection
      }
    },
    (f) => f.dispose(),
  );

  const submitCancellation = await benchAsync(
    "submit_cancellation",
    30,
    3,
    () => {
      return createForm({
        fields: {
          a: createField({
            initialValue: "ok",
            rules: [
              async () => {
                await new Promise((r) => setTimeout(r, 5));
                return null;
              },
            ],
          }),
        },
      });
    },
    async (f) => {
      const p = f.submit(async () => ({ ok: true }));
      f.fields.a.setValue("cancel_edit");
      await p;
    },
    (f) => f.dispose(),
  );

  // 7. Server Issue Routing (10, 100, 1000)
  const serverIssues = {};
  for (const count of [10, 100, 1000]) {
    const { form } = createNestedFormFixture();
    const issues = Array.from({ length: count }, (_, i) => ({
      code: `err_${i}`,
      message: `Error ${i}`,
      path: ["profile", "firstName"],
    }));
    serverIssues[count] = await benchAsync(
      `route_${count}`,
      15,
      2,
      () => form,
      async (f) => {
        await f.submit(async () => ({ ok: false, issues }));
      },
    );
    form.dispose();
  }

  // 8. Parser Performance
  const pf = createField({ initialValue: 0, initialRawValue: "0", parser: createNumberParser() });
  const parserMutation = {
    validRaw: benchBatch("parser_valid", 100, 50, 5, (step) => {
      pf.setRawValue(step % 2 === 0 ? "42" : "100");
    }),
    invalidRaw: benchBatch("parser_invalid", 100, 50, 5, (step) => {
      pf.setRawValue(step % 2 === 0 ? "abc" : "xyz");
    }),
    recovery: benchBatch("parser_recovery", 100, 50, 5, (step) => {
      pf.setRawValue(step % 2 === 0 ? "xyz" : "789");
    }),
  };
  pf.dispose();

  // 9. Adapter Bridge Overhead
  function ReactFieldComp({ field }) {
    const binding = useField(field);
    return createElement("div", null, binding.value);
  }
  const origError = console.error;
  const origWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};
  const reactBridge = bench(
    "react_bridge",
    50,
    5,
    () => {
      return { field: createField({ initialValue: "react" }) };
    },
    ({ field }) => {
      let renderer;
      act(() => {
        renderer = create(createElement(ReactFieldComp, { field }));
      });
      act(() => {
        field.setValue("react_updated");
      });
      act(() => {
        renderer.unmount();
      });
    },
    ({ field }) => field.dispose(),
  );
  console.error = origError;
  console.warn = origWarn;

  const vanillaBridge = bench(
    "vanilla_bridge",
    50,
    5,
    () => {
      return { field: createField({ initialValue: "vanilla" }), el: new PerfMockElement() };
    },
    ({ field, el }) => {
      const binding = bindField(field, el);
      el.value = "vanilla_updated";
      el.dispatch("input", { target: el });
      binding.dispose();
    },
    ({ field }) => field.dispose(),
  );

  const angularBridge = bench(
    "angular_bridge",
    50,
    5,
    () => {
      return { field: createField({ initialValue: "angular" }) };
    },
    ({ field }) => {
      const handle = createAngularField(field);
      field.setValue("angular_updated");
      void handle.value();
      handle.dispose();
    },
    ({ field }) => field.dispose(),
  );

  const vueBridge = bench(
    "vue_bridge",
    50,
    5,
    () => {
      return { field: createField({ initialValue: "vue" }) };
    },
    ({ field }) => {
      const handle = createVueField(field);
      field.setValue("vue_updated");
      void handle.value.value;
      handle.dispose();
    },
    ({ field }) => field.dispose(),
  );

  return {
    construction,
    leafMutation,
    siblingNotifications,
    aggregateMutation,
    validation,
    validationCounters,
    fieldArray,
    identityVerified,
    submission: {
      success: submitSuccess,
      validationBlocked: submitBlocked,
      failure: submitFailure,
      cancellation: submitCancellation,
    },
    serverIssues,
    parserMutation,
    adapters: {
      react: reactBridge,
      vanilla: vanillaBridge,
      angular: angularBridge,
      vue: vueBridge,
    },
  };
}
