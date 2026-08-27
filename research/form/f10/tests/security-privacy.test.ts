/**
 * Form Research F10 — Security, Hardening & Diagnostics Privacy Tests
 */

import { describe, expect, it } from "vitest";
import { createDiagnostics } from "../../../../packages/core/src/index.js";
import {
  createForm,
  parsePath,
  type FormInstance,
  type FieldState,
  type ServerIssueInput,
} from "../../form-core.js";
import {
  PRIVACY_SENTINELS,
  SECRET_PASSWORD_F10_DO_NOT_LOG,
  SECRET_TOKEN_F10_DO_NOT_LOG,
  HOSTILE_XSS_PAYLOADS,
} from "../fixtures/domain-data.js";
import { bindField, type DomElementLike } from "../../adapters/vanilla.js";

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
    return true;
  }
}

describe("Form Research F10: Security & Privacy Validation", () => {
  it("verifies DOM XSS defense: hostile issue strings render safely as text", () => {
    const form = createForm({
      initialValues: { email: "user@example.com" },
    });
    const emailNode = form.getNode("email") as FieldState<string>;

    const inputEl = new MockDomElement("input");
    const errorEl = new MockDomElement("div");

    const binding = bindField(emailNode, inputEl, {
      issueElement: errorEl,
    });

    for (const hostileXss of HOSTILE_XSS_PAYLOADS) {
      emailNode.setServerIssues([
        {
          code: "server_xss",
          message: hostileXss,
          path: ["email"],
          source: "server",
        },
      ]);

      // Verify textContent contains raw text
      expect(errorEl.textContent).toBe(hostileXss);
    }

    binding.dispose();
    form.dispose();
  });

  it("verifies prototype pollution defense: __proto__, constructor, prototype in data vs sinks", () => {
    const form = createForm({
      initialValues: {
        __proto__: "data_proto",
        constructor: "data_constructor",
        normalField: "hello",
      },
    });

    expect(Object.prototype.hasOwnProperty("data_proto")).toBe(false);
    expect(form.values.get().normalField).toBe("hello");

    // Server issue with reserved word path segment is kept at form level without polluting Object.prototype
    form.setServerIssues([
      {
        code: "invalid_constructor_field",
        message: "Constructor field error",
        path: ["constructor"],
        source: "server",
      },
      {
        code: "unmapped_remote_field",
        message: "Unknown field error",
        path: ["unmappedProperty"],
        source: "server",
      },
    ]);

    // parsePath on reserved property throws security error
    expect(() => parsePath("constructor")).toThrow(/Prototype pollution attempt blocked/);
    expect(form.getNode("constructor")).toBeUndefined();

    // The field node itself (created safely with Object.create(null)) receives the issue
    const constructorField = (form.fields as any).constructor as FieldState<string>;
    expect(constructorField.serverIssues.get().length).toBe(1);
    expect(constructorField.serverIssues.get()[0]?.code).toBe("invalid_constructor_field");

    // Unmapped path is preserved at form-level without prototype pollution
    expect(form.serverIssues.get().length).toBe(1);
    expect(form.serverIssues.get()[0]?.code).toBe("unmapped_remote_field");
    expect(Object.prototype.hasOwnProperty("invalid_constructor_field")).toBe(false);
    expect(Object.prototype.hasOwnProperty("data_constructor")).toBe(false);

    form.dispose();
  });

  it("verifies diagnostics telemetry privacy: zero sentinel strings emitted", () => {
    const diag = createDiagnostics({ maxEvents: 1000 });

    diag.run(() => {
      const form = createForm({
        initialValues: {
          password: SECRET_PASSWORD_F10_DO_NOT_LOG,
          token: SECRET_TOKEN_F10_DO_NOT_LOG,
        },
      });

      const pwdNode = form.getNode("password") as FieldState<string>;
      pwdNode.setValue("another_secret_password_123");
      pwdNode.setRawValue(SECRET_PASSWORD_F10_DO_NOT_LOG);
      pwdNode.validate("change");

      form.setServerIssues([
        {
          code: "token_invalid",
          message: `Server rejection for ${SECRET_TOKEN_F10_DO_NOT_LOG}`,
          path: ["token"],
          source: "server",
        },
      ]);

      form.dispose();
    });

    const emittedEvents = diag.getEvents();
    const serializedDiagnostics = JSON.stringify(emittedEvents);

    for (const sentinel of PRIVACY_SENTINELS) {
      expect(serializedDiagnostics.includes(sentinel)).toBe(false);
    }
  });
});
