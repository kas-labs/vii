import { describe, expect, it, vi } from "vitest";
import {
  createField,
  createNumberParser,
  type FieldIssue,
  type SyncValidationRule,
} from "../../src/index.js";

describe("P1e: Synchronous Field Validation Rules", () => {
  it("passes initial valid field with sync rule", () => {
    const minRule: SyncValidationRule<number> = (val) => {
      if (val < 0) {
        return { code: "min_value", message: "Must be non-negative", source: "validation" };
      }
      return null;
    };

    const field = createField({
      initialValue: 10,
      rules: [minRule],
    });

    expect(field.valid.get()).toBe(true);
    expect(field.invalid.get()).toBe(false);
    expect(field.issues.get()).toHaveLength(0);
    expect(field.pending.get()).toBe(false);
  });

  it("produces validation issue and transitions valid to false on invalid value", () => {
    const minRule: SyncValidationRule<number> = (val) => {
      if (val < 0) {
        return { code: "min_value", message: "Must be non-negative", source: "validation" };
      }
      return null;
    };

    const field = createField({
      initialValue: 10,
      rules: [minRule],
    });

    field.setValue(-5);
    expect(field.valid.get()).toBe(false);
    expect(field.invalid.get()).toBe(true);
    expect(field.issues.get()).toHaveLength(1);
    expect(field.issues.get()[0]?.code).toBe("min_value");
    expect(field.issues.get()[0]?.message).toBe("Must be non-negative");
    expect(field.issues.get()[0]?.source).toBe("validation");
    expect(field.validationStatus.get()).toBe("invalid");
  });

  it("clears validation issue when field is corrected", () => {
    const minRule: SyncValidationRule<number> = (val) => (val < 0 ? { code: "min_value" } : null);

    const field = createField({
      initialValue: 10,
      rules: [minRule],
    });

    field.setValue(-5);
    expect(field.valid.get()).toBe(false);

    field.setValue(5);
    expect(field.valid.get()).toBe(true);
    expect(field.invalid.get()).toBe(false);
    expect(field.issues.get()).toHaveLength(0);
  });

  it("collects issues from multiple sync validation rules in deterministic order", () => {
    const rule1: SyncValidationRule<string> = (val) =>
      val.length < 3 ? { code: "min_length", message: "Too short" } : null;
    const rule2: SyncValidationRule<string> = (val) =>
      !val.includes("@") ? { code: "email_format", message: "Must contain @" } : null;

    const field = createField({
      initialValue: "test@example.com",
      rules: [rule1, rule2],
    });

    field.setValue("a");
    const issues = field.issues.get();
    expect(issues).toHaveLength(2);
    expect(issues[0]?.code).toBe("min_length");
    expect(issues[1]?.code).toBe("email_format");
  });

  it("bypasses domain validation rules when raw presentation input fails parsing", () => {
    const ruleSpy = vi.fn((val: number) => {
      if (val < 0) return { code: "min_val" };
      return null;
    });

    const field = createField<number, string>({
      initialValue: 10,
      initialRawValue: "10",
      parser: createNumberParser(),
      rules: [ruleSpy],
    });

    ruleSpy.mockClear();

    // Invalid raw input that cannot be parsed
    field.setRawValue("abc");

    expect(field.parseStatus.get()).toBe("invalid");
    expect(ruleSpy).not.toHaveBeenCalled(); // Invariant: domain validation NEVER runs on unparsed input
    expect(field.issues.get()).toHaveLength(1);
    expect(field.issues.get()[0]?.source).toBe("parse");
    expect(field.valid.get()).toBe(false);

    // Manual validate also respects parse failure without calling domain rule
    field.validate("manual");
    expect(ruleSpy).not.toHaveBeenCalled();
  });

  it("keeps touched state strictly independent of validation and value changes", () => {
    const field = createField<string>({
      initialValue: "init",
      rules: [(v: string) => (v === "" ? { code: "required" } : null)],
    });

    expect(field.touched.get()).toBe(false);

    field.setValue("");
    expect(field.valid.get()).toBe(false);
    expect(field.touched.get()).toBe(false); // touched does NOT automatically change on edit

    field.markTouched();
    expect(field.touched.get()).toBe(true);

    field.reset();
    expect(field.touched.get()).toBe(false);
  });

  it("supports blur trigger validation when configured", () => {
    const ruleSpy = vi.fn(() => ({ code: "blur_error" }));

    const field = createField({
      initialValue: "init",
      rules: [ruleSpy],
      validateOn: "blur",
    });

    field.setValue("new_val");
    expect(ruleSpy).not.toHaveBeenCalled(); // change trigger did not fire rule

    field.setTouched(true);
    expect(ruleSpy).toHaveBeenCalledTimes(1);
    expect(field.valid.get()).toBe(false);
  });

  it("executes manual validation synchronously for sync rules and returns issues", () => {
    const rule: SyncValidationRule<string> = (val) => (val === "bad" ? { code: "is_bad" } : null);

    const field = createField({
      initialValue: "bad",
      rules: [rule],
      validateOn: "manual",
    });

    expect(field.validationStatus.get()).toBe("unvalidated");

    const issues = field.validate("manual");
    expect(Array.isArray(issues)).toBe(true);
    expect((issues as readonly FieldIssue[])[0]?.code).toBe("is_bad");
    expect(field.valid.get()).toBe(false);
  });

  it("resets validation state cleanly on reset()", () => {
    const field = createField<string>({
      initialValue: "valid",
      rules: [(v: string) => (v === "invalid" ? { code: "err" } : null)],
    });

    field.setValue("invalid");
    expect(field.valid.get()).toBe(false);
    expect(field.issues.get()).toHaveLength(1);

    field.reset();
    expect(field.value.get()).toBe("valid");
    expect(field.issues.get()).toHaveLength(0);
    expect(field.validationStatus.get()).toBe("unvalidated");
    expect(field.valid.get()).toBe(true);
  });
});
