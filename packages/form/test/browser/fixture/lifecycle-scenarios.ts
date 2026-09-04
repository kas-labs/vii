import { createField, createForm } from "@vii-labs/form";
import { bindField } from "@vii-labs/form/vanilla";
import type { ViiP1kBridge } from "./types.js";

export function mountFocusBlur(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <label for="blur-input">First Input</label>
      <input id="blur-input" type="text" />
      <div id="blur-issue"></div>

      <label for="other-input">Second Input</label>
      <input id="other-input" type="text" />
    </div>
  `;

  const blurInput = document.getElementById("blur-input") as HTMLInputElement;
  const issue = document.getElementById("blur-issue") as HTMLDivElement;

  const field = createField<string>({
    initialValue: "",
    validateOn: "blur",
    rules: [
      (val: string) => {
        bridge.validationCount++;
        return val.trim() === "" ? { code: "required", message: "Field is required" } : null;
      },
    ],
  });

  const binding = bindField(field, blurInput, { issueElement: issue });
  bridge.field = field;
  bridge.binding = binding;
}

export function mountIssueFocus(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <label for="focus-input">Focus Test Input</label>
      <input id="focus-input" type="text" value="valid" />
      <div id="focus-issue"></div>
    </div>
  `;

  const input = document.getElementById("focus-input") as HTMLInputElement;
  const issue = document.getElementById("focus-issue") as HTMLDivElement;

  const field = createField<string>({
    initialValue: "valid",
    rules: [
      (val: string) => (val === "error" ? { code: "err", message: "Error message text" } : null),
    ],
  });

  const binding = bindField(field, input, { issueElement: issue });
  bridge.field = field;
  bridge.binding = binding;
}

export function mountAsyncCancellation(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <label for="async-input">Async Validated</label>
      <input id="async-input" type="text" value="" />
      <div id="async-issue"></div>
    </div>
  `;

  const input = document.getElementById("async-input") as HTMLInputElement;
  const issue = document.getElementById("async-issue") as HTMLDivElement;

  const resolverMap: Record<string, (res?: unknown) => void> = {};
  bridge.resolvers = resolverMap;

  const field = createField<string>({
    initialValue: "",
    rules: [
      (val: string) => {
        return new Promise((resolve) => {
          resolverMap[val] = resolve;
        });
      },
    ],
  });

  const binding = bindField(field, input, { issueElement: issue });
  bridge.field = field;
  bridge.binding = binding;
}

export function mountRouteTeardown(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="route-container">
      <div id="route-subtree">
        <label for="route-input">Route Input</label>
        <input id="route-input" type="text" value="initial" />
        <div id="route-issue"></div>
      </div>
    </div>
  `;

  const container = document.getElementById("route-container") as HTMLDivElement;
  const subtree = document.getElementById("route-subtree") as HTMLDivElement;
  const input = document.getElementById("route-input") as HTMLInputElement;
  const issue = document.getElementById("route-issue") as HTMLDivElement;

  let resolveAsyncValidation: () => void = () => undefined;
  const validationPromise = new Promise<{ code: string; message: string } | null>((res) => {
    resolveAsyncValidation = () => res({ code: "late_error", message: "Stale late error" });
  });
  bridge.resolvers["resolveRouteAsync"] = resolveAsyncValidation;

  const field = createField<string>({
    initialValue: "initial",
    rules: [() => validationPromise],
  });

  const form = createForm({
    fields: { routeField: field },
  });

  const binding = bindField(field, input, { issueElement: issue });

  bridge.field = field;
  bridge.form = form;
  bridge.binding = binding;
  bridge.detachedElement = input;
  bridge.detachedIssue = issue;

  bridge.teardown = () => {
    binding.dispose();
    container.removeChild(subtree);
  };
}
