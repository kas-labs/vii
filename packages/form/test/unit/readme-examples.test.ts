import { describe, expect, it } from "vitest";
import {
  createField,
  createFieldArray,
  createFieldGroup,
  createForm,
  createNumberParser,
  createStringParser,
  standardSchema,
} from "../../src/index.js";
import { useField, useFieldArray, useForm } from "../../src/adapters/react/index.js";
import { bindField, bindForm } from "../../src/adapters/vanilla/index.js";
import {
  createAngularField,
  createAngularFieldArray,
  createAngularForm,
} from "../../src/adapters/angular/index.js";
import {
  createVueField,
  createVueFieldArray,
  createVueForm,
} from "../../src/adapters/vue/index.js";

describe("README runnable code examples", () => {
  it("executes root core primitives (createField, createFieldGroup, createFieldArray, createForm)", async () => {
    // 1. Basic Field
    const username = createField({
      initialValue: "alice",
      rules: [(v: string) => (v.length < 3 ? { code: "min_len", message: "Too short" } : null)],
    });
    expect(username.value.get()).toBe("alice");
    expect(username.valid.get()).toBe(true);
    username.setValue("al");
    expect(username.valid.get()).toBe(false);
    expect(username.issues.get()[0]?.message).toBe("Too short");

    // 2. Parser-backed Field
    const age = createField<number, string>({
      initialValue: 25,
      initialRawValue: "25",
      parser: createNumberParser({ trim: true }),
    });
    age.setRawValue("05");
    expect(age.rawValue.get()).toBe("05");
    expect(age.value.get()).toBe(5);

    // 3. Field Group
    const userGroup = createFieldGroup({
      fields: { username, age },
    });
    expect(userGroup.value.get()).toEqual({ username: "al", age: 5 });

    // 4. Field Array
    const hobbies = createFieldArray({
      items: [createField({ initialValue: "reading" })],
    });
    hobbies.append(createField({ initialValue: "hiking" }));
    expect(hobbies.value.get()).toEqual(["reading", "hiking"]);

    // 5. Root Form & Model A submission
    const form = createForm({
      fields: {
        user: userGroup,
        hobbies,
      },
    });

    username.setValue("alice");
    const result = await form.submit(async (val) => {
      return { ok: true, result: val };
    });
    expect(result.status).toBe("succeeded");
    expect(form.submissionStatus.get()).toBe("succeeded");

    // Model A: edits after submit update dirty but preserve succeeded
    username.setValue("alicia");
    expect(form.dirty.get()).toBe(true);
    expect(form.submissionStatus.get()).toBe("succeeded");

    // Standard Schema bridge
    const mockSchema = {
      "~standard": {
        version: 1,
        vendor: "readme-test",
        validate: (val: unknown) =>
          typeof val === "string" && val.length > 0
            ? { value: val }
            : { issues: [{ message: "Required" }] },
      },
    };
    const schemaRule = standardSchema(mockSchema as never);
    const schemaField = createField({
      initialValue: "",
      rules: [schemaRule],
    });
    await schemaField.validate();
    expect(schemaField.valid.get()).toBe(false);

    // Builtin String Parser
    const trimmedField = createField({
      initialValue: "",
      initialRawValue: "",
      parser: createStringParser({ trim: true }),
    });
    trimmedField.setRawValue("  padded  ");
    expect(trimmedField.value.get()).toBe("padded");

    // Cleanup
    form.dispose();
    schemaField.dispose();
    trimmedField.dispose();
  });

  it("exports React adapter hooks (useField, useForm, useFieldArray)", () => {
    expect(typeof useField).toBe("function");
    expect(typeof useForm).toBe("function");
    expect(typeof useFieldArray).toBe("function");
  });

  it("executes Vanilla DOM adapter (bindField, bindForm)", async () => {
    class MockElement {
      value = "initial";
      type = "text";
      id = "test-elem";
      textContent = "";
      private listeners = new Map<string, Set<(e: unknown) => void>>();
      addEventListener(event: string, handler: (e: unknown) => void) {
        if (!this.listeners.has(event)) this.listeners.set(event, new Set());
        this.listeners.get(event)!.add(handler);
      }
      removeEventListener(event: string, handler: (e: unknown) => void) {
        this.listeners.get(event)?.delete(handler);
      }
      dispatch(event: string) {
        const evt = { type: event, target: this, preventDefault: () => {} };
        this.listeners.get(event)?.forEach((h) => h(evt));
      }
      getAttribute() {
        return null;
      }
      setAttribute() {}
      removeAttribute() {}
    }

    const field = createField({ initialValue: "initial" });
    const input = new MockElement();
    const binding = bindField(field, input as never);

    input.value = "updated";
    input.dispatch("input");
    expect(field.rawValue.get()).toBe("updated");

    binding.dispose();
    field.dispose();

    const form = createForm({ fields: { title: createField({ initialValue: "test" }) } });
    const formElem = new MockElement();
    let submitted = false;
    const formBinding = bindForm(form, formElem as never, {
      action: async () => {
        submitted = true;
        return { ok: true };
      },
    });
    formElem.dispatch("submit");
    await new Promise((r) => setTimeout(r, 10));
    expect(submitted).toBe(true);

    formBinding.dispose();
    form.dispose();
  });

  it("executes Angular adapter (createAngularField, createAngularForm, createAngularFieldArray)", () => {
    const field = createField({ initialValue: "angular-val" });
    const angularField = createAngularField(field);
    expect(angularField.value()).toBe("angular-val");
    angularField.setValue("new-angular-val");
    expect(angularField.value()).toBe("new-angular-val");
    angularField.dispose();
    field.dispose();

    const form = createForm({ fields: { item: createField({ initialValue: 1 }) } });
    const angularForm = createAngularForm(form);
    expect(angularForm.submissionStatus()).toBe("idle");
    angularForm.dispose();
    form.dispose();

    const array = createFieldArray({ items: [createField({ initialValue: "item-0" })] });
    const angularArray = createAngularFieldArray(array);
    expect(angularArray.length()).toBe(1);
    angularArray.dispose();
    array.dispose();
  });

  it("executes Vue adapter (createVueField, createVueForm, createVueFieldArray)", () => {
    const field = createField({ initialValue: "vue-val" });
    const vueField = createVueField(field);
    expect(vueField.value.value).toBe("vue-val");
    vueField.setValue("new-vue-val");
    expect(vueField.value.value).toBe("new-vue-val");
    vueField.dispose();
    field.dispose();

    const form = createForm({ fields: { item: createField({ initialValue: 10 }) } });
    const vueForm = createVueForm(form);
    expect(vueForm.submissionStatus.value).toBe("idle");
    vueForm.dispose();
    form.dispose();

    const array = createFieldArray({ items: [createField({ initialValue: "v-0" })] });
    const vueArray = createVueFieldArray(array);
    expect(vueArray.length.value).toBe(1);
    vueArray.dispose();
    array.dispose();
  });
});
