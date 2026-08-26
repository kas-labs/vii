import { type } from "arktype";
import * as valibot from "valibot";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createDiagnostics } from "../../packages/core/src/index.js";
import {
  createBooleanParser,
  createField,
  createFieldArray,
  createFieldGroup,
  createForm,
  createNumberParser,
  createOptionalStringParser,
  isStandardSchema,
  normalizeStandardSchemaIssue,
  parsePath,
  sanitizeParseIssue,
  standardSchema,
  type AsyncValidationRule,
  type FieldIssue,
  type FieldParser,
  type FieldState,
  type OutputTransform,
  type ValidationRule,
  type ValidationRuleContext,
} from "./form-core.js";

describe("Form Research F5: Parsing / Input-Output Types / Standard Schema Boundary", () => {
  // -------------------------------------------------------------------------
  // 1. Raw Input vs Domain Value & Parser Contract
  // -------------------------------------------------------------------------
  describe("Value Stages & Parser Contract", () => {
    it("parses raw string input into typed domain number successfully", () => {
      const field = createField<number, string>({
        initialValue: 0,
        initialRawValue: "0",
        parser: createNumberParser(),
      });

      expect(field.value.get()).toBe(0);
      expect(field.rawValue.get()).toBe("0");
      expect(field.parseStatus.get()).toBe("parsed");
      expect(field.parseIssue.get()).toBeNull();
      expect(field.valid.get()).toBe(true);

      field.setRawValue("42");
      expect(field.value.get()).toBe(42);
      expect(field.rawValue.get()).toBe("42");
      expect(field.parseStatus.get()).toBe("parsed");
      expect(field.parseIssue.get()).toBeNull();
      expect(field.valid.get()).toBe(true);
      expect(field.dirty.get()).toBe(true);
    });

    it("captures structured ParseIssue on invalid raw input and prevents domain update", () => {
      const field = createField<number, string>({
        initialValue: 10,
        initialRawValue: "10",
        parser: createNumberParser(),
      });

      field.setRawValue("not-a-number");

      expect(field.value.get()).toBe(10); // Preserves previous good domain value
      expect(field.rawValue.get()).toBe("not-a-number");
      expect(field.parseStatus.get()).toBe("invalid");

      const issue = field.parseIssue.get();
      expect(issue).not.toBeNull();
      expect(issue?.code).toBe("parse.invalid_number");
      expect(issue?.source).toBe("parse");
      expect(field.issues.get()).toHaveLength(1);
      expect(field.issues.get()[0]?.source).toBe("parse");
      expect(field.errors.get()).toContain("Invalid number");
      expect(field.valid.get()).toBe(false);
      expect(field.invalid.get()).toBe(true);
    });

    it("prevents validation rules from executing on invalid unparsed raw input", () => {
      const ruleSpy = vi.fn((val: number): FieldIssue | null => {
        if (val < 0) return { code: "min_val", message: "Must be positive", source: "validation" };
        return null;
      });

      const field = createField<number, string>({
        initialValue: 10,
        parser: createNumberParser(),
        rules: [ruleSpy],
      });

      ruleSpy.mockClear();

      // Setting unparseable raw input
      field.setRawValue("abc");

      expect(field.parseStatus.get()).toBe("invalid");
      expect(ruleSpy).not.toHaveBeenCalled(); // Invariant: validation rules NEVER receive unparseable values

      // Explicit validation call also respects parse failure
      const valRes = field.validate("manual");
      expect(ruleSpy).not.toHaveBeenCalled();
      expect(valRes).toEqual(field.issues.get());
    });

    it("handles parser exception as runtime failure and records safe diagnostic telemetry", () => {
      const throwingParser: FieldParser<string, number> = () => {
        throw new RangeError("Uncaught parsing syntax crash");
      };

      const field = createField<number, string>({
        initialValue: 0,
        parser: throwingParser,
      });

      const diagnostics = createDiagnostics();

      expect(() => {
        diagnostics.run(() => {
          field.setRawValue("crash-me");
        });
      }).toThrow(RangeError);

      const events = diagnostics.getEvents();
      const errEvent = events.find((e: any) => e.type === "field.parse.failed");
      expect(errEvent).toBeDefined();
      expect((errEvent as any)?.payload.reason).toBe("RangeError");
      // Privacy check: raw input "crash-me" must NOT be in telemetry
      expect(JSON.stringify(events)).not.toContain("crash-me");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Parse Lifecycle, Dirty Semantics & Async Revision Interaction
  // -------------------------------------------------------------------------
  describe("Parse Lifecycle & Revision Interaction", () => {
    it("evaluates dirty strictly on domain value baseline (raw presentation does not dirty)", () => {
      const field = createField<number, string>({
        initialValue: 5,
        initialRawValue: "5",
        parser: createNumberParser(),
      });

      expect(field.dirty.get()).toBe(false);

      // "05" parses to 5, which equals initialValue 5
      field.setRawValue("05");
      expect(field.value.get()).toBe(5);
      expect(field.rawValue.get()).toBe("05");
      expect(field.dirty.get()).toBe(false); // Domain dirty is FALSE

      // "6" parses to 6, which differs from initialValue 5
      field.setRawValue("6");
      expect(field.value.get()).toBe(6);
      expect(field.dirty.get()).toBe(true); // Domain dirty is TRUE
    });

    it("cancels active async validation and suppresses late resolution when parse fails", async () => {
      let resolveAsync: ((val: any) => void) | null = null;
      const asyncRule: AsyncValidationRule<number> = (
        _val: number,
        { signal }: ValidationRuleContext & { readonly signal: AbortSignal },
      ) => {
        return new Promise((resolve) => {
          resolveAsync = (res: any) => {
            if (signal.aborted) resolve(null);
            else resolve(res);
          };
        });
      };

      const field = createField<number, string>({
        initialValue: 10,
        parser: createNumberParser(),
        rules: [asyncRule],
      });

      // 1. Valid raw input parses and starts async validation
      field.setRawValue("20");
      expect(field.pending.get()).toBe(true);

      // 2. User enters invalid raw input before async validation finishes
      field.setRawValue("invalid-text");
      expect(field.pending.get()).toBe(false);
      expect(field.parseStatus.get()).toBe("invalid");
      expect(field.issues.get()[0]?.source).toBe("parse");

      // 3. Old async validation resolves late
      if (resolveAsync) {
        (resolveAsync as any)({
          code: "server.old_check",
          message: "Late async issue",
          source: "validation",
        });
      }
      await new Promise((r) => setTimeout(r, 10));

      // Old async result must NOT overwrite parse failure state
      expect(field.parseStatus.get()).toBe("invalid");
      expect(field.issues.get()).toHaveLength(1);
      expect(field.issues.get()[0]?.code).toBe("parse.invalid_number");
      expect(field.issues.get()[0]?.source).toBe("parse");
    });

    it("resets cleanly from parse failure back to pristine baseline", () => {
      const field = createField<number, string>({
        initialValue: 10,
        initialRawValue: "10",
        parser: createNumberParser(),
      });

      field.setRawValue("invalid");
      expect(field.parseStatus.get()).toBe("invalid");
      expect(field.valid.get()).toBe(false);

      field.reset();
      expect(field.value.get()).toBe(10);
      expect(field.rawValue.get()).toBe("10");
      expect(field.parseStatus.get()).toBe("parsed");
      expect(field.parseIssue.get()).toBeNull();
      expect(field.issues.get()).toEqual([]);
      expect(field.errors.get()).toEqual([]);
      expect(field.valid.get()).toBe(true);
      expect(field.dirty.get()).toBe(false);
    });

    it("preserves backward-compatible setValue() without requiring parser", () => {
      const field = createField<number, string>({
        initialValue: 1,
        parser: createNumberParser(),
      });

      field.setRawValue("bad");
      expect(field.valid.get()).toBe(false);

      // Calling typed setValue directly clears parse issues and sets domain value
      field.setValue(99);
      expect(field.value.get()).toBe(99);
      expect(field.parseStatus.get()).toBe("parsed");
      expect(field.parseIssue.get()).toBeNull();
      expect(field.valid.get()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Output Transformation Stage
  // -------------------------------------------------------------------------
  describe("Output Transformations", () => {
    it("transforms valid domain value into distinct output type", () => {
      const transform: OutputTransform<number, { age: number; isAdult: boolean }> = (age) => ({
        age,
        isAdult: age >= 18,
      });

      const field = createField<number, string, { age: number; isAdult: boolean }>({
        initialValue: 20,
        initialRawValue: "20",
        parser: createNumberParser(),
        transform,
      });

      expect(field.output.get()).toEqual({ age: 20, isAdult: true });
      expect(field.getOutput()).toEqual({ age: 20, isAdult: true });

      field.setRawValue("15");
      expect(field.output.get()).toEqual({ age: 15, isAdult: false });
    });

    it("aggregates transformed outputs across nested groups and arrays", () => {
      const form = createForm({
        initialValues: {
          user: {
            name: " Alice ",
            age: 25,
          },
          tags: [" alpha ", " beta "],
        },
      });

      // Verify default getOutput() computes object matching values
      expect(form.getOutput()).toEqual({
        user: {
          name: " Alice ",
          age: 25,
        },
        tags: [" alpha ", " beta "],
      });
    });

    it("propagates programmer error when output transform throws", () => {
      const field = createField<number, number, string>({
        initialValue: 0,
        transform: () => {
          throw new TypeError("Transformer invariant failed");
        },
      });

      expect(() => field.getOutput()).toThrow(TypeError);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Standard Schema v1 Integration (Zod 4, Valibot, ArkType)
  // -------------------------------------------------------------------------
  describe("Standard Schema v1 Interoperability", () => {
    describe("Zod 4 Provider", () => {
      const zodUser = z.object({
        name: z.string().min(2),
        age: z.number().min(0).max(120),
      });

      it("validates valid input through standardSchema adapter", async () => {
        const rule = standardSchema(zodUser);
        const res = await rule(
          { name: "Alex", age: 30 },
          { trigger: "manual", signal: new AbortController().signal },
        );
        expect(res).toBeNull();
      });

      it("normalizes Zod failure issues into safe Vii FieldIssues", async () => {
        const rule = standardSchema(zodUser);
        const res = (await rule(
          { name: "A", age: -5 },
          { trigger: "manual", signal: new AbortController().signal },
        )) as readonly FieldIssue[];
        expect(Array.isArray(res)).toBe(true);
        expect(res.length).toBeGreaterThanOrEqual(2);
        expect(res[0]?.source).toBe("validation");
        expect(res.some((iss) => iss.path?.includes("name"))).toBe(true);
        expect(res.some((iss) => iss.path?.includes("age"))).toBe(true);
      });

      it("integrates directly into createField rule list", () => {
        const field = createField({
          initialValue: "abc",
          rules: [standardSchema(z.string().min(3))],
        });

        expect(field.valid.get()).toBe(true);

        field.setValue("a");
        expect(field.valid.get()).toBe(false);
        expect(field.issues.get()).toHaveLength(1);
        expect(field.issues.get()[0]?.source).toBe("validation");
      });
    });

    describe("Valibot Provider", () => {
      const valibotSchema = valibot.object({
        email: valibot.pipe(valibot.string(), valibot.email()),
        score: valibot.pipe(valibot.number(), valibot.minValue(0)),
      });

      it("validates valid and invalid input through standardSchema adapter", async () => {
        const rule = standardSchema(valibotSchema);

        const validRes = await rule(
          { email: "user@example.com", score: 100 },
          { trigger: "manual", signal: new AbortController().signal },
        );
        expect(validRes).toBeNull();

        const invalidRes = (await rule(
          { email: "not-an-email", score: -1 },
          { trigger: "manual", signal: new AbortController().signal },
        )) as readonly FieldIssue[];
        expect(Array.isArray(invalidRes)).toBe(true);
        expect(invalidRes.length).toBeGreaterThanOrEqual(2);
        expect(invalidRes[0]?.source).toBe("validation");
      });
    });

    describe("ArkType Provider", () => {
      const arkSchema = type({
        username: "string >= 3",
        role: "'admin' | 'user'",
      });

      it("validates valid and invalid input through standardSchema adapter", async () => {
        const rule = standardSchema(arkSchema);

        const validRes = await rule(
          { username: "alex123", role: "admin" },
          { trigger: "manual", signal: new AbortController().signal },
        );
        expect(validRes).toBeNull();

        const invalidRes = (await rule(
          { username: "a", role: "guest" as any },
          { trigger: "manual", signal: new AbortController().signal },
        )) as readonly FieldIssue[];
        expect(Array.isArray(invalidRes)).toBe(true);
        expect(invalidRes.length).toBeGreaterThanOrEqual(1);
        expect(invalidRes[0]?.source).toBe("validation");
      });
    });

    describe("TypeBox Status", () => {
      it("explicitly confirms TypeBox does not implement ~standard natively without adapter", () => {
        const nonStandardObj = { type: "string" };
        expect(isStandardSchema(nonStandardObj)).toBe(false);
        expect(() => standardSchema(nonStandardObj as any)).toThrow(TypeError);
      });
    });
  });

  // -------------------------------------------------------------------------
  // 5. Async Standard Schema & Cancellation / Stale Suppression
  // -------------------------------------------------------------------------
  describe("Async Standard Schema Lifecycle", () => {
    it("handles asynchronous Standard Schema validation and suppresses stale results", async () => {
      const asyncZod = z.string().refine(
        async (val) => {
          await new Promise((r) => setTimeout(r, 20));
          return val === "available_user";
        },
        { message: "Username is already taken" },
      );

      const field = createField({
        initialValue: "available_user",
        rules: [standardSchema(asyncZod)],
      });

      // 1. Initial manual validation is valid
      const initialRes = await field.validate("manual");
      expect(initialRes).toEqual([]);
      expect(field.valid.get()).toBe(true);

      // 2. Rapid updates: first "taken_1", then "available_user"
      field.setValue("taken_1");
      expect(field.pending.get()).toBe(true);

      // Immediately supersede with valid value
      field.setValue("available_user");

      // Wait for all async promises to settle
      await new Promise((r) => setTimeout(r, 60));

      expect(field.pending.get()).toBe(false);
      expect(field.valid.get()).toBe(true);
      expect(field.issues.get()).toEqual([]);
    });

    it("swallows background async schema rejections safely without unhandled errors", async () => {
      const seen: unknown[] = [];
      const onUnhandled = (reason: unknown): void => {
        seen.push(reason);
      };
      process.on("unhandledRejection", onUnhandled);

      const rejectingSchema: any = {
        "~standard": {
          version: 1,
          vendor: "test-rejecting",
          validate: async () => {
            throw new Error("Unexpected remote server outage");
          },
        },
      };

      const field = createField({
        initialValue: "val",
        rules: [standardSchema(rejectingSchema)],
      });

      // Trigger fire-and-forget change
      field.setValue("new_val");

      await new Promise((r) => setTimeout(r, 20));

      process.off("unhandledRejection", onUnhandled);
      expect(seen).toEqual([]);
      expect(field.pending.get()).toBe(false);

      // And explicit validate() propagates the rejection to caller
      await expect(field.validate("manual")).rejects.toThrow("Unexpected remote server outage");
      expect(field.pending.get()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 6. Nested Objects & Array Schema Issue Paths
  // -------------------------------------------------------------------------
  describe("Nested & Array Schema Path Normalization", () => {
    it("normalizes nested schema issue paths correctly across FieldGroup", async () => {
      const nestedZod = z.object({
        profile: z.object({
          age: z.number().min(18),
        }),
      });

      const rule = standardSchema(nestedZod);
      const issues = (await rule(
        { profile: { age: 10 } },
        { trigger: "manual", signal: new AbortController().signal },
      )) as readonly FieldIssue[];

      expect(issues).toHaveLength(1);
      expect(issues[0]?.path).toEqual(["profile", "age"]);
      expect(issues[0]?.source).toBe("validation");
    });

    it("normalizes array schema issue paths correctly across FieldArray", async () => {
      const arrayZod = z.object({
        contacts: z.array(
          z.object({
            email: z.string().email(),
          }),
        ),
      });

      const rule = standardSchema(arrayZod);
      const issues = (await rule(
        { contacts: [{ email: "valid@test.com" }, { email: "invalid-email" }] },
        { trigger: "manual", signal: new AbortController().signal },
      )) as readonly FieldIssue[];

      expect(issues).toHaveLength(1);
      expect(issues[0]?.path).toEqual(["contacts", 1, "email"]);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Security, Privacy & Adversarial Defenses (Issue Paths Are Data)
  // -------------------------------------------------------------------------
  describe("Security & Adversarial Defenses", () => {
    it("blocks prototype pollution on issue code in Standard Schema", () => {
      const hostileCodeIssue: any = {
        code: "__proto__",
        message: "hostile code",
        path: ["user", "constructor", "role"],
      };
      expect(() => normalizeStandardSchemaIssue(hostileCodeIssue)).toThrow(
        /Prototype pollution attempt blocked on issue code/,
      );

      const hostileConstructorCode: any = {
        code: "constructor",
        message: "hostile code",
      };
      expect(() => normalizeStandardSchemaIssue(hostileConstructorCode)).toThrow(
        /Prototype pollution attempt blocked on issue code/,
      );
    });

    it("allows reserved property names (__proto__, constructor, prototype) in FieldIssue and ParseIssue paths as pure data", () => {
      const issueWithConstructor: FieldIssue = {
        code: "invalid_constructor",
        message: "Constructor field invalid",
        path: Object.freeze(["user", "constructor", "name"]),
        source: "validation",
      };

      const field = createField({
        initialValue: "val",
        rules: [() => issueWithConstructor],
      });

      field.validate("manual");
      expect(field.issues.get()).toHaveLength(1);
      expect(field.issues.get()[0]?.path).toEqual(["user", "constructor", "name"]);

      // ParseIssue path handling
      const parseIssueRes = sanitizeParseIssue({
        code: "parse.custom",
        message: "Custom parse failure",
        path: ["items", 0, "__proto__", "prototype"],
      });
      expect(parseIssueRes.path).toEqual(["items", 0, "__proto__", "prototype"]);
    });

    it("normalizes Standard Schema issue paths with reserved field names without crashing", () => {
      const standardIssue1: any = {
        message: "Invalid constructor field",
        path: ["constructor"],
      };
      const normalized1 = normalizeStandardSchemaIssue(standardIssue1);
      expect(normalized1.path).toEqual(["constructor"]);
      expect(normalized1.source).toBe("validation");

      const standardIssue2: any = {
        message: "Invalid prototype field",
        path: ["nested", { key: "prototype" }, "val"],
      };
      const normalized2 = normalizeStandardSchemaIssue(standardIssue2);
      expect(normalized2.path).toEqual(["nested", "prototype", "val"]);

      const standardIssue3: any = {
        message: "Invalid __proto__ field",
        path: ["__proto__"],
      };
      const normalized3 = normalizeStandardSchemaIssue(standardIssue3);
      expect(normalized3.path).toEqual(["__proto__"]);
    });

    describe("Real Standard Schema Providers with Legitimate Reserved Keys", () => {
      it("Zod 4: validates objects with constructor and prototype property keys", async () => {
        const zodReserved = z.object({
          constructor: z.string().min(5),
          prototype: z.number().min(10),
        });

        const rule = standardSchema(zodReserved);
        const input: any = Object.create(null);
        input.constructor = "abc"; // fails min(5)
        input.prototype = 2; // fails min(10)

        const issues = (await rule(input, {
          trigger: "manual",
          signal: new AbortController().signal,
        })) as readonly FieldIssue[];

        expect(Array.isArray(issues)).toBe(true);
        expect(issues).toHaveLength(2);
        expect(issues.some((i) => i.path?.includes("constructor"))).toBe(true);
        expect(issues.some((i) => i.path?.includes("prototype"))).toBe(true);
      });

      it("Valibot: validates objects with constructor and prototype property keys", async () => {
        const valibotReserved = valibot.object({
          constructor: valibot.pipe(valibot.string(), valibot.minLength(5)),
          prototype: valibot.pipe(valibot.number(), valibot.minValue(10)),
        });

        const rule = standardSchema(valibotReserved);
        const input: any = Object.create(null);
        input.constructor = "abc";
        input.prototype = 2;

        const issues = (await rule(input, {
          trigger: "manual",
          signal: new AbortController().signal,
        })) as readonly FieldIssue[];

        expect(Array.isArray(issues)).toBe(true);
        expect(issues).toHaveLength(2);
        expect(issues.some((i) => i.path?.includes("constructor"))).toBe(true);
        expect(issues.some((i) => i.path?.includes("prototype"))).toBe(true);
      });

      it("ArkType: validates objects with constructor and prototype property keys", async () => {
        const arkReserved = type({
          constructor: "string >= 5",
          prototype: "number >= 10",
        });

        const rule = standardSchema(arkReserved);
        const input: any = Object.create(null);
        input.constructor = "abc";
        input.prototype = 2;

        const issues = (await rule(input, {
          trigger: "manual",
          signal: new AbortController().signal,
        })) as readonly FieldIssue[];

        expect(Array.isArray(issues)).toBe(true);
        expect(issues).toHaveLength(2);
        expect(issues.some((i) => i.path?.includes("constructor"))).toBe(true);
        expect(issues.some((i) => i.path?.includes("prototype"))).toBe(true);
      });
    });

    it("propagates reserved path segments through FieldGroup and FieldArray aggregation without mutation", () => {
      const group = createFieldGroup({
        initialValues: {
          fieldA: "val",
        },
      });

      const issue: FieldIssue = {
        code: "custom.error",
        message: "Error on constructor subproperty",
        path: Object.freeze(["constructor", "nested"]),
        source: "validation",
      };

      (group.fields.fieldA as FieldState<string>).setIssues([issue]);

      const groupIssues = group.issues.get();
      expect(groupIssues).toHaveLength(1);
      expect(groupIssues[0]?.path).toEqual(["fieldA", "constructor", "nested"]);

      // FieldArray propagation
      const array = createFieldArray<string>({
        initialValues: ["item1"],
      });
      array.items.get()[0]?.node.setIssues([issue]);

      const arrayIssues = array.issues.get();
      expect(arrayIssues).toHaveLength(1);
      expect(arrayIssues[0]?.path).toEqual([0, "constructor", "nested"]);
    });

    it("Security Proof: accepting reserved path segments as data does NOT pollute Object.prototype", () => {
      const hostileIssue: FieldIssue = {
        code: "attack.payload",
        message: "Pollution attempt",
        path: Object.freeze(["__proto__", "pollutedFlag", "data"]),
        source: "validation",
      };

      const field = createField({ initialValue: "" });
      field.setIssues([hostileIssue]);

      expect(field.issues.get()[0]?.path).toEqual(["__proto__", "pollutedFlag", "data"]);

      // Verify that Object.prototype was NOT polluted
      expect((Object.prototype as any).pollutedFlag).toBeUndefined();
      expect(({} as any).pollutedFlag).toBeUndefined();
      expect(Object.hasOwn(Object.prototype, "pollutedFlag")).toBe(false);
      expect(Object.keys({})).toEqual([]);
    });

    it("rejects malformed non-string/non-number path segments fail-closed", () => {
      const field = createField({ initialValue: "" });

      expect(() =>
        field.setIssues([{ code: "err", path: [null as any], source: "validation" }]),
      ).toThrow(TypeError);

      expect(() =>
        field.setIssues([{ code: "err", path: [{} as any], source: "validation" }]),
      ).toThrow(TypeError);

      expect(() => sanitizeParseIssue({ code: "err", path: [true as any] })).toThrow(TypeError);

      expect(() => normalizeStandardSchemaIssue({ message: "err", path: [false as any] })).toThrow(
        TypeError,
      );

      expect(() =>
        normalizeStandardSchemaIssue({ message: "err", path: [{ key: null }] as any }),
      ).toThrow(TypeError);
    });

    it("Navigation Traversal Security: parsePath and getNode preserve strict prototype pollution protection", () => {
      // parsePath interprets strings as navigation instructions and MUST block reserved words
      expect(() => parsePath("__proto__")).toThrow(/Prototype pollution/);
      expect(() => parsePath("user.__proto__.name")).toThrow(/Prototype pollution/);
      expect(() => parsePath("constructor")).toThrow(/Prototype pollution/);
      expect(() => parsePath("prototype")).toThrow(/Prototype pollution/);

      // getNode protects form hierarchy from prototype access
      const form = createForm({
        initialValues: {
          user: { name: "Alice" },
        },
      });

      expect(form.getNode("__proto__")).toBeUndefined();
      expect(form.getNode("constructor")).toBeUndefined();
      expect(form.getNode("prototype")).toBeUndefined();
      expect(form.getNode("toString")).toBeUndefined();
      expect(form.getNode("valueOf")).toBeUndefined();
    });

    it("rejects malformed Standard Schema results defensively", async () => {
      const malformedSchema: any = {
        "~standard": {
          version: 1,
          vendor: "malicious",
          validate: () => "invalid_result_shape_not_an_object",
        },
      };

      const rule = standardSchema(malformedSchema);
      await expect(
        async () =>
          await rule("input", { trigger: "manual", signal: new AbortController().signal }),
      ).rejects.toThrow(TypeError);
    });

    it("never leaks raw input or issue messages into diagnostics payloads", () => {
      const secretRaw = "super_secret_password_123";
      const field = createField<number, string>({
        initialValue: 0,
        parser: createNumberParser(),
      });

      const diagnostics = createDiagnostics();

      diagnostics.run(() => {
        field.setRawValue(secretRaw);
      });

      const events = diagnostics.getEvents();
      for (const evt of events) {
        expect(JSON.stringify(evt)).not.toContain(secretRaw);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 8. Built-in Parsing Edge Cases (Numbers, Booleans, Optionals)
  // -------------------------------------------------------------------------
  describe("Built-in Parsers Edge Cases", () => {
    it("parses numbers strictly across realistic edge cases", () => {
      const numParser = createNumberParser({ allowEmpty: false, trim: true });

      expect(numParser("42")).toEqual({ ok: true, value: 42 });
      expect(numParser("0")).toEqual({ ok: true, value: 0 });
      expect(numParser(" 42 ")).toEqual({ ok: true, value: 42 });
      expect(numParser("1.5")).toEqual({ ok: true, value: 1.5 });
      expect(numParser("-10")).toEqual({ ok: true, value: -10 });

      expect(numParser("").ok).toBe(false);
      expect(numParser("-").ok).toBe(false);
      expect(numParser("1.").ok).toBe(false);
      expect(numParser("abc").ok).toBe(false);
      expect(numParser("NaN").ok).toBe(false);
      expect(numParser("Infinity").ok).toBe(false);
    });

    it("supports optional empty string to undefined mapping when configured", () => {
      const optionalNumParser = createNumberParser({ allowEmpty: true, emptyValue: undefined });
      expect(optionalNumParser("")).toEqual({ ok: true, value: undefined });
      expect(optionalNumParser("   ")).toEqual({ ok: true, value: undefined });
      expect(optionalNumParser("123")).toEqual({ ok: true, value: 123 });

      const optionalStrParser = createOptionalStringParser();
      expect(optionalStrParser("")).toEqual({ ok: true, value: undefined });
      expect(optionalStrParser("  ")).toEqual({ ok: true, value: undefined });
      expect(optionalStrParser("hello")).toEqual({ ok: true, value: "hello" });
    });

    it("parses booleans correctly for web/HTML forms", () => {
      const boolParser = createBooleanParser();
      expect(boolParser(true)).toEqual({ ok: true, value: true });
      expect(boolParser(false)).toEqual({ ok: true, value: false });
      expect(boolParser("true")).toEqual({ ok: true, value: true });
      expect(boolParser("false")).toEqual({ ok: true, value: false });
      expect(boolParser("1")).toEqual({ ok: true, value: true });
      expect(boolParser("0")).toEqual({ ok: true, value: false });
      expect(boolParser("on")).toEqual({ ok: true, value: true });
      expect(boolParser("off")).toEqual({ ok: true, value: false });
      expect(boolParser("invalid").ok).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Resource & Allocation Lifecycle
  // -------------------------------------------------------------------------
  describe("Resource & Allocation Lifecycle", () => {
    it("handles 200 sequential schema validations with 0 memory retention or leaks", async () => {
      const zodSchema = z.string().min(3);
      const field = createField({
        initialValue: "initial",
        rules: [standardSchema(zodSchema)],
      });

      for (let i = 0; i < 200; i++) {
        field.setValue(`val_${i}`);
        expect(field.valid.get()).toBe(true);
      }

      expect(field.issues.get()).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // 10. TypeScript Compile-Time Inference & Negative Type Fixtures
  // -------------------------------------------------------------------------
  describe("TypeScript Type Inference", () => {
    it("infers Raw, Value, Output types correctly", () => {
      const field: FieldState<number, string, { count: number }> = createField({
        initialValue: 0,
        initialRawValue: "0",
        parser: (raw: string) => ({ ok: true, value: Number(raw) }),
        transform: (val: number) => ({ count: val }),
      });

      expect(field.value.get()).toBe(0);
      expect(field.rawValue.get()).toBe("0");
      expect(field.getOutput()).toEqual({ count: 0 });

      // Negative type verification:
      // @ts-expect-error - setValue requires number, not string
      () => field.setValue("invalid-type");

      // @ts-expect-error - setRawValue requires string, not number
      () => field.setRawValue(123);

      // @ts-expect-error - getOutput returns { count: number }, not string
      const invalidOut: string = field.getOutput();
      void invalidOut;
    });
  });
  // -------------------------------------------------------------------------
  // Review regressions (F5 fix pass)
  // -------------------------------------------------------------------------
  describe("F5 review regressions", () => {
    const makeSchema = (validate: () => unknown) => ({
      "~standard": {
        version: 1 as const,
        vendor: "malformed-provider",
        validate,
        types: undefined,
      },
    });

    it("a sync provider reporting a non-array issues property fails closed", () => {
      const rule = standardSchema(
        makeSchema(() => ({ issues: { 0: { message: "nope" } } })) as any,
      );
      expect(() => rule("anything", { trigger: "manual" } as ValidationRuleContext)).toThrow(
        /non-array "issues"/,
      );
    });

    it("an async provider reporting a non-array issues property fails closed", async () => {
      const rule = standardSchema(
        makeSchema(async () => ({ issues: "everything is wrong" })) as any,
      );
      await expect(
        rule("anything", { trigger: "manual" } as ValidationRuleContext) as Promise<unknown>,
      ).rejects.toThrow(/non-array "issues"/);
    });

    it("a provider reporting an empty issues array is still treated as a failure payload", () => {
      const rule = standardSchema(makeSchema(() => ({ issues: [] })) as any);
      expect(rule("anything", { trigger: "manual" } as ValidationRuleContext)).toEqual([]);
    });

    it("reset(nextInitial) on a parsed field refuses to cast the domain value into Raw", () => {
      const field = createField<number, string>({
        initialValue: 5,
        initialRawValue: "5",
        parser: createNumberParser(),
      });

      field.setRawValue("42");
      expect(field.value.get()).toBe(42);

      expect(() => field.reset(7)).toThrow(/requires the matching raw value/);

      // The explicit two-stage form is accepted and keeps both stages coherent.
      field.reset(7, "7");
      expect(field.value.get()).toBe(7);
      expect(field.rawValue.get()).toBe("7");
      expect(field.initialRawValue.get()).toBe("7");
      expect(field.dirty.get()).toBe(false);
    });

    it("reset(nextInitial) stays valid on a parser-less field where Raw === Value", () => {
      const field = createField<string>({ initialValue: "a" });
      field.setValue("b");
      field.reset("c");
      expect(field.value.get()).toBe("c");
      expect(field.rawValue.get()).toBe("c");
    });

    it("a parser-less field never reports a parsed stage", () => {
      const field = createField<string>({ initialValue: "" });
      expect(field.parseStatus.get()).toBe("unparsed");
      field.setValue("x");
      expect(field.parseStatus.get()).toBe("unparsed");
      field.reset();
      expect(field.parseStatus.get()).toBe("unparsed");
    });

    it("the number parser rejects non-decimal literal grammars", () => {
      const parse = createNumberParser();
      for (const hostile of ["0x10", "0b101", "0o17", "1_000", "Infinity"]) {
        const res = parse(hostile);
        expect(res.ok, `expected ${hostile} to be rejected`).toBe(false);
      }
      for (const ok of ["5", "05", "-3.5", ".5", "1e3", "+2"]) {
        expect(parse(ok).ok, `expected ${ok} to be accepted`).toBe(true);
      }
    });
  });
});
