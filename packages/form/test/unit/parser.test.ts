import { describe, expect, it } from "vitest";
import {
  createField,
  createForm,
  createNumberParser,
  createStringParser,
} from "../../src/index.js";
import {
  createBooleanParser,
  createOptionalStringParser,
  sanitizeParseIssue,
} from "../../src/parsers/builtins.js";

describe("P1e: Field Parsers & Raw vs Value Separation", () => {
  it("maintains backward-compatible Raw === Value for parserless fields", () => {
    const field = createField({ initialValue: "hello" });

    expect(field.value.get()).toBe("hello");
    expect(field.rawValue.get()).toBe("hello");
    expect(field.parseStatus.get()).toBe("unparsed");
    expect(field.parseIssue.get()).toBeNull();
    expect(field.valid.get()).toBe(true);
    expect(field.invalid.get()).toBe(false);

    field.setValue("world");
    expect(field.value.get()).toBe("world");
    expect(field.rawValue.get()).toBe("world");
    expect(field.parseStatus.get()).toBe("unparsed");

    field.setRawValue("reset-raw");
    expect(field.value.get()).toBe("reset-raw");
    expect(field.rawValue.get()).toBe("reset-raw");
  });

  it("parses raw presentation input into domain value with parser", () => {
    const field = createField<number, string>({
      initialValue: 0,
      initialRawValue: "0",
      parser: createNumberParser(),
    });

    expect(field.value.get()).toBe(0);
    expect(field.rawValue.get()).toBe("0");
    expect(field.parseStatus.get()).toBe("parsed");
    expect(field.parseIssue.get()).toBeNull();

    field.setRawValue("42");
    expect(field.value.get()).toBe(42);
    expect(field.rawValue.get()).toBe("42");
    expect(field.parseStatus.get()).toBe("parsed");
    expect(field.parseIssue.get()).toBeNull();
    expect(field.valid.get()).toBe(true);
  });

  it("retains exact raw presentation '05' while domain value becomes 5", () => {
    const field = createField<number, string>({
      initialValue: 0,
      initialRawValue: "0",
      parser: createNumberParser(),
    });

    field.setRawValue("05");
    expect(field.rawValue.get()).toBe("05");
    expect(field.value.get()).toBe(5);
    expect(field.parseStatus.get()).toBe("parsed");
    expect(field.parseIssue.get()).toBeNull();
  });

  it("captures structured ParseIssue on parse failure and preserves last good domain value", () => {
    const field = createField<number, string>({
      initialValue: 10,
      initialRawValue: "10",
      parser: createNumberParser(),
    });

    field.setRawValue("abc");
    expect(field.rawValue.get()).toBe("abc");
    expect(field.value.get()).toBe(10);
    expect(field.parseStatus.get()).toBe("invalid");

    const issue = field.parseIssue.get();
    expect(issue).not.toBeNull();
    expect(issue?.code).toBe("parse.invalid_number");
    expect(issue?.source).toBe("parse");
    expect(issue?.message).toBe("Invalid number");

    expect(field.issues.get()).toHaveLength(1);
    expect(field.issues.get()[0]).toBe(issue);
    expect(field.valid.get()).toBe(false);
    expect(field.invalid.get()).toBe(true);
  });

  it("clears parse issue when subsequent valid raw input is provided", () => {
    const field = createField<number, string>({
      initialValue: 10,
      initialRawValue: "10",
      parser: createNumberParser(),
    });

    field.setRawValue("invalid");
    expect(field.valid.get()).toBe(false);

    field.setRawValue("25");
    expect(field.value.get()).toBe(25);
    expect(field.rawValue.get()).toBe("25");
    expect(field.parseStatus.get()).toBe("parsed");
    expect(field.parseIssue.get()).toBeNull();
    expect(field.issues.get()).toHaveLength(0);
    expect(field.valid.get()).toBe(true);
  });

  it("restores both domain and raw baseline on reset()", () => {
    const field = createField<number, string>({
      initialValue: 5,
      initialRawValue: "05",
      parser: createNumberParser(),
    });

    field.setRawValue("abc");
    expect(field.parseStatus.get()).toBe("invalid");

    field.reset();
    expect(field.value.get()).toBe(5);
    expect(field.rawValue.get()).toBe("05");
    expect(field.dirty.get()).toBe(false);
    expect(field.touched.get()).toBe(false);
    expect(field.parseIssue.get()).toBeNull();
    expect(field.parseStatus.get()).toBe("parsed");
    expect(field.pending.get()).toBe(false);
  });

  it("reset() accepts zero arguments only", () => {
    const field = createField<number, string>({
      initialValue: 5,
      initialRawValue: "5",
      parser: createNumberParser(),
    });

    field.setRawValue("9");
    field.reset();
    expect(field.value.get()).toBe(5);
    expect(field.rawValue.get()).toBe("5");
  });

  it("evaluates dirty strictly against domain value ('5' -> '05' remains pristine)", () => {
    const field = createField<number, string>({
      initialValue: 5,
      initialRawValue: "5",
      parser: createNumberParser(),
    });

    expect(field.dirty.get()).toBe(false);

    field.setRawValue("05");
    expect(field.value.get()).toBe(5);
    expect(field.rawValue.get()).toBe("05");
    expect(field.dirty.get()).toBe(false);

    field.setRawValue("6");
    expect(field.value.get()).toBe(6);
    expect(field.dirty.get()).toBe(true);
  });

  it("setValue on parsed field updates domain value only and preserves raw presentation", () => {
    const field = createField<number, string>({
      initialValue: 5,
      initialRawValue: "05",
      parser: createNumberParser(),
    });

    field.setValue(10);
    expect(field.value.get()).toBe(10);
    expect(field.rawValue.get()).toBe("05");
    expect(field.dirty.get()).toBe(true);
    expect(field.parseStatus.get()).toBe("parsed");
    expect(field.parseIssue.get()).toBeNull();
  });

  it("parser-aware form.reinitialize replaces raw and domain baselines", () => {
    const ageField = createField<number, string>({
      initialValue: 5,
      initialRawValue: "05",
      parser: createNumberParser(),
    });
    const form = createForm({
      fields: {
        age: ageField,
      },
    });

    form.fields.age.setRawValue("abc");
    expect(form.fields.age.parseStatus.get()).toBe("invalid");

    form.reinitialize({
      age: { value: 10, rawValue: "010" },
    });

    expect(form.fields.age).toBe(ageField);
    expect(form.fields.age.value.get()).toBe(10);
    expect(form.fields.age.rawValue.get()).toBe("010");
    expect(form.fields.age.dirty.get()).toBe(false);
    expect(form.fields.age.touched.get()).toBe(false);
    expect(form.fields.age.parseIssue.get()).toBeNull();
    expect(form.fields.age.pending.get()).toBe(false);

    form.fields.age.setValue(11);
    form.fields.age.reset();
    expect(form.fields.age.value.get()).toBe(10);
    expect(form.fields.age.rawValue.get()).toBe("010");
  });

  it("rejects domain-only reinitialize baseline for cross-type parsed fields", () => {
    const form = createForm({
      fields: {
        age: createField<number, string>({
          initialValue: 5,
          initialRawValue: "05",
          parser: createNumberParser(),
        }),
      },
    });

    expect(() => form.reinitialize({ age: 10 as never })).toThrow(TypeError);
  });

  it("treats reserved property names in raw values as pure data", () => {
    const field = createField<string>({ initialValue: "" });

    field.setRawValue("__proto__");
    expect(field.rawValue.get()).toBe("__proto__");
    expect(field.value.get()).toBe("__proto__");

    field.setRawValue("constructor");
    expect(field.rawValue.get()).toBe("constructor");

    field.setRawValue("prototype");
    expect(field.rawValue.get()).toBe("prototype");
  });

  describe("createNumberParser test matrix", () => {
    const parser = createNumberParser({ allowEmpty: false, trim: true });

    it("parses valid decimal representations", () => {
      expect(parser("0")).toEqual({ ok: true, value: 0 });
      expect(parser("5")).toEqual({ ok: true, value: 5 });
      expect(parser("05")).toEqual({ ok: true, value: 5 });
      expect(parser("-5")).toEqual({ ok: true, value: -5 });
      expect(parser("5.5")).toEqual({ ok: true, value: 5.5 });
      expect(parser(".5")).toEqual({ ok: true, value: 0.5 });
      expect(parser("+2")).toEqual({ ok: true, value: 2 });
      expect(parser("1e3")).toEqual({ ok: true, value: 1000 });
      expect(parser("  42  ")).toEqual({ ok: true, value: 42 });
    });

    it("rejects non-decimal literals, invalid characters, and malformed inputs", () => {
      expect(parser("").ok).toBe(false);
      expect(parser("   ").ok).toBe(false);
      expect(parser("-").ok).toBe(false);
      expect(parser("1.").ok).toBe(false);
      expect(parser("abc").ok).toBe(false);
      expect(parser("5abc").ok).toBe(false);
      expect(parser("NaN").ok).toBe(false);
      expect(parser("Infinity").ok).toBe(false);
      expect(parser("-Infinity").ok).toBe(false);
      expect(parser("0x10").ok).toBe(false);
      expect(parser("0b101").ok).toBe(false);
      expect(parser("0o17").ok).toBe(false);
      expect(parser("1_000").ok).toBe(false);
    });

    it("supports allowEmpty configuration", () => {
      const optionalParser = createNumberParser({ allowEmpty: true, emptyValue: undefined });
      expect(optionalParser("")).toEqual({ ok: true, value: undefined });
      expect(optionalParser("   ")).toEqual({ ok: true, value: undefined });
      expect(optionalParser("42")).toEqual({ ok: true, value: 42 });
    });
  });

  describe("createStringParser (internal optional parsers remain non-public)", () => {
    it("createStringParser defaults to trim: false to prevent silent data loss", () => {
      const defaultStr = createStringParser();
      expect(defaultStr("  hello  ")).toEqual({ ok: true, value: "  hello  " });

      const trimmedStr = createStringParser({ trim: true });
      expect(trimmedStr("  hello  ")).toEqual({ ok: true, value: "hello" });
    });

    it("createOptionalStringParser maps empty and whitespace strings to undefined", () => {
      const optStr = createOptionalStringParser();
      expect(optStr("")).toEqual({ ok: true, value: undefined });
      expect(optStr("   ")).toEqual({ ok: true, value: undefined });
      expect(optStr("valid")).toEqual({ ok: true, value: "valid" });
    });

    it("createBooleanParser parses booleans and supported strings", () => {
      const boolParser = createBooleanParser();
      expect(boolParser(true)).toEqual({ ok: true, value: true });
      expect(boolParser("false")).toEqual({ ok: true, value: false });
      expect(boolParser("random").ok).toBe(false);
    });
  });

  describe("sanitizeParseIssue reserved issue codes", () => {
    it("accepts reserved strings as legitimate issue codes", () => {
      expect(sanitizeParseIssue({ code: "__proto__" }).code).toBe("__proto__");
      expect(sanitizeParseIssue({ code: "constructor" }).code).toBe("constructor");
      expect(sanitizeParseIssue({ code: "prototype" }).code).toBe("prototype");
      expect((Object.prototype as Record<string, unknown>)["polluted"]).toBeUndefined();
    });

    it("accepts valid string and number path segments as data", () => {
      const issue = sanitizeParseIssue({
        code: "custom.error",
        message: "Failed",
        path: ["user", "constructor", 0, "__proto__"],
      });
      expect(issue.path).toEqual(["user", "constructor", 0, "__proto__"]);
    });
  });
});
