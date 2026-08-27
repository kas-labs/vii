/**
 * Form Research F10 — Consumer A (Vanilla Onboarding) Validation Tests
 */

import { describe, expect, it } from "vitest";
import {
  createOnboardingForm,
  type OnboardingFormValues,
} from "../consumers/consumer-a-vanilla.js";
import {
  VALID_ONBOARDING_DATA,
  PRIVACY_SENTINELS,
  SECRET_PASSWORD_F10_DO_NOT_LOG,
} from "../fixtures/domain-data.js";
import { type FieldState, type FieldArray } from "../../form-core.js";
import { bindField, bindForm, type DomElementLike } from "../../adapters/vanilla.js";

class MockDomElement implements DomElementLike {
  public value: string = "";
  public checked: boolean = false;
  public type: string = "text";
  public textContent: string | null = null;
  public id: string = "";
  private attributes: Map<string, string> = new Map();
  public eventListeners: Map<string, Set<(e: any) => void>> = new Map();

  constructor(type = "text") {
    this.type = type;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
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

describe("Form Research F10: Consumer A (Vanilla Onboarding)", () => {
  it("verifies 5-step navigation and step-level validity gates", async () => {
    const controller = createOnboardingForm();

    expect(controller.currentStep.get()).toBe(1);
    expect(controller.isStep1Valid.get()).toBe(false);

    // Cannot advance while Step 1 is invalid
    expect(controller.nextStep()).toBe(false);
    expect(controller.currentStep.get()).toBe(1);

    // Populate Step 1 (Account)
    const emailNode = controller.form.getNode("account.email") as FieldState<string>;
    const pwdNode = controller.form.getNode("account.password") as FieldState<string>;
    const confirmNode = controller.form.getNode("account.confirmPassword") as FieldState<string>;

    emailNode.setValue("user@example.com");
    pwdNode.setValue("SecurePassword123!");
    confirmNode.setValue("MismatchPassword");

    expect(controller.isStep1Valid.get()).toBe(false);

    confirmNode.setValue("SecurePassword123!");
    expect(controller.isStep1Valid.get()).toBe(true);

    // Advance to Step 2
    expect(controller.nextStep()).toBe(true);
    expect(controller.currentStep.get()).toBe(2);

    // Step 2 (Profile)
    const fnNode = controller.form.getNode("profile.firstName") as FieldState<string>;
    const lnNode = controller.form.getNode("profile.lastName") as FieldState<string>;
    const ageNode = controller.form.getNode("profile.age") as FieldState<number, string>;

    fnNode.setValue("Jane");
    lnNode.setValue("Doe");
    ageNode.setRawValue("25");

    expect(controller.isStep2Valid.get()).toBe(true);
    expect(controller.nextStep()).toBe(true);
    expect(controller.currentStep.get()).toBe(3);

    // Step 3 (Addresses FieldArray)
    const addrArray = controller.form.getNode("addresses") as FieldArray<any>;
    expect(addrArray.items.get().length).toBe(1);
    const streetNode = (addrArray.items.get()[0]!.node as any).fields[
      "street"
    ] as FieldState<string>;
    streetNode.setValue("100 Market St");

    expect(controller.isStep3Valid.get()).toBe(true);
    expect(controller.nextStep()).toBe(true);
    expect(controller.currentStep.get()).toBe(4);

    // Step 4 (Preferences / Conditional taxId)
    expect(controller.isStep4Valid.get()).toBe(true);
    expect(controller.nextStep()).toBe(true);
    expect(controller.currentStep.get()).toBe(5);

    controller.dispose();
  });

  it("verifies async username validation with debounce & cancellation", async () => {
    let checkCallCount = 0;
    const asyncCheck = async (username: string, signal: AbortSignal) => {
      checkCallCount++;
      return new Promise<boolean>((resolve, reject) => {
        const timer = setTimeout(() => {
          if (signal.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
          } else {
            resolve(username !== "taken_admin");
          }
        }, 30);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    };

    const controller = createOnboardingForm(undefined, asyncCheck);
    const usernameNode = controller.form.getNode("account.username") as FieldState<string>;

    // Rapid typing
    usernameNode.setValue("adm");
    usernameNode.setValue("admi");
    usernameNode.setValue("taken_admin");

    // Wait for debounce and async validation
    await new Promise((r) => setTimeout(r, 150));

    expect(usernameNode.issues.get().length).toBe(1);
    expect(usernameNode.issues.get()[0]?.code).toBe("username_taken");

    // Type a unique username
    usernameNode.setValue("valid_user");
    await new Promise((r) => setTimeout(r, 150));

    expect(usernameNode.issues.get().length).toBe(0);
    expect(usernameNode.valid.get()).toBe(true);

    controller.dispose();
  });

  it("verifies parser-backed raw input preservation and domain evaluation", () => {
    const controller = createOnboardingForm();
    const ageNode = controller.form.getNode("profile.age") as FieldState<number, string>;

    // Intermediate input "-"
    ageNode.setRawValue("-");
    expect(ageNode.rawValue.get()).toBe("-");
    expect(ageNode.value.get()).toBe(0); // domain value remains pristine
    expect(ageNode.parseStatus.get()).toBe("invalid");
    expect(ageNode.invalid.get()).toBe(true);

    // Number with leading zero "025" -> parses to 25
    ageNode.setRawValue("025");
    expect(ageNode.rawValue.get()).toBe("025");
    expect(ageNode.value.get()).toBe(25);
    expect(ageNode.parseStatus.get()).toBe("parsed");
    expect(ageNode.valid.get()).toBe(true);

    controller.dispose();
  });

  it("verifies FieldArray address reordering and stable item identities", () => {
    const controller = createOnboardingForm(VALID_ONBOARDING_DATA);
    const addrArray = controller.form.getNode("addresses") as FieldArray<any>;

    expect(addrArray.items.get().length).toBe(2);
    const id0 = addrArray.items.get()[0]!.id;
    const id1 = addrArray.items.get()[1]!.id;

    // Swap items
    addrArray.swap(0, 1);

    expect(addrArray.items.get()[0]!.id).toBe(id1);
    expect(addrArray.items.get()[1]!.id).toBe(id0);
    expect(addrArray.dirty.get()).toBe(true);

    // Push new item
    addrArray.push({
      id: "addr_3",
      street: "789 Broadway",
      city: "San Jose",
      postalCode: "95113",
    });
    expect(addrArray.items.get().length).toBe(3);

    // Remove first item
    addrArray.remove(0);
    expect(addrArray.items.get().length).toBe(2);
    expect(addrArray.items.get()[0]!.id).toBe(id0);

    controller.dispose();
  });

  it("verifies Vanilla DOM binding and accessible attribute projection", () => {
    const controller = createOnboardingForm();
    const emailNode = controller.form.getNode("account.email") as FieldState<string>;

    const inputEl = new MockDomElement("input");
    const issueEl = new MockDomElement("span");
    issueEl.id = "email-error-span";

    const binding = bindField(emailNode, inputEl, {
      issueElement: issueEl,
      ariaInvalid: true,
      ariaDescribedBy: true,
    });

    expect(inputEl.getAttribute("aria-invalid")).toBe("false");

    // Invalid input
    emailNode.setValue("not-an-email");
    expect(inputEl.getAttribute("aria-invalid")).toBe("true");
    expect(issueEl.textContent).toBe("Valid email is required.");
    expect(inputEl.getAttribute("aria-describedby")).toContain("email-error-span");

    // Valid input
    emailNode.setValue("valid@example.com");
    expect(inputEl.getAttribute("aria-invalid")).toBe("false");
    expect(issueEl.textContent).toBe("");

    binding.dispose();
    controller.dispose();
  });

  it("verifies submission lifecycle and server issue attachment on Review step", async () => {
    const controller = createOnboardingForm(VALID_ONBOARDING_DATA);

    // Submit with simulated server rejection
    const submitResult = await controller.form.submit(async () => {
      return {
        ok: false,
        issues: [
          {
            code: "email_taken",
            message: "Email address is already registered.",
            path: ["account", "email"],
            source: "server",
          },
          {
            code: "system_busy",
            message: "Application queue is currently full.",
            path: ["systemQueue"],
            source: "server",
          },
        ],
      };
    });

    expect(submitResult.status).toBe("server-invalid");
    expect(controller.form.submissionStatus.get()).toBe("failed");

    const emailNode = controller.form.getNode("account.email") as FieldState<string>;
    expect(emailNode.serverIssues.get().length).toBe(1);
    expect(emailNode.serverIssues.get()[0]?.message).toBe("Email address is already registered.");

    // Unknown path is retained at form level
    expect(controller.form.serverIssues.get().length).toBe(1);
    expect(controller.form.serverIssues.get()[0]?.code).toBe("system_busy");

    // Editing email clears only email's server issue
    emailNode.setValue("new.email@example.com");
    expect(emailNode.serverIssues.get().length).toBe(0);
    expect(controller.form.serverIssues.get().length).toBe(1); // Form issue remains

    controller.dispose();
  });
});
