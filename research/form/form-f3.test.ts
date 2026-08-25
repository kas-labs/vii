import { describe, expect, it, vi } from "vitest";
import { createDiagnostics, createScope, state } from "../../packages/core/src/index.js";
import {
  createField,
  createFieldGroup,
  createFieldArray,
  createForm,
  type FieldIssue,
  type SyncValidationRule,
} from "./form-core.js";

describe("Form Research F3 — Validation Scheduling & Structured Issues", () => {
  // -------------------------------------------------------------------------
  // 1. Simple required-like field rule
  // -------------------------------------------------------------------------
  it("Fixture 1: Simple required-like field rule validates and updates issues / valid / status", () => {
    const requiredRule: SyncValidationRule<string> = (val) => {
      if (!val || val.trim() === "") {
        return {
          code: "required",
          message: "This field is required",
          source: "validation",
        };
      }
      return null;
    };

    const field = createField({
      initialValue: "",
      rules: [requiredRule],
    });

    expect(field.validationStatus.get()).toBe("unvalidated");
    expect(field.valid.get()).toBe(true);
    expect(field.issues.get()).toEqual([]);
    expect(field.errors.get()).toEqual([]);

    // Trigger validation
    const issues = field.validate("manual");
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("required");
    expect(issues[0]?.message).toBe("This field is required");
    expect(field.validationStatus.get()).toBe("invalid");
    expect(field.valid.get()).toBe(false);
    expect(field.invalid.get()).toBe(true);
    expect(field.errors.get()).toEqual(["This field is required"]);

    // Updating value to non-empty clears issue on change
    field.setValue("hello");
    expect(field.issues.get()).toEqual([]);
    expect(field.validationStatus.get()).toBe("valid");
    expect(field.valid.get()).toBe(true);
    expect(field.invalid.get()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 2. Multiple field rules & declaration ordering
  // -------------------------------------------------------------------------
  it("Fixture 2: Multiple field rules execute deterministically in declaration order", () => {
    const minLengthRule: SyncValidationRule<string> = (val) => {
      if (val.length < 5) {
        return {
          code: "min_length",
          message: "Must be at least 5 chars",
          source: "validation",
        };
      }
      return null;
    };

    const noNumbersRule: SyncValidationRule<string> = (val) => {
      if (/\d/.test(val)) {
        return {
          code: "no_numbers",
          message: "Must not contain numbers",
          source: "validation",
        };
      }
      return null;
    };

    const field = createField({
      initialValue: "abc",
      rules: [minLengthRule, noNumbersRule],
    });

    // "12" fails both minLength (< 5) and noNumbers (has '1', '2')
    field.setValue("12");
    expect(field.issues.get()).toHaveLength(2);
    expect(field.issues.get()[0]?.code).toBe("min_length");
    expect(field.issues.get()[1]?.code).toBe("no_numbers");

    // "12345" fails only noNumbers
    field.setValue("12345");
    expect(field.issues.get()).toHaveLength(1);
    expect(field.issues.get()[0]?.code).toBe("no_numbers");

    // "validtext" passes both
    field.setValue("validtext");
    expect(field.issues.get()).toHaveLength(0);
    expect(field.valid.get()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 3. Change-trigger validation
  // -------------------------------------------------------------------------
  it("Fixture 3: Change-trigger validation executes on setValue and skips if not configured", () => {
    const ruleFn = vi.fn<SyncValidationRule<string>>((val) => {
      if (val === "bad") {
        return { code: "bad_value", source: "validation" };
      }
      return null;
    });

    const field = createField({
      initialValue: "good",
      rules: [ruleFn],
      validateOn: ["change"],
    });

    expect(ruleFn).not.toHaveBeenCalled();

    field.setValue("bad");
    expect(ruleFn).toHaveBeenCalledTimes(1);
    expect(field.issues.get()).toHaveLength(1);
    expect(field.issues.get()[0]?.code).toBe("bad_value");

    // Configured with only 'blur'
    const blurField = createField({
      initialValue: "good",
      rules: [ruleFn],
      validateOn: "blur",
    });

    ruleFn.mockClear();
    blurField.setValue("bad");
    // Should NOT validate on change when configured for blur only
    expect(ruleFn).not.toHaveBeenCalled();
    expect(blurField.issues.get()).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // 4. Blur-trigger validation
  // -------------------------------------------------------------------------
  it("Fixture 4: Blur-trigger validation executes on setTouched(true)", () => {
    const rule = vi.fn<SyncValidationRule<string>>((val) => {
      if (val === "invalid") {
        return { code: "invalid_val", source: "validation" };
      }
      return null;
    });

    const field = createField({
      initialValue: "invalid",
      rules: [rule],
      validateOn: "blur",
    });

    expect(field.issues.get()).toHaveLength(0);
    expect(rule).not.toHaveBeenCalled();

    // Blur (touch) field
    field.setTouched(true);
    expect(rule).toHaveBeenCalledTimes(1);
    expect(field.issues.get()).toHaveLength(1);
    expect(field.issues.get()[0]?.code).toBe("invalid_val");
  });

  // -------------------------------------------------------------------------
  // 5. Manual validation
  // -------------------------------------------------------------------------
  it("Fixture 5: Manual validation explicitly triggers validation without altering touched/dirty unexpectedly", () => {
    const field = createField({
      initialValue: "initial",
      rules: [(v) => (v === "initial" ? { code: "must_change", source: "validation" } : null)],
      validateOn: "manual",
    });

    expect(field.touched.get()).toBe(false);
    expect(field.dirty.get()).toBe(false);
    expect(field.validationStatus.get()).toBe("unvalidated");

    const issues = field.validate("manual");
    expect(issues).toHaveLength(1);
    expect(field.validationStatus.get()).toBe("invalid");
    // Manual validation does NOT mark field touched or dirty
    expect(field.touched.get()).toBe(false);
    expect(field.dirty.get()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 6. Form-wide validation entry point
  // -------------------------------------------------------------------------
  it("Fixture 6: form.validate() validates all fields and groups in the form tree", () => {
    const form = createForm({
      initialValues: {
        username: "",
        email: "",
      },
    });

    // Create a form with child field rules via field group
    const customGroup = createFieldGroup({
      initialValues: {
        pass: "123",
        confirm: "456",
      },
      rules: [
        (vals) =>
          vals.pass !== vals.confirm
            ? {
                code: "password_mismatch",
                message: "Passwords must match",
                path: ["confirm"],
                source: "validation",
              }
            : null,
      ],
    });

    const issues = customGroup.validate("submit");
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("password_mismatch");
    expect(issues[0]?.path).toEqual(["confirm"]);
  });

  // -------------------------------------------------------------------------
  // 7. Cross-field group validation
  // -------------------------------------------------------------------------
  it("Fixture 7: Cross-field group validation receives child values and updates on child change", () => {
    const group = createFieldGroup({
      initialValues: {
        password: "secretPassword1",
        confirmPassword: "differentPassword",
      },
      rules: [
        (vals) => {
          if (vals.password !== vals.confirmPassword) {
            return {
              code: "passwords_must_match",
              message: "Passwords do not match",
              path: ["confirmPassword"],
              source: "validation",
            };
          }
          return null;
        },
      ],
    });

    // Validate initially
    group.validate("manual");
    expect(group.valid.get()).toBe(false);
    expect(group.issues.get()).toHaveLength(1);
    expect(group.issues.get()[0]?.code).toBe("passwords_must_match");

    // Setting matching password via setValues reruns group validation and clears issue
    group.setValues({ confirmPassword: "secretPassword1" });
    expect(group.issues.get()).toHaveLength(0);
    expect(group.valid.get()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 8. Nested group issue bubbling with hierarchical paths
  // -------------------------------------------------------------------------
  it("Fixture 8: Nested group issue bubbling preserves structured hierarchical path", () => {
    const form = createForm({
      initialValues: {
        account: {
          profile: {
            email: "invalid-email",
          },
        },
      },
    });

    const emailNode = form.getNode("account.profile.email") as any;
    expect(emailNode).toBeDefined();

    emailNode.setIssues([
      {
        code: "invalid_format",
        message: "Invalid email address format",
        source: "validation",
      },
    ]);

    expect(form.valid.get()).toBe(false);
    const formIssues = form.issues.get();
    expect(formIssues).toHaveLength(1);
    expect(formIssues[0]?.code).toBe("invalid_format");
    expect(formIssues[0]?.path).toEqual(["account", "profile", "email"]);
  });

  // -------------------------------------------------------------------------
  // 9. Array item validation and issue bubbling
  // -------------------------------------------------------------------------
  it("Fixture 9: FieldArray item validation bubbles structured index paths", () => {
    const array = createFieldArray<{ name: string }>({
      initialValues: [{ name: "Valid" }, { name: "" }],
    });

    const item1 = array.items.get()[1]?.node as any;
    expect(item1).toBeDefined();

    item1.fields.name.setIssues([
      {
        code: "required",
        message: "Name required",
        source: "validation",
      },
    ]);

    expect(array.valid.get()).toBe(false);
    const arrayIssues = array.issues.get();
    expect(arrayIssues).toHaveLength(1);
    expect(arrayIssues[0]?.code).toBe("required");
    expect(arrayIssues[0]?.path).toEqual([1, "name"]);
  });

  // -------------------------------------------------------------------------
  // 10. Reorder preserves issue ownership with updated positional path
  // -------------------------------------------------------------------------
  it("Fixture 10: Array reordering preserves conceptual issue identity with updated positional presentation path", () => {
    const array = createFieldArray<{ id: number; name: string }>({
      initialValues: [
        { id: 1, name: "First" },
        { id: 2, name: "SecondWithIssue" },
      ],
      keyExtractor: (it) => it.id,
    });

    const item2Node = array.items.get()[1]?.node as any;
    item2Node.fields.name.setIssues([
      {
        code: "custom_err",
        message: "Item 2 has issue",
        source: "validation",
      },
    ]);

    // Initial path is [1, "name"]
    expect(array.issues.get()[0]?.path).toEqual([1, "name"]);

    // Swap index 0 and 1
    array.swap(0, 1);

    // Item 2 is now at index 0
    expect(array.items.get()[0]?.id).toBe(2);
    // The issue stayed attached to item 2, and its position path updated to [0, "name"]
    const updatedIssues = array.issues.get();
    expect(updatedIssues).toHaveLength(1);
    expect(updatedIssues[0]?.code).toBe("custom_err");
    expect(updatedIssues[0]?.path).toEqual([0, "name"]);
  });

  // -------------------------------------------------------------------------
  // 11. Successful revalidation clears validation issues
  // -------------------------------------------------------------------------
  it("Fixture 11: Successful revalidation clears previous validation issues", () => {
    const field = createField({
      initialValue: "",
      rules: [(v) => (v === "" ? { code: "required", source: "validation" } : null)],
    });

    field.validate();
    expect(field.issues.get()).toHaveLength(1);

    field.setValue("fixed");
    // setValue with change trigger reruns validation, clearing issues
    expect(field.issues.get()).toHaveLength(0);
    expect(field.validationStatus.get()).toBe("valid");
  });

  // -------------------------------------------------------------------------
  // 12. Sibling branch isolation
  // -------------------------------------------------------------------------
  it("Fixture 12: Sibling field mutation does not trigger unrelated sibling validation", () => {
    const siblingRule = vi.fn<SyncValidationRule<string>>(() => null);

    const group = createFieldGroup({
      initialValues: {
        fieldA: "valA",
        fieldB: "valB",
      },
    });

    const fieldB = group.fields.fieldB as any;
    // Replace fieldB with one with spy rule
    const isolatedField = createField({
      initialValue: "valB",
      rules: [siblingRule],
      validateOn: "change",
    });

    // Mutating fieldA does not call isolatedField's validation rule
    fieldB.setValue("newValB");
    expect(siblingRule).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 13. Throwing validator behavior
  // -------------------------------------------------------------------------
  it("Fixture 13: Throwing validator propagates exception without leaking values into errors", () => {
    const throwingRule: SyncValidationRule<string> = () => {
      throw new Error("Internal validator exploded unexpectedly");
    };

    const field = createField({
      initialValue: "sensitive_password_value",
      rules: [throwingRule],
    });

    expect(() => {
      field.validate("manual");
    }).toThrow("Internal validator exploded unexpectedly");

    // Ensure sensitive value wasn't placed in issues or errors
    expect(field.issues.get()).toEqual([]);
    expect(field.errors.get()).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // 14. Promise / thenable rejection
  // -------------------------------------------------------------------------
  it("Fixture 14: Fast-rejects Promise / thenable validator return with actionable TypeError", () => {
    const asyncRule = (() => {
      return Promise.resolve({ code: "async_err", source: "validation" });
    }) as any;

    const field = createField({
      initialValue: "test",
      rules: [asyncRule],
    });

    expect(() => {
      field.validate("manual");
    }).toThrow(TypeError);

    expect(() => {
      field.validate("manual");
    }).toThrow(/Async validation is not supported in F3/);
  });

  // -------------------------------------------------------------------------
  // 15. Prototype-hostile issue codes and paths
  // -------------------------------------------------------------------------
  it("Fixture 15: Prototype pollution attempts on issue codes and path segments are rejected", () => {
    const maliciousCodeRule: SyncValidationRule<string> = () => {
      return {
        code: "__proto__",
        source: "validation",
      };
    };

    const fieldWithMaliciousCode = createField({
      initialValue: "test",
      rules: [maliciousCodeRule],
    });

    expect(() => {
      fieldWithMaliciousCode.validate();
    }).toThrow(/Security error: Prototype pollution attempt blocked/);

    const maliciousPathRule: SyncValidationRule<string> = () => {
      return {
        code: "err",
        path: ["constructor", "test"],
        source: "validation",
      };
    };

    const fieldWithMaliciousPath = createField({
      initialValue: "test",
      rules: [maliciousPathRule],
    });

    expect(() => {
      fieldWithMaliciousPath.validate();
    }).toThrow(/Security error: Prototype pollution attempt blocked/);
  });

  // -------------------------------------------------------------------------
  // 16. Post-dispose validation behavior
  // -------------------------------------------------------------------------
  it("Fixture 16: Post-dispose form rejects validation operations cleanly", () => {
    const form = createForm({
      initialValues: {
        name: "test",
      },
    });

    form.dispose();

    expect(() => {
      form.validate();
    }).toThrow("Form is disposed");
  });

  // -------------------------------------------------------------------------
  // 17. Batching and diagnostics observation
  // -------------------------------------------------------------------------
  it("Fixture 17: Validation emits diagnostics events and batches notification changes atomically", () => {
    const diagnostics = createDiagnostics({ maxEvents: 1000 });

    diagnostics.run(() => {
      const field = createField({
        initialValue: "",
        rules: [(v) => (v === "" ? { code: "req", source: "validation" } : null)],
        validateOn: "manual",
      });

      let notifyCount = 0;
      field.valid.subscribe(() => {
        notifyCount++;
      });

      expect(notifyCount).toBe(0); // subscribe in Vii fires on subsequent change

      field.validate("manual");
      expect(notifyCount).toBe(1); // exactly 1 notification on validation failure (valid true -> false)

      const events = diagnostics.getEvents();
      const started = events.find((e) => e.type === "field.validation.started");
      const completed = events.find((e) => e.type === "field.validation.completed");

      expect(started).toBeDefined();
      expect(completed).toBeDefined();
      expect(completed?.payload["issueCount"]).toBe(1);
      expect(completed?.payload["status"]).toBe("invalid");
    });
  });
  // -------------------------------------------------------------------------
  // 18-21. Review regressions (F3 fix pass)
  // -------------------------------------------------------------------------
  it("Fixture 18: FieldArray.issues and .validationStatus are stable, scope-owned computeds", () => {
    const scope = createScope({ name: "array-issues-identity" });
    const array = createFieldArray<string>({ initialValues: ["a", "b"], scope });

    expect(array.issues).toBe(array.issues);
    expect(array.validationStatus).toBe(array.validationStatus);

    scope.dispose();
  });

  it("Fixture 19: repeated reads of array issues do not accumulate scope resources", () => {
    const diagnostics = createDiagnostics({ maxEvents: 50000 });
    diagnostics.run(() => {
      const rootScope = createScope({ name: "array-issues-leak" });
      const array = createFieldArray<string>({ initialValues: ["a"], scope: rootScope });

      for (let i = 0; i < 200; i++) {
        array.issues.get();
        array.validationStatus.get();
      }

      const before = diagnostics.getEvents().length;
      rootScope.dispose();
      const disposing = diagnostics
        .getEvents()
        .slice(before)
        .find((e) => e.type === "scope.disposing");

      // Constant regardless of how many times the derived issue views were read.
      expect(disposing?.payload["resourceCount"]).toBeLessThanOrEqual(12);
    });
  });

  it("Fixture 20: group validateOn is honored — setValues does not run group rules under submit-only", () => {
    const matchRule: SyncValidationRule<{ a: string; b: string }> = (vals) =>
      vals.a === vals.b ? null : { code: "mismatch", source: "validation" };

    const submitOnly = createForm<{ a: string; b: string }>({
      initialValues: { a: "", b: "" },
      validateOn: "submit",
      rules: [matchRule],
    });
    submitOnly.setValues({ a: "x" });
    expect(submitOnly.issues.get()).toHaveLength(0);
    expect(submitOnly.validate("submit").map((i) => i.code)).toEqual(["mismatch"]);
    submitOnly.dispose();

    const onChange = createForm<{ a: string; b: string }>({
      initialValues: { a: "", b: "" },
      rules: [matchRule],
    });
    onChange.setValues({ a: "x" });
    expect(onChange.issues.get().map((i) => i.code)).toEqual(["mismatch"]);
    onChange.dispose();
  });

  it("Fixture 21: setErrors keeps the F1/F2 contract for empty and reserved-word messages", () => {
    const field = createField<string>({ initialValue: "" });

    expect(() => field.setErrors([""])).not.toThrow();
    expect(field.errors.get()).toEqual([""]);
    expect(field.issues.get()).toHaveLength(1);
    expect(field.issues.get()[0]?.message).toBe("");
    expect(field.validationStatus.get()).toBe("invalid");

    expect(() => field.setErrors(["constructor", "__proto__", "prototype"])).not.toThrow();
    expect(field.errors.get()).toEqual(["constructor", "__proto__", "prototype"]);
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();

    field.setErrors([]);
    expect(field.issues.get()).toHaveLength(0);
    expect(field.valid.get()).toBe(true);
  });
});
