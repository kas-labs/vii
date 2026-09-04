import type { ViiP1kBridge } from "./types.js";
import { createField, createNumberParser } from "@vii-labs/form";
import { bindField } from "@vii-labs/form/vanilla";

export function mountImeText(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <label for="ime-input">IME Input</label>
      <input id="ime-input" type="text" />
      <div id="ime-issue"></div>
    </div>
  `;

  const input = document.getElementById("ime-input") as HTMLInputElement;
  const issue = document.getElementById("ime-issue") as HTMLDivElement;

  bridge.validationCount = 0;
  bridge.rawCommitCount = 0;

  const field = createField<string>({
    initialValue: "",
    rules: [
      () => {
        bridge.validationCount++;
        return null;
      },
    ],
  });

  field.rawValue.subscribe(() => {
    bridge.rawCommitCount++;
  });

  bridge.imeEvents = [];

  const logEvent = (e: Event) => {
    const data = "data" in e ? (e as { data?: string }).data : undefined;
    const isComposing =
      "isComposing" in e ? (e as { isComposing?: boolean }).isComposing : undefined;
    bridge.imeEvents?.push({
      type: e.type,
      data,
      value: input.value,
      isComposing,
    });
  };

  input.addEventListener("compositionstart", logEvent);
  input.addEventListener("compositionupdate", logEvent);
  input.addEventListener("compositionend", logEvent);
  input.addEventListener("input", logEvent);

  const binding = bindField(field, input, { issueElement: issue });
  bridge.field = field;
  bridge.binding = binding;
}

export function mountImeParser(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <label for="ime-parser-input">IME Parser Input</label>
      <input id="ime-parser-input" type="text" value="42" />
      <div id="ime-parser-issue"></div>
    </div>
  `;

  const input = document.getElementById("ime-parser-input") as HTMLInputElement;
  const issue = document.getElementById("ime-parser-issue") as HTMLDivElement;

  bridge.validationCount = 0;
  bridge.rawCommitCount = 0;

  const field = createField<number, string>({
    initialValue: 42,
    initialRawValue: "42",
    parser: createNumberParser(),
    rules: [
      () => {
        bridge.validationCount++;
        return null;
      },
    ],
  });

  field.rawValue.subscribe(() => {
    bridge.rawCommitCount++;
  });

  const binding = bindField(field, input, { issueElement: issue });
  bridge.field = field;
  bridge.binding = binding;
}
