import { describe, expect, it } from "vitest";
import { createDiagnostics, createScope } from "../../packages/core/src/index.js";
import {
  createField,
  createForm,
  createNumberParser,
  createOptionalStringParser,
  type FieldIssue,
} from "./form-core.js";
import { bindField, bindForm, type DomElementLike } from "./adapters/vanilla.js";
import { useField, useForm } from "./adapters/react.js";
import { createAngularField } from "./adapters/angular.js";
import { createVueField } from "./adapters/vue.js";

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

describe("Form F8 Privacy Hardening & Diagnostics Invariants", () => {
  const SENSITIVE_SENTINEL_PASSWORD = "SECRET_PASSWORD_DO_NOT_LOG_12345";
  const SENSITIVE_SENTINEL_TOKEN = "AUTH_TOKEN_SECRET_987654321";
  const SENSITIVE_SENTINEL_CREDIT_CARD = "4111_2222_3333_4444_SECRET_CARD";
  const SENSITIVE_SENTINEL_MESSAGE = "Secret server error with SECRET_PAYLOAD_999";

  describe("1. Sensitive Field Privacy in Diagnostics", () => {
    it("guarantees raw passwords, parsed values, and validation messages never leak into diagnostics", () => {
      const diagnostics = createDiagnostics({ maxEvents: 1000 });

      diagnostics.run(() => {
        const scope = createScope();
        const passwordField = createField<string>({
          initialValue: "",
          scope,
          rules: [
            (val: string) =>
              val.length >= 8
                ? null
                : {
                    code: "weak_password",
                    message: `Password "${val}" is too short and insecure`,
                  },
          ],
        });

        // Set sensitive value
        passwordField.setRawValue(SENSITIVE_SENTINEL_PASSWORD);
        passwordField.validate("change");

        // Validate that password is in field value for application UI
        expect(passwordField.value.get()).toBe(SENSITIVE_SENTINEL_PASSWORD);

        scope.dispose();
      });

      const events = diagnostics.getEvents();
      const serializedEvents = JSON.stringify(events);

      // CRITICAL PRIVACY INVARIANT: Sentinel password MUST NOT exist anywhere in diagnostics
      expect(serializedEvents).not.toContain(SENSITIVE_SENTINEL_PASSWORD);
      expect(serializedEvents).not.toContain("SECRET_PASSWORD");
    });

    it("guarantees parser failures and sensitive token strings never leak into diagnostics", () => {
      const diagnostics = createDiagnostics({ maxEvents: 1000 });

      diagnostics.run(() => {
        const scope = createScope();
        const numberField = createField({
          initialValue: 0,
          parser: createNumberParser(),
          scope,
        });

        // Try to parse sensitive string as number
        numberField.setRawValue(SENSITIVE_SENTINEL_TOKEN);

        expect(numberField.invalid.get()).toBe(true);
        expect(numberField.issues.get()[0]?.code).toBe("parse.invalid_number");

        scope.dispose();
      });

      const events = diagnostics.getEvents();
      const serializedEvents = JSON.stringify(events);

      // Sentinel token must never appear in diagnostics
      expect(serializedEvents).not.toContain(SENSITIVE_SENTINEL_TOKEN);
      expect(serializedEvents).not.toContain("AUTH_TOKEN");
    });

    it("guarantees server issue messages containing sensitive payloads never leak into diagnostics", () => {
      const diagnostics = createDiagnostics({ maxEvents: 1000 });

      diagnostics.run(() => {
        const form = createForm<{ apiKey: string }>({
          initialValues: { apiKey: SENSITIVE_SENTINEL_TOKEN },
        });

        form.setServerIssues([
          {
            code: "server.unauthorized",
            message: SENSITIVE_SENTINEL_MESSAGE,
            path: ["apiKey"],
          },
        ]);

        expect(form.submissionStatus.get()).toBe("idle");
        form.dispose();
      });

      const events = diagnostics.getEvents();
      const serializedEvents = JSON.stringify(events);

      // Neither the token nor the sensitive message should be in diagnostics
      expect(serializedEvents).not.toContain(SENSITIVE_SENTINEL_TOKEN);
      expect(serializedEvents).not.toContain(SENSITIVE_SENTINEL_MESSAGE);
      expect(serializedEvents).not.toContain("SECRET_PAYLOAD");
    });
  });

  describe("2. Safe Exception Diagnostics (Error Classification Only)", () => {
    it("records only Error name/type in synchronous parser/validation diagnostics without embedding message", () => {
      const diagnostics = createDiagnostics({ maxEvents: 1000 });

      diagnostics.run(() => {
        const scope = createScope();
        const field = createField({
          initialValue: "0",
          parser: () => {
            throw new TypeError(
              `Sensitive parse failure containing card: ${SENSITIVE_SENTINEL_CREDIT_CARD}`,
            );
          },
          scope,
        });

        expect(() => field.setRawValue("trigger-parse")).toThrow(TypeError);

        scope.dispose();
      });

      const events = diagnostics.getEvents();
      const failedEvents = events.filter((e) => e.type === "field.parse.failed");

      expect(failedEvents.length).toBeGreaterThanOrEqual(1);
      for (const ev of failedEvents) {
        expect(ev.payload).toEqual({ reason: "TypeError" });
      }

      const serializedEvents = JSON.stringify(events);
      expect(serializedEvents).not.toContain(SENSITIVE_SENTINEL_CREDIT_CARD);
    });

    it("records only Error name/type in submission failure diagnostics without embedding message", () => {
      const diagnostics = createDiagnostics({ maxEvents: 1000 });

      diagnostics.run(() => {
        const form = createForm<{ username: string }>({
          initialValues: { username: "user" },
          rules: [
            () => {
              throw new TypeError(`Validation crash with secret: ${SENSITIVE_SENTINEL_TOKEN}`);
            },
          ],
        });

        expect(() => form.validate("submit")).toThrow(TypeError);

        form.dispose();
      });

      const events = diagnostics.getEvents();
      const serializedEvents = JSON.stringify(events);
      expect(serializedEvents).not.toContain(SENSITIVE_SENTINEL_TOKEN);
    });
  });

  describe("3. Application State vs Diagnostics Boundary", () => {
    it("allows application UI to access field values and error messages while telemetry remains value-free", () => {
      const diagnostics = createDiagnostics({ maxEvents: 1000 });

      let uiValue: string = "";
      let uiMessage: string = "";

      diagnostics.run(() => {
        const scope = createScope();
        const field = createField({
          initialValue: SENSITIVE_SENTINEL_PASSWORD,
          scope,
          rules: [() => ({ code: "err", message: SENSITIVE_SENTINEL_MESSAGE })],
        });

        field.validate("change");

        // UI snapshot receives data for legitimate rendering
        uiValue = field.value.get();
        uiMessage = field.issues.get()[0]?.message ?? "";

        scope.dispose();
      });

      // Application UI legitimately holds values and messages
      expect(uiValue).toBe(SENSITIVE_SENTINEL_PASSWORD);
      expect(uiMessage).toBe(SENSITIVE_SENTINEL_MESSAGE);

      // Diagnostics strictly redacts all values and messages
      const serializedEvents = JSON.stringify(diagnostics.getEvents());
      expect(serializedEvents).not.toContain(SENSITIVE_SENTINEL_PASSWORD);
      expect(serializedEvents).not.toContain(SENSITIVE_SENTINEL_MESSAGE);
    });

    it("Vanilla onSubmitException passes Error to application callback without duplicating in telemetry", async () => {
      const diagnostics = createDiagnostics({ maxEvents: 1000 });
      let capturedError: unknown = null;

      const form = createForm<{ secret: string }>({
        initialValues: { secret: SENSITIVE_SENTINEL_TOKEN },
      });
      const formElem = new MockDomElement("form");

      const binding = bindForm(form, formElem, {
        action: () => {
          throw new Error(`API exception with token: ${SENSITIVE_SENTINEL_TOKEN}`);
        },
        onSubmitException: (err) => {
          capturedError = err;
        },
      });

      diagnostics.run(() => {
        formElem.dispatchEvent({ type: "submit" });
      });

      await new Promise((r) => setTimeout(r, 20));

      // Application callback receives the real error for handling
      expect(capturedError).toBeInstanceOf(Error);
      expect((capturedError as Error).message).toContain(SENSITIVE_SENTINEL_TOKEN);

      // Telemetry does not duplicate the secret
      const serializedEvents = JSON.stringify(diagnostics.getEvents());
      expect(serializedEvents).not.toContain(SENSITIVE_SENTINEL_TOKEN);

      binding.dispose();
      form.dispose();
    });
  });
});
