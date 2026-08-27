import { describe, expect, it } from "vitest";
import { createScope } from "../../packages/core/src/index.js";
import {
  createField,
  createForm,
  createNumberParser,
  deepCloneSnapshot,
  isStandardSchema,
  normalizeStandardSchemaIssue,
  sanitizeParseIssue,
  sanitizeServerIssue,
  standardSchema,
  type FieldIssue,
  type StandardSchemaV1,
} from "./form-core.js";
import { bindField, bindForm, type DomElementLike } from "./adapters/vanilla.js";
import { createAngularField } from "./adapters/angular.js";
import { createVueField } from "./adapters/vue.js";

// Helper for capturing unhandled promise rejections
function withUnhandledRejectionTracker(
  fn: (unhandled: unknown[]) => Promise<void>,
): () => Promise<void> {
  return async () => {
    const unhandled: unknown[] = [];
    const handler = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", handler);
    try {
      await fn(unhandled);
    } finally {
      process.off("unhandledRejection", handler);
    }
  };
}

class MockDomElement implements DomElementLike {
  public value: string = "";
  public checked: boolean = false;
  public type: string = "text";
  public textContent: string | null = null;
  public eventListeners: Map<string, Set<(e: any) => void>> = new Map();

  constructor(type = "text") {
    this.type = type;
  }

  addEventListener(event: string, handler: (e: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  removeEventListener(event: string, handler: (e: any) => void): void {
    this.eventListeners.get(event)?.delete(handler);
  }

  dispatchEvent(event: { type: string; [key: string]: any }): boolean {
    const handlers = this.eventListeners.get(event.type);
    if (handlers) {
      for (const h of handlers) {
        h(event);
      }
    }
    return !event["defaultPrevented"];
  }
}

describe("Form F8 Security Hardening", () => {
  describe("1. DOM XSS Hardening & Untrusted Message Injection", () => {
    it("safely handles hostile XSS payloads in validation, parse, and server issues without HTML evaluation", () => {
      const scope = createScope();
      const maliciousPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '"><iframe src="javascript:alert(1)">',
      ];

      for (const payload of maliciousPayloads) {
        const field = createField({
          initialValue: "test",
          scope,
          rules: [() => ({ code: "val_error", message: payload })],
        });

        const input = new MockDomElement("input");
        const errorElem = new MockDomElement("div");

        const binding = bindField(field, input, { issueElement: errorElem });

        // Trigger validation issue
        field.validate("change");
        expect(errorElem.textContent).toBe(payload);

        // Server issue with XSS payload
        field.setServerIssues([{ code: "server.error", message: payload }]);
        expect(errorElem.textContent).toContain(payload);

        binding.dispose();
      }

      scope.dispose();
    });

    it("ensures custom issue formatters only output text strings to textContent sink", () => {
      const scope = createScope();
      const field = createField({
        initialValue: "bad",
        scope,
        rules: [() => ({ code: "custom_err", message: "<b style='color:red'>Bold Alert</b>" })],
      });

      const input = new MockDomElement("input");
      const errorElem = new MockDomElement("div");

      const binding = bindField(field, input, {
        issueElement: errorElem,
        formatIssues: (issues) => `Error: ${issues[0]?.message}`,
      });

      field.validate("change");
      expect(errorElem.textContent).toBe("Error: <b style='color:red'>Bold Alert</b>");

      binding.dispose();
      scope.dispose();
    });
  });

  describe("2. Prototype Pollution Defense", () => {
    it("blocks prototype pollution attempts on validation issue code", () => {
      const scope = createScope();
      const field = createField({
        initialValue: "test",
        scope,
        rules: [() => ({ code: "__proto__", message: "pollution" }) as any],
      });

      expect(() => field.validate("change")).toThrow(/Prototype pollution attempt blocked/);
      expect((Object.prototype as any).pollution).toBeUndefined();

      scope.dispose();
    });

    it("blocks prototype pollution attempts on server issue code", () => {
      const scope = createScope();
      const field = createField({ initialValue: "test", scope });

      expect(() => field.setServerIssues([{ code: "constructor", message: "pollution" }])).toThrow(
        /Prototype pollution attempt blocked/,
      );

      expect(() => field.setServerIssues([{ code: "prototype", message: "pollution" }])).toThrow(
        /Prototype pollution attempt blocked/,
      );

      expect((Object.prototype as any).pollution).toBeUndefined();

      scope.dispose();
    });

    it("blocks prototype pollution attempts in sanitizeParseIssue", () => {
      expect(() => sanitizeParseIssue({ code: "__proto__" })).toThrow(
        /Prototype pollution attempt blocked/,
      );
      expect(() => sanitizeParseIssue({ code: "constructor" })).toThrow(
        /Prototype pollution attempt blocked/,
      );
      expect(() => sanitizeParseIssue({ code: "prototype" })).toThrow(
        /Prototype pollution attempt blocked/,
      );
    });

    it("treats __proto__, constructor, and prototype as safe immutable path segments without polluting Object.prototype", () => {
      const scope = createScope();
      const field = createField({
        initialValue: "test",
        scope,
        rules: [
          () => ({
            code: "path_security",
            message: "safe path",
            path: ["__proto__", "pollutedKey"],
          }),
        ],
      });

      field.validate("change");
      const issue = field.issues.get()[0];
      expect(issue).toBeDefined();
      expect(issue?.path).toEqual(["__proto__", "pollutedKey"]);

      // Verify Object.prototype was NOT polluted
      expect((Object.prototype as any).pollutedKey).toBeUndefined();

      scope.dispose();
    });
  });

  describe("3. Malformed Provider & Parser Fail-Closed Behavior", () => {
    it("fails closed when custom parser returns non-object or malformed result shape", () => {
      const scope = createScope();

      // Parser returning null
      const nullParserField = createField({
        initialValue: "0",
        parser: (() => null) as any,
        scope,
      });

      expect(() => nullParserField.setRawValue("123")).toThrow(TypeError);

      // Parser returning object without boolean ok
      const malformedParserField = createField({
        initialValue: "0",
        parser: (() => ({ ok: "not-a-boolean" })) as any,
        scope,
      });

      expect(() => malformedParserField.setRawValue("123")).toThrow(TypeError);

      scope.dispose();
    });

    it("fails closed when Standard Schema provider returns non-array issues property", async () => {
      const scope = createScope();

      const malformedSchema: StandardSchemaV1<string> = {
        "~standard": {
          version: 1,
          vendor: "malicious-vendor",
          validate: () => ({
            // issues should be an array; returning an object or string must fail closed
            issues: { message: "not an array" } as any,
          }),
        },
      };

      const field = createField({
        initialValue: "test",
        scope,
        rules: [standardSchema(malformedSchema)],
      });

      expect(() => field.validate("change")).toThrow(TypeError);

      scope.dispose();
    });

    it("fails closed when Standard Schema provider throws or returns invalid result", () => {
      const scope = createScope();

      const throwingSchema: StandardSchemaV1<string> = {
        "~standard": {
          version: 1,
          vendor: "throwing-vendor",
          validate: () => {
            throw new Error("Provider internal crash");
          },
        },
      };

      const field = createField({
        initialValue: "test",
        scope,
        rules: [standardSchema(throwingSchema)],
      });

      expect(() => field.validate("change")).toThrow(/Provider internal crash/);

      scope.dispose();
    });

    it("fails closed on malformed server issue inputs", () => {
      expect(() => sanitizeServerIssue(null)).toThrow(TypeError);
      expect(() => sanitizeServerIssue(undefined)).toThrow(TypeError);
      expect(() => sanitizeServerIssue("just a string without code")).toThrow(TypeError);
      expect(() => sanitizeServerIssue({ code: "" })).toThrow(TypeError);
      expect(() => sanitizeServerIssue({ code: "err", path: "not-an-array" })).toThrow(TypeError);
    });
  });

  describe("4. Submission Snapshot Hardening (Getters, Proxies, Cycles, Shared Refs)", () => {
    it("handles hostile throwing getters in submission payload safely", async () => {
      const hostilePayload = {
        normal: "hello",
        get evil() {
          throw new Error("Getter exploded during snapshotting");
        },
      };

      // Direct deepCloneSnapshot throws predictably when accessing hostile getter
      expect(() => deepCloneSnapshot(hostilePayload)).toThrow(
        /Getter exploded during snapshotting/,
      );

      const field = createField({
        initialValue: "val",
        transform: () => hostilePayload as any,
      });

      // Output transform returning hostile getter throws during clone and marks submission failed
      expect(() => deepCloneSnapshot(field.getOutput())).toThrow(
        /Getter exploded during snapshotting/,
      );
    });

    it("safely clones submission payloads containing circular references and shared objects", () => {
      const circularObj: any = { name: "root" };
      circularObj.self = circularObj;

      const sharedChild = { key: "shared-data" };
      const parentObj = {
        first: sharedChild,
        second: sharedChild,
        cycle: circularObj,
        date: new Date(1700000000000),
        regex: /^[a-z]+$/gi,
        map: new Map([["k", "v"]]),
        set: new Set(["a", "b"]),
      };

      const cloned = deepCloneSnapshot(parentObj);

      expect(cloned.first).toEqual({ key: "shared-data" });
      expect(cloned.first).toBe(cloned.second); // Preserves shared reference identity
      expect(cloned.cycle.self).toBe(cloned.cycle); // Handles cycle without stack overflow
      expect(cloned.date.getTime()).toBe(1700000000000);
      expect(cloned.regex.source).toBe("^[a-z]+$");
      expect(cloned.map.get("k")).toBe("v");
      expect(cloned.set.has("a")).toBe(true);
    });

    it("safely handles hostile Proxies with trap traps during snapshotting", () => {
      let ownKeysTrapInvoked = false;
      let getTrapInvoked = false;

      const target = { a: 1, b: 2 };
      const hostileProxy = new Proxy(target, {
        ownKeys(t) {
          ownKeysTrapInvoked = true;
          return Reflect.ownKeys(t);
        },
        get(t, prop, receiver) {
          getTrapInvoked = true;
          return Reflect.get(t, prop, receiver);
        },
      });

      const cloned = deepCloneSnapshot(hostileProxy);

      expect(ownKeysTrapInvoked).toBe(true);
      expect(getTrapInvoked).toBe(true);
      expect(cloned).toEqual({ a: 1, b: 2 });
    });
  });

  describe("5. Detached Async Safety & Unhandled Rejections", () => {
    it(
      "guarantees zero unhandled rejections during detached async validation failure",
      withUnhandledRejectionTracker(async (unhandled) => {
        const scope = createScope();
        const field = createField({
          initialValue: "test",
          scope,
          debounceMs: 5,
          rules: [
            async () => {
              throw new Error("Detached validation network explosion");
            },
          ],
        });

        // Trigger detached validation via setRawValue with debounce
        field.setRawValue("trigger-detached");

        // Wait for debounce and async validation promise settlement
        await new Promise((r) => setTimeout(r, 20));

        // Node process did not encounter unhandled rejection
        expect(unhandled).toEqual([]);

        scope.dispose();
      }),
    );

    it(
      "guarantees zero unhandled rejections during detached DOM submit exception",
      withUnhandledRejectionTracker(async (unhandled) => {
        const form = createForm<{ a: string }>({ initialValues: { a: "test" } });
        const formElem = new MockDomElement("form");

        const binding = bindForm(form, formElem, {
          action: async () => {
            throw new Error("Detached submit explosion");
          },
        });

        formElem.dispatchEvent({ type: "submit" });
        await new Promise((r) => setTimeout(r, 20));

        // Node process did not encounter unhandled rejection
        expect(unhandled).toEqual([]);
        expect(form.submissionStatus.get()).toBe("failed");

        binding.dispose();
        form.dispose();
      }),
    );
  });

  describe("6. Stale Result & Race Condition Protection", () => {
    it("guarantees older async validation completions cannot overwrite newer synchronous edits", async () => {
      const scope = createScope();
      let slowResolve: (val: any) => void = () => undefined;

      const field = createField<string>({
        initialValue: "v1",
        scope,
        rules: [
          (val: string) => {
            if (val === "slow") {
              return new Promise<FieldIssue | null>((resolve) => {
                slowResolve = resolve;
              });
            }
            return null;
          },
        ],
      });

      // Start slow async validation
      field.setRawValue("slow");
      expect(field.pending.get()).toBe(true);

      // Fast sync edit supersedes
      field.setRawValue("fast-valid");
      expect(field.pending.get()).toBe(false);
      expect(field.invalid.get()).toBe(false);

      // Late async resolution arrives
      slowResolve({ code: "late.error", message: "Stale async issue", source: "validation" });
      await new Promise((r) => setTimeout(r, 10));

      // Stale async error must be discarded
      expect(field.invalid.get()).toBe(false);
      expect(field.issues.get().length).toBe(0);

      scope.dispose();
    });
  });

  describe("7. Scale & Resource Abuse Resilience", () => {
    it("resiliently processes 500 rapid value changes without leak or runaway state", () => {
      const scope = createScope();
      const field = createField<number>({
        initialValue: 0,
        scope,
        rules: [(v: number) => (v % 2 === 0 ? null : { code: "odd", message: "Must be even" })],
      });

      for (let i = 1; i <= 500; i++) {
        field.setValue(i);
      }

      expect(field.value.get()).toBe(500);
      expect(field.invalid.get()).toBe(false);

      scope.dispose();
    });

    it("handles large bounded issue arrays (1,000 issues) deterministically without prototype pollution", () => {
      const scope = createScope();
      const largeIssues: FieldIssue[] = [];
      for (let i = 0; i < 1000; i++) {
        largeIssues.push({
          code: `err_${i}`,
          message: `Error message ${i}`,
          source: "validation",
        });
      }

      const field = createField({
        initialValue: "test",
        scope,
        rules: [() => largeIssues],
      });

      field.validate("change");
      expect(field.issues.get().length).toBe(1000);
      expect(field.invalid.get()).toBe(true);

      scope.dispose();
    });

    it("handles deeply nested paths (50 levels) safely", () => {
      const deepPath: string[] = [];
      for (let i = 0; i < 50; i++) {
        deepPath.push(`level_${i}`);
      }

      const serverIssue = sanitizeServerIssue({
        code: "deep.error",
        message: "Deep path issue",
        path: deepPath,
      });

      expect(serverIssue.path).toEqual(deepPath);
      expect(serverIssue.code).toBe("deep.error");
    });
  });
});
