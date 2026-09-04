import { createField, createForm } from "@vii-labs/form";
import { bindField, bindForm } from "@vii-labs/form/vanilla";
import type { ViiP1kBridge } from "./types.js";

export function mountSubmitNative(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <form id="submit-form">
      <label for="submit-input">Username</label>
      <input id="submit-input" type="text" />
      <div id="submit-issue"></div>
      <button id="submit-btn" type="submit">Submit Form</button>
    </form>
  `;

  const formElement = document.getElementById("submit-form") as HTMLFormElement;
  const input = document.getElementById("submit-input") as HTMLInputElement;
  const issue = document.getElementById("submit-issue") as HTMLDivElement;

  const usernameField = createField<string>({
    initialValue: "",
    rules: [
      (val: string) => (val.trim() === "" ? { code: "required", message: "Required" } : null),
    ],
  });

  const form = createForm({
    fields: { username: usernameField },
  });

  const fieldBinding = bindField(usernameField, input, { issueElement: issue });

  const formBinding = bindForm(form, formElement, {
    action: async (values) => {
      bridge.actionCallCount++;
      return { saved: true, values };
    },
    onSubmitSuccess: (result) => {
      bridge.lastSubmitResult = result;
    },
    onSubmitError: (issues) => {
      bridge.lastSubmitResult = { invalid: true, issues };
    },
    onSubmitException: (err) => {
      bridge.lastException = err;
    },
  });

  bridge.form = form;
  bridge.field = usernameField;
  bridge.binding = fieldBinding;
  bridge.formBinding = formBinding;
}

export function mountSubmitException(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <form id="submit-form">
      <label for="submit-input">Input</label>
      <input id="submit-input" type="text" value="valid" />
      <button id="submit-btn" type="submit">Submit Rejecting</button>
    </form>
  `;

  const formElement = document.getElementById("submit-form") as HTMLFormElement;
  const input = document.getElementById("submit-input") as HTMLInputElement;

  const field = createField<string>({ initialValue: "valid" });
  const form = createForm({ fields: { field } });

  const fieldBinding = bindField(field, input);

  const formBinding = bindForm(form, formElement, {
    action: async () => {
      bridge.actionCallCount++;
      throw new Error("Simulated network explosion");
    },
    onSubmitException: (err) => {
      bridge.lastException = err;
    },
  });

  bridge.form = form;
  bridge.field = field;
  bridge.binding = fieldBinding;
  bridge.formBinding = formBinding;
}

export function mountSubmitLifecycle(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <form id="lifecycle-form">
      <label for="title-input">Title</label>
      <input id="title-input" type="text" value="initial" />
      <div id="title-issue"></div>
      <button id="lifecycle-submit-btn" type="submit">Submit</button>
    </form>
  `;

  const formElement = document.getElementById("lifecycle-form") as HTMLFormElement;
  const input = document.getElementById("title-input") as HTMLInputElement;
  const issue = document.getElementById("title-issue") as HTMLDivElement;

  let resolveSubmitValidation: () => void = () => undefined;
  const validationPromise = new Promise<null>((res) => {
    resolveSubmitValidation = () => res(null);
  });
  bridge.resolvers["resolveSubmitValidation"] = resolveSubmitValidation;

  const titleField = createField<string>({
    initialValue: "initial",
    rules: [
      async () => {
        await validationPromise;
        return null;
      },
    ],
  });

  const form = createForm({
    fields: { title: titleField },
  });

  const fieldBinding = bindField(titleField, input, { issueElement: issue });

  const formBinding = bindForm(form, formElement, {
    action: async (values) => {
      bridge.actionCallCount++;
      return values;
    },
    onSubmitSuccess: (res) => {
      bridge.lastSubmitResult = res;
    },
  });

  bridge.form = form;
  bridge.field = titleField;
  bridge.binding = fieldBinding;
  bridge.formBinding = formBinding;
}

export function mountServerIssues(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <div>
        <label for="field-a">Field A</label>
        <input id="field-a" type="text" value="alpha" />
        <div id="issue-a"></div>
      </div>
      <div>
        <label for="field-b">Field B</label>
        <input id="field-b" type="text" value="beta" />
        <div id="issue-b"></div>
      </div>
    </div>
  `;

  const inputA = document.getElementById("field-a") as HTMLInputElement;
  const issueA = document.getElementById("issue-a") as HTMLDivElement;
  const inputB = document.getElementById("field-b") as HTMLInputElement;
  const issueB = document.getElementById("issue-b") as HTMLDivElement;

  const fieldA = createField<string>({ initialValue: "alpha" });
  const fieldB = createField<string>({ initialValue: "beta" });

  const form = createForm({
    fields: { a: fieldA, b: fieldB },
  });

  const bindingA = bindField(fieldA, inputA, { issueElement: issueA });
  const bindingB = bindField(fieldB, inputB, { issueElement: issueB });

  bridge.triggerServerIssues = async () => {
    await form.submit(async () => ({
      ok: false,
      issues: [
        { code: "err_a", message: "Server error on field A", path: ["a"] },
        { code: "err_b", message: "Server error on field B", path: ["b"] },
      ],
    }));
  };

  bridge.form = form;
  bridge.fieldA = fieldA;
  bridge.fieldB = fieldB;
  bridge.bindingA = bindingA;
  bridge.bindingB = bindingB;
}
