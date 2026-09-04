import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { createField, createForm, type FieldState, type FormInstance } from "@vii-labs/form";
import { useField, useForm } from "@vii-labs/form/react";
import type { ViiP1kBridge } from "./types.js";

interface ReactFormProps {
  titleField: FieldState<string>;
  form: FormInstance<{ title: FieldState<string> }>;
  bridge: ViiP1kBridge;
}

function ReactFormComponent({ titleField, form, bridge }: ReactFormProps) {
  const title = useField(titleField);
  const formState = useForm(form);

  return (
    <div id="react-form-view">
      <label htmlFor="react-title-input">React Title</label>
      <input
        id="react-title-input"
        type="text"
        value={title.rawValue ?? ""}
        onChange={(e) => title.setRawValue(e.target.value)}
        onBlur={() => title.setTouched(true)}
      />
      <div id="react-title-pending">{title.pending ? "pending" : "settled"}</div>
      <div id="react-title-status">{title.validationStatus}</div>
      <div id="react-title-value">{String(title.value)}</div>
      <div id="react-form-dirty">{formState.dirty ? "dirty" : "pristine"}</div>
      <div id="react-render-count">{++bridge.reactRenderCount}</div>
    </div>
  );
}

export function mountReactLifecycle(app: HTMLElement, bridge: ViiP1kBridge): void {
  app.innerHTML = `<div id="react-root"></div>`;
  const container = document.getElementById("react-root")!;

  let resolveAsyncValidation: () => void = () => undefined;
  const validationPromise = new Promise<{ code: string; message: string } | null>((res) => {
    resolveAsyncValidation = () => res(null);
  });
  bridge.resolvers["resolveReactAsync"] = resolveAsyncValidation;

  const titleField = createField<string>({
    initialValue: "Initial Title",
    rules: [() => validationPromise],
  });

  const form = createForm({
    fields: { title: titleField },
  });

  bridge.field = titleField;
  bridge.form = form;
  bridge.reactRenderCount = 0;

  let root: Root | null = createRoot(container);
  root.render(<ReactFormComponent titleField={titleField} form={form} bridge={bridge} />);

  bridge.unmountReact = () => {
    if (root) {
      root.unmount();
      root = null;
    }
  };

  bridge.remountReact = () => {
    if (!root) {
      root = createRoot(container);
      root.render(<ReactFormComponent titleField={titleField} form={form} bridge={bridge} />);
    }
  };
}
