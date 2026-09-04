import { createField, createNumberParser } from "@vii-labs/form";
import { bindField } from "@vii-labs/form/vanilla";
import type { ViiP1kBridge } from "./types.js";

export function mountVanillaText(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <label for="text-input">Text Field</label>
      <input id="text-input" type="text" />
      <div id="text-issue"></div>
    </div>
  `;

  const input = document.getElementById("text-input") as HTMLInputElement;
  const issue = document.getElementById("text-issue") as HTMLDivElement;

  const field = createField<string>({
    initialValue: "",
    rules: [
      (val: string) => {
        bridge.validationCount++;
        return val === "invalid" ? { code: "custom_err", message: "Invalid text" } : null;
      },
    ],
  });

  input.addEventListener("input", () => {
    bridge.inputEventCount++;
  });
  input.addEventListener("change", () => {
    bridge.changeEventCount++;
  });

  field.rawValue.subscribe(() => {
    bridge.rawCommitCount++;
  });

  const binding = bindField(field, input, { issueElement: issue });

  bridge.field = field;
  bridge.binding = binding;
}

export function mountVanillaCheckbox(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <label for="checkbox-input">Checkbox Field</label>
      <input id="checkbox-input" type="checkbox" />
    </div>
  `;

  const input = document.getElementById("checkbox-input") as HTMLInputElement;
  const field = createField<boolean>({ initialValue: false });

  input.addEventListener("change", () => {
    bridge.changeEventCount++;
  });

  field.value.subscribe(() => {
    bridge.rawCommitCount++;
  });

  const binding = bindField(field, input);
  bridge.field = field;
  bridge.binding = binding;
}

export function mountVanillaRadio(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <label><input id="radio-a" type="radio" name="choice" value="A" /> Option A</label>
      <label><input id="radio-b" type="radio" name="choice" value="B" /> Option B</label>
    </div>
  `;

  const radioA = document.getElementById("radio-a") as HTMLInputElement;
  const radioB = document.getElementById("radio-b") as HTMLInputElement;

  const field = createField<string>({ initialValue: "A" });

  const bindingA = bindField(field, radioA);
  const bindingB = bindField(field, radioB);

  bridge.field = field;
  bridge.bindingA = bindingA;
  bridge.bindingB = bindingB;
}

export function mountVanillaSelectOne(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <label for="select-input">Select Fruit</label>
      <select id="select-input">
        <option value="apple">Apple</option>
        <option value="banana">Banana</option>
        <option value="cherry">Cherry</option>
      </select>
    </div>
  `;

  const select = document.getElementById("select-input") as HTMLSelectElement;
  const field = createField<string>({ initialValue: "apple" });

  const binding = bindField(field, select);
  bridge.field = field;
  bridge.binding = binding;
}

export function mountVanillaFile(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <label for="file-input">Upload Document</label>
      <input id="file-input" type="file" />
    </div>
  `;

  const input = document.getElementById("file-input") as HTMLInputElement;
  const field = createField<FileList | null>({ initialValue: null });

  const binding = bindField(field, input);
  bridge.field = field;
  bridge.binding = binding;
}

export function mountParserRaw(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <label for="parser-input">Number Input</label>
      <input id="parser-input" type="text" />
      <div id="parser-issue"></div>
    </div>
  `;

  const input = document.getElementById("parser-input") as HTMLInputElement;
  const issue = document.getElementById("parser-issue") as HTMLDivElement;

  const field = createField<number, string>({
    initialValue: 42,
    initialRawValue: "42",
    parser: createNumberParser(),
  });

  const binding = bindField(field, input, { issueElement: issue });
  bridge.field = field;
  bridge.binding = binding;
}

export function mountSafeSink(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `
    <div id="scenario-container">
      <label for="sink-input">Input</label>
      <input id="sink-input" type="text" value="xss" />
      <div id="sink-issue"></div>
    </div>
  `;

  const input = document.getElementById("sink-input") as HTMLInputElement;
  const issue = document.getElementById("sink-issue") as HTMLDivElement;

  const field = createField<string>({
    initialValue: "xss",
    rules: [
      (val: string) => {
        if (val === "xss") {
          return {
            code: "xss_test",
            message: '<img src=x onerror="globalThis.__viiP1kXss = true">',
          };
        }
        if (val === "script") {
          return {
            code: "script_test",
            message: "<script>window.__viiP1kXss = true</script>",
          };
        }
        return null;
      },
    ],
  });

  const binding = bindField(field, input, { issueElement: issue });
  field.validate("change");

  bridge.field = field;
  bridge.binding = binding;
}

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

  const field = createField<string>({
    initialValue: "",
    rules: [
      () => {
        bridge.validationCount++;
        return null;
      },
    ],
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
