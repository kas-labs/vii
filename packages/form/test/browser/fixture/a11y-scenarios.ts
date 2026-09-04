import { createField, createForm } from "@vii-labs/form";
import { bindField, bindForm } from "@vii-labs/form/vanilla";
import type { ViiP1kBridge } from "./types.js";

export function mountA11yFull(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <form id="a11y-form">
      <div>
        <label for="a11y-email">Email Address</label>
        <input id="a11y-email" type="email" aria-invalid="grammar" />
        <div id="a11y-email-issue"></div>
      </div>
      <div>
        <label for="a11y-name">Full Name</label>
        <input id="a11y-name" type="text" />
        <div id="a11y-name-issue"></div>
      </div>
      <button id="a11y-submit" type="submit">Submit Information</button>
    </form>
  `;

  const formElement = document.getElementById("a11y-form") as HTMLFormElement;
  const emailInput = document.getElementById("a11y-email") as HTMLInputElement;
  const emailIssue = document.getElementById("a11y-email-issue") as HTMLDivElement;
  const nameInput = document.getElementById("a11y-name") as HTMLInputElement;
  const nameIssue = document.getElementById("a11y-name-issue") as HTMLDivElement;

  const emailField = createField<string>({
    initialValue: "",
    rules: [
      (val: string) =>
        val.includes("@") ? null : { code: "invalid_email", message: "Valid email is required" },
    ],
  });

  const nameField = createField<string>({
    initialValue: "John Doe",
  });

  const form = createForm({
    fields: { email: emailField, name: nameField },
  });

  const emailBinding = bindField(emailField, emailInput, { issueElement: emailIssue });
  const nameBinding = bindField(nameField, nameInput, { issueElement: nameIssue });
  const formBinding = bindForm(form, formElement, {
    action: async () => undefined,
  });

  bridge.form = form;
  bridge.emailField = emailField;
  bridge.nameField = nameField;
  bridge.emailBinding = emailBinding;
  bridge.nameBinding = nameBinding;
  bridge.formBinding = formBinding;
}

export function mountOverlappingAria(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <label for="overlap-input">Shared Element</label>
      <input id="overlap-input" type="text" aria-invalid="grammar" />
      <div id="overlap-issue-a"></div>
      <div id="overlap-issue-b"></div>
    </div>
  `;

  const input = document.getElementById("overlap-input") as HTMLInputElement;
  const issueA = document.getElementById("overlap-issue-a") as HTMLDivElement;
  const issueB = document.getElementById("overlap-issue-b") as HTMLDivElement;

  const fieldA = createField<string>({ initialValue: "valid-a" });
  const fieldB = createField<string>({
    initialValue: "invalid-b",
    rules: [() => ({ code: "err_b", message: "Issue from B" })],
  });
  fieldB.validate("change");

  const bindingA = bindField(fieldA, input, { issueElement: issueA });
  const bindingB = bindField(fieldB, input, { issueElement: issueB });

  bridge.fieldA = fieldA;
  bridge.fieldB = fieldB;
  bridge.bindingA = bindingA;
  bridge.bindingB = bindingB;
  bridge.targetElement = input;
}
