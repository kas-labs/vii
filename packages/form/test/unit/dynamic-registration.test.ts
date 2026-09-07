import { describe, expect, test } from "vitest";
import {
  createForm,
  createField,
  createFieldGroup,
  createFieldArray,
  type FieldState,
} from "../../src/index.js";
import { getInternalNode } from "../../src/core/internal.js";
import { ValidationRevisionController } from "../../src/validation/revision.js";
import type { ValidationRuleContext } from "../../src/validation/types.js";

type GroupShape = {
  a: FieldState<number, number>;
  b?: FieldState<number, number>;
};

describe("P2b Dynamic Tree Registration", () => {
  test("registers an optional group child atomically - group child logical registration", () => {
    const root = createForm<GroupShape>({
      fields: {
        a: createField<number>({ initialValue: 1 }),
      },
    });

    expect(root.getValue()).toEqual({ a: 1 });

    // Register dynamically
    root.register("b", createField({ initialValue: 2 }));
    expect(root.getValue()).toEqual({ a: 1, b: 2 });

    // Verify dirty/touched tracking
    const bNode = root.fields.b;
    expect(bNode).toBeDefined();
    bNode!.setValue(3);
    bNode!.markTouched();
    expect(root.dirty.get()).toBe(true);
    expect(root.touched.get()).toBe(true);
    expect(root.getValue()).toEqual({ a: 1, b: 3 });
  });

  test("2. group child logical unregistration", () => {
    const root = createForm<GroupShape>({
      fields: {
        a: createField({ initialValue: 1 }),
      },
    });
    const bNode = createField({ initialValue: 2 });
    root.register("b", bNode);
    expect(root.getValue()).toEqual({ a: 1, b: 2 });

    root.unregister("b");
    expect(root.getValue()).toEqual({ a: 1 });
    expect(root.fields.b).toBeUndefined();

    // Verify resource disposal
    expect(() => bNode.getValue()).toThrowError(/disposed/);
  });

  test("3. array item logical registration/addition", () => {
    const arr = createFieldArray<FieldState<number, number>>({ items: [] });
    arr.append(createField({ initialValue: 1 }));
    expect(arr.getValue()).toEqual([1]);
  });

  test("4. array item logical removal", () => {
    const arr = createFieldArray<FieldState<number, number>>({ items: [] });
    const bNode = createField({ initialValue: 2 });
    arr.append(bNode);
    arr.remove(0);
    expect(arr.getValue()).toEqual([]);
    expect(() => bNode.getValue()).toThrowError(/disposed/);
  });

  test("13. reset after dynamic registration", () => {
    const root = createForm<GroupShape>({ fields: { a: createField({ initialValue: 1 }) } });
    const bNode = createField({ initialValue: 2 });
    root.register("b", bNode);
    bNode.setValue(3);
    expect(root.getValue()).toEqual({ a: 1, b: 3 });
    root.reset();
    expect(root.getValue()).toEqual({ a: 1, b: 2 });
  });

  test("reset after unregister - reset after unregister", () => {
    const root = createForm<GroupShape>({ fields: { a: createField({ initialValue: 1 }) } });
    const bNode = createField({ initialValue: 2 });
    root.register("b", bNode);
    root.unregister("b");
    root.reset();
    expect(root.getValue()).toEqual({ a: 1 });
  });

  test("server issues on a node before unregister - server issues on a node before unregister", async () => {
    const root = createForm<GroupShape>({ fields: { a: createField({ initialValue: 1 }) } });
    root.register("b", createField({ initialValue: 2 }));
    const promise = root.submit(async () => {
      return { ok: false, issues: [{ path: ["b"], message: "Server error", code: "error" }] };
    });
    await promise;
    expect(root.issues.get().length).toBe(1);
    root.unregister("b");
    expect(root.issues.get().length).toBe(0);
  });

  test("duplicate logical identity protection - duplicate logical identity protection", () => {
    const root = createForm<GroupShape>({ fields: { a: createField({ initialValue: 1 }) } });
    root.register("b", createField({ initialValue: 2 }));
    expect(() => root.register("b", createField({ initialValue: 3 }))).toThrowError(
      /Duplicate child key "b" in form/,
    );
  });

  test("repeated register/unregister resource cleanup - repeated register/unregister resource cleanup", () => {
    const root = createForm<Record<string, FieldState<number, number>>>({ fields: {} });
    for (let i = 0; i < 50; i++) {
      const f = createField({ initialValue: i });
      root.register("dynamic", f);
      root.unregister("dynamic");
      expect(() => f.getValue()).toThrow(/disposed/);
    }
    expect(root.getValue()).toEqual({});
  });

  test("exact disposal-count regression: unregister then parent dispose", () => {
    type TestShape = {
      required: FieldState<number, number>;
      optional?: FieldState<number, number>;
    };
    const root = createForm<TestShape>({
      fields: { required: createField<number>({ initialValue: 1 }) },
    });
    const rootInternal = getInternalNode(root)!;
    const baselineHandles = rootInternal.getOwnershipHandleCount!();

    const child = createField<number>({ initialValue: 2 });
    const childInternal = getInternalNode(child)!;
    let childDisposalCount = 0;
    const originalDisposeFromOwner = childInternal.disposeFromOwner;
    childInternal.disposeFromOwner = () => {
      childDisposalCount++;
      originalDisposeFromOwner();
    };

    // 1. register child
    root.register("optional", child);
    expect(rootInternal.getOwnershipHandleCount!()).toBe(baselineHandles + 1);
    expect(childDisposalCount).toBe(0);

    // 2. unregister child: exactly 1 disposal, handles back to baseline
    root.unregister("optional");
    expect(childDisposalCount).toBe(1);
    expect(rootInternal.getOwnershipHandleCount!()).toBe(baselineHandles);

    // 3. parent.dispose(): child disposal count still = 1, no second call
    root.dispose();
    expect(childDisposalCount).toBe(1);
  });

  test("exact disposal-count regression for FieldGroup: unregister then parent dispose", () => {
    type TestShape = {
      required: FieldState<number, number>;
      optional?: FieldState<number, number>;
    };
    const group = createFieldGroup<TestShape>({
      fields: { required: createField<number>({ initialValue: 1 }) },
    });
    const groupInternal = getInternalNode(group)!;
    const baselineHandles = groupInternal.getOwnershipHandleCount!();

    const child = createField<number>({ initialValue: 2 });
    const childInternal = getInternalNode(child)!;
    let childDisposalCount = 0;
    const originalDisposeFromOwner = childInternal.disposeFromOwner;
    childInternal.disposeFromOwner = () => {
      childDisposalCount++;
      originalDisposeFromOwner();
    };

    // 1. register child
    group.register("optional", child);
    expect(groupInternal.getOwnershipHandleCount!()).toBe(baselineHandles + 1);
    expect(childDisposalCount).toBe(0);

    // 2. unregister child: exactly 1 disposal, handles back to baseline
    group.unregister("optional");
    expect(childDisposalCount).toBe(1);
    expect(groupInternal.getOwnershipHandleCount!()).toBe(baselineHandles);

    // 3. parent.dispose(): child disposal count still = 1, no second call
    group.dispose();
    expect(childDisposalCount).toBe(1);
  });

  test("counters never go negative across cancellation, supersession, unregister, and dispose", async () => {
    const timersBefore = ValidationRevisionController.activeTimers;
    const controllersBefore = ValidationRevisionController.activeControllers;

    type FormShape = {
      dyn?: FieldState<number, number>;
    };
    const root = createForm<FormShape>({ fields: {} });

    try {
      expect(ValidationRevisionController.activeTimers).toBeGreaterThanOrEqual(0);
      expect(ValidationRevisionController.activeControllers).toBeGreaterThanOrEqual(0);

      const f = createField<number>({
        initialValue: 10,
        debounceMs: 50,
        rules: [
          async (val: number) => {
            await new Promise((r) => setTimeout(r, 20));
            return val > 5 ? null : { code: "low", message: "Too low" };
          },
        ],
      });

      root.register("dyn", f);
      // Trigger debounce timer
      f.setValue(4);
      expect(ValidationRevisionController.activeTimers).toBeGreaterThanOrEqual(0);
      expect(ValidationRevisionController.activeControllers).toBeGreaterThanOrEqual(0);

      // Supersede debounce timer
      f.setValue(3);
      expect(ValidationRevisionController.activeTimers).toBeGreaterThanOrEqual(0);
      expect(ValidationRevisionController.activeControllers).toBeGreaterThanOrEqual(0);

      // Cancel active validation via manual validate / supersession
      f.validate("change");
      expect(ValidationRevisionController.activeTimers).toBeGreaterThanOrEqual(0);
      expect(ValidationRevisionController.activeControllers).toBeGreaterThanOrEqual(0);

      // Unregister
      root.unregister("dyn");
      expect(ValidationRevisionController.activeTimers).toBeGreaterThanOrEqual(0);
      expect(ValidationRevisionController.activeControllers).toBeGreaterThanOrEqual(0);

      // Repeated unregister
      root.unregister("dyn");
      expect(ValidationRevisionController.activeTimers).toBeGreaterThanOrEqual(0);
      expect(ValidationRevisionController.activeControllers).toBeGreaterThanOrEqual(0);

      // Dispose root
      root.dispose();
      expect(ValidationRevisionController.activeTimers).toBeGreaterThanOrEqual(0);
      expect(ValidationRevisionController.activeControllers).toBeGreaterThanOrEqual(0);

      // Repeated dispose
      root.dispose();
      expect(ValidationRevisionController.activeTimers).toBeGreaterThanOrEqual(0);
      expect(ValidationRevisionController.activeControllers).toBeGreaterThanOrEqual(0);

      expect(ValidationRevisionController.activeTimers).toBe(timersBefore);
      expect(ValidationRevisionController.activeControllers).toBe(controllersBefore);
    } finally {
      root.dispose();
    }
  });

  test("1000-cycle structural stress - 1,000-cycle structural resource gate", async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (err: unknown) => unhandled.push(err);
    process.on("unhandledRejection", onUnhandled);

    const root = createForm<Record<string, FieldState<number, number>>>({ fields: {} });
    const rootInternal = getInternalNode(root)!;

    const initialHandles = rootInternal.getOwnershipHandleCount!();
    const initialTimers = ValidationRevisionController.activeTimers;
    const initialControllers = ValidationRevisionController.activeControllers;

    try {
      for (let i = 0; i < 1000; i++) {
        const key = `field_${i}`;
        const f = createField<number>({
          initialValue: i,
          rules: [(v: number) => (v < 0 ? { code: "invalid", message: "Negative" } : null)],
        });
        root.register(key, f);
        expect(rootInternal.getOwnershipHandleCount!()).toBe(initialHandles + 1);

        root.unregister(key);
        expect(rootInternal.getOwnershipHandleCount!()).toBe(initialHandles);
        expect(() => f.getValue()).toThrow(/disposed/);
      }

      // Assertions BEFORE root.dispose():
      expect(rootInternal.getOwnershipHandleCount!()).toBe(initialHandles);
      expect(ValidationRevisionController.activeTimers).toBe(initialTimers);
      expect(ValidationRevisionController.activeControllers).toBe(initialControllers);
      expect(root.getValue()).toEqual({});
      expect(root.issues.get().length).toBe(0);
      expect(unhandled.length).toBe(0);
    } finally {
      process.removeListener("unhandledRejection", onUnhandled);
      root.dispose();
    }
  });

  test("submission race: unregister before validation finishes - submission race: unregister before validation finishes", async () => {
    const root = createForm<GroupShape>({ fields: { a: createField({ initialValue: 1 }) } });
    let resolveVal: () => void;
    let capturedSignal: AbortSignal | undefined;
    const p = new Promise<void>((r) => (resolveVal = r));
    root.register(
      "b",
      createField<number>({
        initialValue: 2,
        rules: [
          async (_value: number, ctx: ValidationRuleContext) => {
            capturedSignal = ctx.signal;
            await p;
            return { code: "late_error", message: "Should not commit" };
          },
        ],
      }),
    );

    let didRun = false;
    const submitPromise = root
      .submit(async () => {
        didRun = true;
      })
      .catch((e) => e); // wait for completion

    root.unregister("b");
    resolveVal!();

    await submitPromise;
    expect(didRun).toBe(false); // submission should cancel
    expect(capturedSignal?.aborted).toBe(true); // Signal was aborted
    expect(root.issues.get().length).toBe(0); // 0 stale commits
  });

  test("submission race: unregister during validation - submission race: unregister during validation", async () => {
    const root = createForm<GroupShape>({
      fields: { a: createField<number>({ initialValue: 1 }) },
    });
    let validateResolve: () => void;
    let capturedSignal: AbortSignal | undefined;
    const p = new Promise<void>((r) => (validateResolve = r));
    const bNode = createField<number>({
      initialValue: 2,
      rules: [
        async (_value: number, ctx: ValidationRuleContext) => {
          capturedSignal = ctx.signal;
          await p;
          return null;
        },
      ],
    });
    root.register("b", bNode);

    let didRunAction = false;
    const submitPromise = root
      .submit(async () => {
        didRunAction = true;
      })
      .catch((e) => e); // wait for completion

    root.unregister("b");
    validateResolve!();

    await submitPromise;
    expect(didRunAction).toBe(false);
    expect(capturedSignal?.aborted).toBe(true); // Should have cancelled submit due to tree mutation!
  });

  test("submission race: unregister after action snapshot - submission race: unregister after action snapshot", async () => {
    const root = createForm<GroupShape>({
      fields: { a: createField<number>({ initialValue: 1 }) },
    });
    root.register("b", createField({ initialValue: 2 }));

    let submitVals: unknown;
    // Because there are no async rules, this resolves synchronously to taking the snapshot and starting the action
    const submitPromise = root.submit(async (vals) => {
      submitVals = vals;
      root.unregister("b"); // Unregister while action is running
    });

    await submitPromise;
    expect(submitVals).toEqual({ a: 1, b: 2 }); // Snapshot captured BEFORE unregister
    expect(root.getValue()).toEqual({ a: 1 }); // Form now lacks b
  });
});

test("reinitialize semantics after dynamic registration - reinitialize semantics after dynamic registration", () => {
  const root = createForm<GroupShape>({ fields: { a: createField<number>({ initialValue: 1 }) } });
  root.register("b", createField({ initialValue: 2 }));
  root.reinitialize({ value: { a: 10, b: 20 }, rawValue: { a: 10, b: 20 } });
  expect(root.getValue()).toEqual({ a: 10, b: 20 });
});

test("reinitialize semantics after unregister - reinitialize semantics after unregister", () => {
  const root = createForm<GroupShape>({ fields: { a: createField({ initialValue: 1 }) } });
  root.register("b", createField({ initialValue: 2 }));
  root.unregister("b");
  root.reinitialize({ value: { a: 10 }, rawValue: { a: 10 } });
  expect(root.getValue()).toEqual({ a: 10 });
});

test("unrelated sibling notification isolation - unrelated sibling notification isolation", () => {
  const root = createForm<GroupShape>({ fields: { a: createField({ initialValue: 1 }) } });
  let aNotified = 0;
  root.fields.a.value.subscribe(() => {
    aNotified++;
  });
  root.register("b", createField({ initialValue: 2 }));
  expect(aNotified).toBe(0); // registering b should not trigger a's value observers
});

test("debounce cleanup after unregister - debounce cleanup after unregister", async () => {
  const root = createForm<GroupShape>({ fields: { a: createField({ initialValue: 1 }) } });
  let validated = 0;
  const bNode = createField({
    initialValue: 2,
    debounceMs: 50,
    rules: [
      async () => {
        validated++;
        await new Promise((r) => setTimeout(r, 50));
        return null;
      },
    ],
  });
  root.register("b", bNode);
  bNode.setValue(3); // triggers debounced validation
  root.unregister("b"); // should cancel the timer

  await new Promise((r) => setTimeout(r, 60));
  expect(validated).toBe(0); // Debounce was cleared
});

test("32. static FieldGroup inference preservation", () => {
  const group = createForm({
    fields: {
      name: createField<string>({ initialValue: "" }),
      email: createField<string>({ initialValue: "" }),
    },
  });

  // Type check that exact keys are preserved
  const nameNode: FieldState<string, string> = group.fields.name;
  const emailNode: FieldState<string, string> = group.fields.email;
  expect(nameNode.value.get()).toBe("");
  expect(emailNode.value.get()).toBe("");
});
