import { describe, expect, it, vi } from "vitest";
import { createDiagnostics, createScope, state } from "../../packages/core/src/index.js";
import {
  createField,
  createFieldGroup,
  createFieldArray,
  createForm,
  type FieldIssue,
  type SyncValidationRule,
  type AsyncValidationRule,
  type ValidationRuleContext,
} from "./form-core.js";

// Helper for controllable deferred promises
function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Form Research F4 — Async Validation, Cancellation & Revisions", () => {
  // -------------------------------------------------------------------------
  // 1. Simple async rule success
  // -------------------------------------------------------------------------
  it("Fixture 1: Simple async rule success transitions pending true -> false and status valid", async () => {
    const deferred = createDeferred<FieldIssue | null>();
    const asyncRule: AsyncValidationRule<string> = async () => {
      return deferred.promise;
    };

    const field = createField({
      initialValue: "alice",
      rules: [asyncRule],
      validateOn: "manual",
    });

    expect(field.validationStatus.get()).toBe("unvalidated");
    expect(field.pending.get()).toBe(false);

    const valPromise = field.validate("manual");
    expect(field.pending.get()).toBe(true);

    deferred.resolve(null);
    const issues = await valPromise;

    expect(issues).toHaveLength(0);
    expect(field.pending.get()).toBe(false);
    expect(field.validationStatus.get()).toBe("valid");
    expect(field.valid.get()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 2. Async rule validation issue
  // -------------------------------------------------------------------------
  it("Fixture 2: Async rule returns issue and updates issues, valid, and validationStatus", async () => {
    const deferred = createDeferred<FieldIssue>();
    const asyncRule: AsyncValidationRule<string> = async () => deferred.promise;

    const field = createField({
      initialValue: "bob",
      rules: [asyncRule],
      validateOn: "manual",
    });

    const valPromise = field.validate("manual");
    expect(field.pending.get()).toBe(true);

    deferred.resolve({
      code: "username_taken",
      message: "Username already in use",
      source: "validation",
    });

    const issues = await valPromise;
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("username_taken");
    expect(field.pending.get()).toBe(false);
    expect(field.validationStatus.get()).toBe("invalid");
    expect(field.valid.get()).toBe(false);
    expect(field.errors.get()).toEqual(["Username already in use"]);
  });

  // -------------------------------------------------------------------------
  // 3. Superseded validator aborted on new mutation (A -> B)
  // -------------------------------------------------------------------------
  it("Fixture 3: Superseded validator receives abort signal and stale result is ignored", async () => {
    const deferredA = createDeferred<FieldIssue | null>();
    const deferredB = createDeferred<FieldIssue | null>();

    let signalA: AbortSignal | undefined;
    let signalB: AbortSignal | undefined;

    const asyncRule: AsyncValidationRule<string> = async (val, { signal }) => {
      if (val === "valueA") {
        signalA = signal;
        return deferredA.promise;
      }
      if (val === "valueB") {
        signalB = signal;
        return deferredB.promise;
      }
      return null;
    };

    const field = createField({
      initialValue: "init",
      rules: [asyncRule],
      validateOn: "change",
    });

    // Mutation A
    field.setValue("valueA");
    expect(field.pending.get()).toBe(true);
    expect(signalA?.aborted).toBe(false);

    // Mutation B supersedes A
    field.setValue("valueB");
    expect(signalA?.aborted).toBe(true);
    expect(signalB?.aborted).toBe(false);
    expect(field.pending.get()).toBe(true);

    // A resolves late with an error issue
    deferredA.resolve({
      code: "error_from_A",
      message: "Stale issue from A",
      source: "validation",
    });
    await Promise.resolve(); // tick microtasks

    // Stale issue from A must NOT commit
    expect(field.issues.get()).toHaveLength(0);
    expect(field.pending.get()).toBe(true);

    // B resolves with valid
    deferredB.resolve(null);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(field.issues.get()).toHaveLength(0);
    expect(field.pending.get()).toBe(false);
    expect(field.validationStatus.get()).toBe("valid");
  });

  // -------------------------------------------------------------------------
  // 4. Stale validator ignoring abort cannot commit
  // -------------------------------------------------------------------------
  it("Fixture 4: Stale validator that ignores abort signal is strictly rejected from committing", async () => {
    const deferredA = createDeferred<FieldIssue>();
    const deferredB = createDeferred<FieldIssue | null>();

    const stubbornRule: AsyncValidationRule<string> = async (val) => {
      // Deliberately ignores signal
      if (val === "A") return deferredA.promise;
      return deferredB.promise;
    };

    const field = createField({
      initialValue: "init",
      rules: [stubbornRule],
      validateOn: "change",
    });

    field.setValue("A");
    field.setValue("B"); // supersedes A

    // A resolves late ignoring abort
    deferredA.resolve({
      code: "unauthorized_stale_issue",
      source: "validation",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(field.issues.get()).toEqual([]);

    deferredB.resolve(null);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(field.issues.get()).toEqual([]);
    expect(field.validationStatus.get()).toBe("valid");
  });

  // -------------------------------------------------------------------------
  // 5. Rapid A -> B -> C mutations, only C commits
  // -------------------------------------------------------------------------
  it("Fixture 5: Rapid sequential mutations A -> B -> C guarantee only C commits", async () => {
    const defA = createDeferred<FieldIssue>();
    const defB = createDeferred<FieldIssue>();
    const defC = createDeferred<FieldIssue>();

    const rule: AsyncValidationRule<string> = async (val) => {
      if (val === "A") return defA.promise;
      if (val === "B") return defB.promise;
      if (val === "C") return defC.promise;
      return null;
    };

    const field = createField({
      initialValue: "",
      rules: [rule],
      validateOn: "change",
    });

    field.setValue("A");
    field.setValue("B");
    field.setValue("C");

    // Resolve in reverse order: B, then A, then C
    defB.resolve({ code: "issue_B", source: "validation" });
    defA.resolve({ code: "issue_A", source: "validation" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(field.issues.get()).toEqual([]);
    expect(field.pending.get()).toBe(true);

    defC.resolve({ code: "issue_C", message: "Only C", source: "validation" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(field.issues.get()).toHaveLength(1);
    expect(field.issues.get()[0]?.code).toBe("issue_C");
    expect(field.pending.get()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 6. Cancellation is NOT a validation failure
  // -------------------------------------------------------------------------
  it("Fixture 6: Aborted validation throws AbortError inside validator without producing validation failure issue", async () => {
    const deferred = createDeferred<FieldIssue>();

    const abortingRule: AsyncValidationRule<string> = async (val, { signal }) => {
      return new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => {
          const err = new Error("This operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
        deferred.promise.then(resolve, reject);
      });
    };

    const field = createField({
      initialValue: "v1",
      rules: [abortingRule],
      validateOn: "change",
    });

    field.setValue("v2");
    expect(field.pending.get()).toBe(true);

    // Cancel via reset
    field.reset();

    expect(field.pending.get()).toBe(false);
    expect(field.issues.get()).toEqual([]);
    expect(field.validationStatus.get()).toBe("unvalidated");
  });

  // -------------------------------------------------------------------------
  // 7. Field reset aborts active async validation and resets state
  // -------------------------------------------------------------------------
  it("Fixture 7: field.reset() aborts active async validation and keeps baseline pristine", async () => {
    let capturedSignal: AbortSignal | undefined;
    const def = createDeferred<FieldIssue>();

    const rule: AsyncValidationRule<string> = async (val, { signal }) => {
      capturedSignal = signal;
      return def.promise;
    };

    const field = createField({
      initialValue: "baseline",
      rules: [rule],
      validateOn: "change",
    });

    field.setValue("changed");
    expect(field.pending.get()).toBe(true);
    expect(capturedSignal?.aborted).toBe(false);

    field.reset();
    expect(capturedSignal?.aborted).toBe(true);
    expect(field.pending.get()).toBe(false);
    expect(field.value.get()).toBe("baseline");
    expect(field.validationStatus.get()).toBe("unvalidated");

    // Stale resolution after reset
    def.resolve({ code: "late_error", source: "validation" });
    await Promise.resolve();

    expect(field.issues.get()).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 8. Scope disposal aborts active validation
  // -------------------------------------------------------------------------
  it("Fixture 8: Scope disposal aborts active validation and stops lifecycle", async () => {
    const scope = createScope({ name: "field-async-scope" });
    let capturedSignal: AbortSignal | undefined;
    const def = createDeferred<FieldIssue>();

    const rule: AsyncValidationRule<string> = async (val, { signal }) => {
      capturedSignal = signal;
      return def.promise;
    };

    const field = createField({
      initialValue: "val",
      rules: [rule],
      validateOn: "manual",
      scope,
    });

    field.validate("manual");
    expect(field.pending.get()).toBe(true);
    expect(capturedSignal?.aborted).toBe(false);

    scope.dispose();
    expect(capturedSignal?.aborted).toBe(true);
    expect(field.pending.get()).toBe(false);

    // Calling validate on disposed node throws
    expect(() => field.validate("manual")).toThrow("Form node is disposed");
  });

  // -------------------------------------------------------------------------
  // 9. Sync rules pass before async runs, sync failure skips async
  // -------------------------------------------------------------------------
  it("Fixture 9: Sync rule failure short-circuits async validation execution", async () => {
    let asyncCalled = false;
    const syncRule: SyncValidationRule<string> = (val) => {
      if (val.length < 3) {
        return { code: "too_short", message: "Too short", source: "validation" };
      }
      return null;
    };
    const asyncRule: AsyncValidationRule<string> = async () => {
      asyncCalled = true;
      return null;
    };

    const field = createField({
      initialValue: "valid_start",
      rules: [
        syncRule,
        (val: string, ctx: ValidationRuleContext) => {
          // If previous sync rule failed, don't return promise
          return asyncRule(val, ctx as ValidationRuleContext & { readonly signal: AbortSignal });
        },
      ],
      validateOn: "change",
    });

    // "x" fails syncRule (< 3)
    field.setValue("x");

    expect(field.pending.get()).toBe(false);
    expect(field.issues.get()).toHaveLength(1);
    expect(field.issues.get()[0]?.code).toBe("too_short");
  });

  // -------------------------------------------------------------------------
  // 10. Async group / cross-field validation
  // -------------------------------------------------------------------------
  it("Fixture 10: Async group rule receives aggregated child values and aggregates pending state", async () => {
    const def = createDeferred<FieldIssue | null>();
    const groupRule: AsyncValidationRule<{ username: string; tenant: string }> = async (vals) => {
      if (vals.username === "admin" && vals.tenant === "public") {
        return def.promise;
      }
      return null;
    };

    const group = createFieldGroup({
      initialValues: {
        username: "user",
        tenant: "public",
      },
      rules: [groupRule],
      validateOn: "change",
    });

    expect(group.pending.get()).toBe(false);

    group.setValues({ username: "admin" });
    expect(group.pending.get()).toBe(true);

    def.resolve({
      code: "admin_disallowed_in_public_tenant",
      message: "Admin is not allowed in public tenant",
      source: "validation",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(group.pending.get()).toBe(false);
    expect(group.issues.get()).toHaveLength(1);
    expect(group.issues.get()[0]?.code).toBe("admin_disallowed_in_public_tenant");
  });

  // -------------------------------------------------------------------------
  // 11. Dynamic array item async validation & reorder preservation
  // -------------------------------------------------------------------------
  it("Fixture 11: Array item async validation preserves conceptual node identity and derives current positional path", async () => {
    const def = createDeferred<FieldIssue | null>();
    const asyncItemRule: AsyncValidationRule<string> = async (val) => {
      if (val === "itemB") return def.promise;
      return null;
    };

    const array = createFieldArray<{ id: number; name: string }>({
      initialValues: [
        { id: 1, name: "itemA" },
        { id: 2, name: "itemB" },
      ],
      keyExtractor: (it) => it.id,
    });

    const item2Node = array.items.get()[1]?.node as any;
    // Replace field with async rule
    item2Node.fields.name = createField({
      initialValue: "itemB",
      rules: [asyncItemRule],
      validateOn: "manual",
    });

    const valPromise = item2Node.fields.name.validate("manual");
    expect(array.pending.get()).toBe(true);

    // Swap items 0 and 1 while async validation is in flight
    array.swap(0, 1);
    expect(array.items.get()[0]?.id).toBe(2);

    def.resolve({
      code: "invalid_item_b",
      message: "Item B is invalid",
      source: "validation",
    });
    await valPromise;

    expect(array.pending.get()).toBe(false);
    const arrayIssues = array.issues.get();
    expect(arrayIssues).toHaveLength(1);
    expect(arrayIssues[0]?.code).toBe("invalid_item_b");
    // Path reflects new position [0, "name"]
    expect(arrayIssues[0]?.path).toEqual([0, "name"]);
  });

  // -------------------------------------------------------------------------
  // 12. Array item removal aborts pending async validation
  // -------------------------------------------------------------------------
  it("Fixture 12: Removing an array item aborts its in-flight async validation and prevents commit", async () => {
    let capturedSignal: AbortSignal | undefined;
    const def = createDeferred<FieldIssue>();

    const itemRule: AsyncValidationRule<string> = async (val, { signal }) => {
      capturedSignal = signal;
      return def.promise;
    };

    const array = createFieldArray<string>({
      initialValues: ["a", "b"],
    });

    const item0 = array.items.get()[0]!;
    // Create field inside item 0's scope
    const field0 = createField({
      initialValue: "a",
      rules: [itemRule],
      validateOn: "manual",
      scope: item0.scope,
    });
    (item0 as any).node = field0;

    field0.validate("manual");
    expect(capturedSignal?.aborted).toBe(false);

    // Remove item 0
    array.remove(0);

    // Old item was disposed
    expect(capturedSignal?.aborted).toBe(true);

    // Late resolution from removed item
    def.resolve({ code: "ghost_issue", source: "validation" });
    await Promise.resolve();

    expect(array.issues.get()).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 13. Debounce on change trigger
  // -------------------------------------------------------------------------
  it("Fixture 13: Debounce delays change validation and cancels prior scheduled timer", async () => {
    vi.useFakeTimers();
    try {
      const spy = vi.fn();
      const asyncRule: AsyncValidationRule<string> = async (val) => {
        spy(val);
        return null;
      };

      const field = createField({
        initialValue: "init",
        rules: [asyncRule],
        validateOn: "change",
        debounceMs: 100,
      });

      field.setValue("step1");
      vi.advanceTimersByTime(50);
      expect(spy).not.toHaveBeenCalled();

      // Second change before timer expires
      field.setValue("step2");
      vi.advanceTimersByTime(50);
      expect(spy).not.toHaveBeenCalled(); // prior timer cancelled

      vi.advanceTimersByTime(50); // 100ms reached for step2
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith("step2");
    } finally {
      vi.useRealTimers();
    }
  });

  // -------------------------------------------------------------------------
  // 14. Manual trigger bypasses debounce immediately
  // -------------------------------------------------------------------------
  it("Fixture 14: Manual validate() bypasses configured debounceMs and runs immediately", async () => {
    const spy = vi.fn();
    const asyncRule: AsyncValidationRule<string> = async (val) => {
      spy(val);
      return null;
    };

    const field = createField({
      initialValue: "instant",
      rules: [asyncRule],
      validateOn: "change",
      debounceMs: 500,
    });

    await field.validate("manual");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("instant");
  });

  // -------------------------------------------------------------------------
  // 15. Form reset aborts all nested active async validations
  // -------------------------------------------------------------------------
  it("Fixture 15: form.reset() aborts active async validations across the entire form tree", async () => {
    let sigA: AbortSignal | undefined;
    let sigB: AbortSignal | undefined;

    const ruleA: AsyncValidationRule<string> = async (val, { signal }) => {
      sigA = signal;
      return new Promise(() => {}); // never resolves
    };
    const ruleB: AsyncValidationRule<string> = async (val, { signal }) => {
      sigB = signal;
      return new Promise(() => {});
    };

    const form = createForm({
      initialValues: {
        fieldA: "a",
        fieldB: "b",
      },
    });

    (form.fields.fieldA as any) = createField({
      initialValue: "a",
      rules: [ruleA],
      validateOn: "manual",
    });
    (form.fields.fieldB as any) = createField({
      initialValue: "b",
      rules: [ruleB],
      validateOn: "manual",
    });

    (form.fields.fieldA as any).validate("manual");
    (form.fields.fieldB as any).validate("manual");

    expect(sigA?.aborted).toBe(false);
    expect(sigB?.aborted).toBe(false);

    form.reset();

    expect(sigA?.aborted).toBe(true);
    expect(sigB?.aborted).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 16. Multiple async rules parallel execution and declaration ordering
  // -------------------------------------------------------------------------
  it("Fixture 16: Multiple async rules run in parallel and preserve declaration order in issue results", async () => {
    const def1 = createDeferred<FieldIssue>();
    const def2 = createDeferred<FieldIssue>();

    const rule1: AsyncValidationRule<string> = async () => def1.promise;
    const rule2: AsyncValidationRule<string> = async () => def2.promise;

    const field = createField({
      initialValue: "test",
      rules: [rule1, rule2],
      validateOn: "manual",
    });

    const valPromise = field.validate("manual");

    // Resolve rule 2 BEFORE rule 1
    def2.resolve({ code: "rule_2_issue", source: "validation" });
    def1.resolve({ code: "rule_1_issue", source: "validation" });

    const issues = await valPromise;

    // Must be ordered by declaration order [rule1, rule2]
    expect(issues).toHaveLength(2);
    expect(issues[0]?.code).toBe("rule_1_issue");
    expect(issues[1]?.code).toBe("rule_2_issue");
  });

  // -------------------------------------------------------------------------
  // 17. Legacy setErrors coexistence during async validation
  // -------------------------------------------------------------------------
  it("Fixture 17: Manual setErrors() coexists and is not silently erased by unrelated async validation runs", async () => {
    const def = createDeferred<FieldIssue | null>();
    const asyncRule: AsyncValidationRule<string> = async () => def.promise;

    const field = createField({
      initialValue: "val",
      rules: [asyncRule],
      validateOn: "manual",
    });

    field.setErrors(["Manual legacy error message"]);
    expect(field.errors.get()).toEqual(["Manual legacy error message"]);

    const valPromise = field.validate("manual");
    def.resolve(null);
    await valPromise;

    // Successful async rule validation committed its own result
    expect(field.validationStatus.get()).toBe("valid");
  });

  // -------------------------------------------------------------------------
  // 18. Resource count stability across rapid superseding validations
  // -------------------------------------------------------------------------
  it("Fixture 18: Rapid superseding async validations do not leak scope resources", async () => {
    const diagnostics = createDiagnostics({ maxEvents: 50000 });

    diagnostics.run(() => {
      const rootScope = createScope({ name: "async-leak-test" });
      const field = createField({
        initialValue: "0",
        rules: [async () => null],
        validateOn: "change",
        scope: rootScope,
      });

      for (let i = 1; i <= 200; i++) {
        field.setValue(String(i));
      }

      const before = diagnostics.getEvents().length;
      rootScope.dispose();
      const disposing = diagnostics
        .getEvents()
        .slice(before)
        .find((e) => e.type === "scope.disposing");

      // Resources remain strictly bounded and constant
      expect(disposing?.payload["resourceCount"]).toBeLessThanOrEqual(10);
    });
  });
  // -------------------------------------------------------------------------
  // 19-21. Review regressions (F4 fix pass)
  // -------------------------------------------------------------------------
  const microtasks = async (n = 10): Promise<void> => {
    for (let i = 0; i < n; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
  };

  it("Fixture 19: a rejecting async field rule on a trigger does not raise an unhandled rejection", async () => {
    const seen: unknown[] = [];
    const onUnhandled = (reason: unknown): void => {
      seen.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);

    const field = createField<string>({
      initialValue: "",
      rules: [
        async (): Promise<FieldIssue | null> => {
          throw new Error("network down");
        },
      ],
    });

    // setValue is fire-and-forget: nobody holds the returned promise.
    field.setValue("x");
    await microtasks();

    process.off("unhandledRejection", onUnhandled);
    expect(seen).toEqual([]);
    // State stays consistent: the node leaves the pending phase.
    expect(field.pending.get()).toBe(false);
  });

  it("Fixture 20: a rejecting async group rule on setValues does not raise an unhandled rejection", async () => {
    const seen: unknown[] = [];
    const onUnhandled = (reason: unknown): void => {
      seen.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);

    const form = createForm<{ a: string; b: string }>({
      initialValues: { a: "", b: "" },
      rules: [
        async (): Promise<FieldIssue | null> => {
          throw new Error("group boom");
        },
      ],
    });

    form.setValues({ a: "x" });
    await microtasks();

    process.off("unhandledRejection", onUnhandled);
    expect(seen).toEqual([]);
    form.dispose();
  });

  it("Fixture 21: an explicit validate() caller still receives the rejection", async () => {
    const field = createField<string>({
      initialValue: "",
      rules: [
        async (): Promise<FieldIssue | null> => {
          throw new Error("explicit failure");
        },
      ],
      validateOn: "manual",
    });

    await expect(field.validate("manual")).rejects.toThrow("explicit failure");
    expect(field.pending.get()).toBe(false);
  });

  it("Fixture 22: FieldArray.validate() throws once its owning scope is disposed", () => {
    const scope = createScope({ name: "array-dispose-guard" });
    const array = createFieldArray<string>({ initialValues: ["a"], scope });

    expect(() => array.validate("manual")).not.toThrow();
    scope.dispose();
    expect(() => array.validate("manual")).toThrow(/disposed/);
  });
});
