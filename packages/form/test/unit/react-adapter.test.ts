import { createElement, StrictMode, useEffect, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import {
  createField,
  createFieldArray,
  createFieldGroup,
  createForm,
  createNumberParser,
  type FieldState,
} from "../../src/index.js";
import { useField, useFieldArray, useForm } from "../../src/adapters/react/index.js";

const reactTestGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;

function render(element: ReactElement): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(element);
  });
  return renderer;
}

describe("React Adapter Unit Tests (P1h)", () => {
  describe("useField", () => {
    it("renders initial snapshot and updates on setValue", () => {
      const field = createField<string>({ initialValue: "initial" });
      const values: string[] = [];

      function FieldView({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        values.push(binding.value);
        return createElement("span", null, binding.value);
      }

      const renderer = render(createElement(FieldView, { target: field }));
      expect(values).toEqual(["initial"]);

      act(() => {
        field.setValue("updated");
      });

      expect(values).toEqual(["initial", "updated"]);
      act(() => {
        renderer.unmount();
      });
      field.dispose();
    });

    it("preserves parser-backed raw intermediate state and value separation", () => {
      const field = createField<number, string>({
        initialValue: 10,
        initialRawValue: "10",
        parser: createNumberParser(),
      });
      const rawValues: string[] = [];
      const domainValues: number[] = [];

      function NumberView({ target }: { target: FieldState<number, string> }) {
        const binding = useField(target);
        rawValues.push(binding.rawValue);
        domainValues.push(binding.value);
        return createElement("input", { value: binding.rawValue });
      }

      const renderer = render(createElement(NumberView, { target: field }));
      expect(rawValues).toEqual(["10"]);
      expect(domainValues).toEqual([10]);

      // User types invalid raw text "-"
      act(() => {
        field.setRawValue("-");
      });

      expect(field.parseStatus.get()).toBe("invalid");
      expect(field.parseIssue.get()?.code).toBe("parse.invalid_number");
      expect(rawValues[rawValues.length - 1]).toBe("-");
      expect(domainValues[domainValues.length - 1]).toBe(10);

      // User finishes typing "-42"
      act(() => {
        field.setRawValue("-42");
      });

      expect(field.parseStatus.get()).toBe("parsed");
      expect(field.dirty.get()).toBe(true);
      expect(rawValues[rawValues.length - 1]).toBe("-42");
      expect(domainValues[domainValues.length - 1]).toBe(-42);

      act(() => {
        renderer.unmount();
      });
      field.dispose();
    });

    it("tracks dirty, touched, blur, validationStatus, and issues", () => {
      const field = createField<string>({
        initialValue: "abc",
        rules: [
          (v: string) => (v.length < 3 ? { code: "min_length", message: "Too short" } : null),
        ],
        validateOn: "blur",
      });

      let bindingRef!: ReturnType<typeof useField<string>>;

      function View({ target }: { target: FieldState<string> }) {
        bindingRef = useField(target);
        return createElement("div", null, bindingRef.value);
      }

      const renderer = render(createElement(View, { target: field }));
      expect(bindingRef.dirty).toBe(false);
      expect(bindingRef.touched).toBe(false);
      expect(bindingRef.valid).toBe(true);
      expect(bindingRef.issues).toEqual([]);

      act(() => {
        bindingRef.setValue("ab");
      });
      expect(bindingRef.dirty).toBe(true);
      expect(bindingRef.touched).toBe(false);

      act(() => {
        bindingRef.blur();
      });
      expect(bindingRef.touched).toBe(true);
      expect(bindingRef.valid).toBe(false);
      expect(bindingRef.invalid).toBe(true);
      expect(bindingRef.issues.length).toBe(1);
      expect(bindingRef.issues[0]?.code).toBe("min_length");

      act(() => {
        bindingRef.reset();
      });
      expect(bindingRef.dirty).toBe(false);
      expect(bindingRef.touched).toBe(false);
      expect(bindingRef.value).toBe("abc");

      act(() => {
        renderer.unmount();
      });
      field.dispose();
    });

    it("observes server issues and localized clearing on field edit", async () => {
      const form = createForm({
        fields: {
          name: createField<string>({ initialValue: "test" }),
        },
      });
      const issuesList: unknown[] = [];

      function ServerIssueView({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        issuesList.push(binding.serverIssues);
        return createElement("div", null, binding.serverIssues.length);
      }

      const renderer = render(createElement(ServerIssueView, { target: form.fields.name }));
      expect(issuesList[0]).toEqual([]);

      await act(async () => {
        await form.submit(async () => ({
          ok: false,
          issues: [{ code: "server.taken", message: "Already taken", path: ["name"] }],
        }));
      });

      expect(issuesList[issuesList.length - 1]).toEqual([
        { code: "server.taken", message: "Already taken", path: undefined, source: "server" },
      ]);

      act(() => {
        form.fields.name.setValue("new_name");
      });
      expect(issuesList[issuesList.length - 1]).toEqual([]);

      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });

    it("preserves stable action references across renders", () => {
      const field = createField<string>({ initialValue: "hello" });
      let firstSetValue!: (v: string) => void;
      let firstReset!: () => void;
      let firstBlur!: () => void;
      let renderCount = 0;

      function ActionView({ target, tick }: { target: FieldState<string>; tick: number }) {
        const binding = useField(target);
        renderCount++;
        if (renderCount === 1) {
          firstSetValue = binding.setValue;
          firstReset = binding.reset;
          firstBlur = binding.blur;
        } else {
          expect(binding.setValue).toBe(firstSetValue);
          expect(binding.reset).toBe(firstReset);
          expect(binding.blur).toBe(firstBlur);
        }
        return createElement("span", { "data-tick": tick }, binding.value);
      }

      const renderer = render(createElement(ActionView, { target: field, tick: 1 }));

      act(() => {
        renderer.update(createElement(ActionView, { target: field, tick: 2 }));
      });

      act(() => {
        field.setValue("world");
      });

      expect(renderCount).toBe(3);
      act(() => {
        renderer.unmount();
      });
      field.dispose();
    });

    it("handles node replacement (fieldA -> fieldB) cleanly without cross-talk", () => {
      const fieldA = createField<string>({ initialValue: "A" });
      const fieldB = createField<string>({ initialValue: "B" });
      const renderedValues: string[] = [];

      function DynamicView({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        renderedValues.push(binding.value);
        return createElement("span", null, binding.value);
      }

      const renderer = render(createElement(DynamicView, { target: fieldA }));
      expect(renderedValues).toEqual(["A"]);

      // Switch to fieldB
      act(() => {
        renderer.update(createElement(DynamicView, { target: fieldB }));
      });
      expect(renderedValues).toEqual(["A", "B"]);

      // Mutating fieldA must NOT trigger re-render in component now bound to fieldB
      act(() => {
        fieldA.setValue("A_mutated");
      });
      expect(renderedValues).toEqual(["A", "B"]);

      // Mutating fieldB triggers update
      act(() => {
        fieldB.setValue("B_mutated");
      });
      expect(renderedValues).toEqual(["A", "B", "B_mutated"]);

      act(() => {
        renderer.unmount();
      });
      fieldA.dispose();
      fieldB.dispose();
    });

    it("stops receiving updates after component unmount", () => {
      const field = createField<string>({ initialValue: "live" });
      const rendered: string[] = [];

      function View({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        rendered.push(binding.value);
        return createElement("span", null, binding.value);
      }

      const renderer = render(createElement(View, { target: field }));
      expect(rendered).toEqual(["live"]);

      act(() => {
        renderer.unmount();
      });

      act(() => {
        field.setValue("after_unmount");
      });

      expect(rendered).toEqual(["live"]);
      expect(field.value.get()).toBe("after_unmount");
      field.dispose();
    });
  });

  describe("Snapshot Correctness & Freshness", () => {
    it("maintains referential identity when state is unchanged", () => {
      const field = createField<string>({ initialValue: "same" });
      const snapshots: unknown[] = [];

      function View({ target, count }: { target: FieldState<string>; count: number }) {
        const binding = useField(target);
        snapshots.push(binding);
        return createElement("span", { "data-c": count }, binding.value);
      }

      const renderer = render(createElement(View, { target: field, count: 1 }));
      act(() => {
        renderer.update(createElement(View, { target: field, count: 2 }));
      });

      expect(snapshots.length).toBe(2);
      expect(snapshots[0]).toBe(snapshots[1]);

      act(() => {
        renderer.unmount();
      });
      field.dispose();
    });

    it("observes pre-subscription mutations on first render", () => {
      const field = createField<string>({ initialValue: "initial" });
      const rendered: string[] = [];

      function Mutator({ target }: { target: FieldState<string> }) {
        useEffect(() => {
          target.setValue("mutated_before_subscribe");
        }, [target]);
        return null;
      }

      function Consumer({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        rendered.push(binding.value);
        return createElement("span", null, binding.value);
      }

      const renderer = render(
        createElement(
          "div",
          null,
          createElement(Mutator, { target: field, key: "m" }),
          createElement(Consumer, { target: field, key: "c" }),
        ),
      );

      expect(field.value.get()).toBe("mutated_before_subscribe");
      expect(rendered[rendered.length - 1]).toBe("mutated_before_subscribe");

      act(() => {
        renderer.unmount();
      });
      field.dispose();
    });
  });

  describe("Render Isolation", () => {
    it("mutating field A causes 0 re-renders in sibling field B component", () => {
      const form = createForm({
        fields: {
          name: createField({ initialValue: "Vitalii" }),
          email: createField({ initialValue: "vitalii@example.com" }),
        },
      });

      let nameRenders = 0;
      let emailRenders = 0;

      function NameComponent({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        nameRenders++;
        return createElement("span", null, binding.value);
      }

      function EmailComponent({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        emailRenders++;
        return createElement("span", null, binding.value);
      }

      const renderer = render(
        createElement(
          "div",
          null,
          createElement(NameComponent, { target: form.fields.name }),
          createElement(EmailComponent, { target: form.fields.email }),
        ),
      );

      expect(nameRenders).toBe(1);
      expect(emailRenders).toBe(1);

      // Mutate Name 3 times
      act(() => {
        form.fields.name.setValue("V1");
      });
      act(() => {
        form.fields.name.setValue("V2");
      });
      act(() => {
        form.fields.name.setValue("V3");
      });

      expect(nameRenders).toBe(4);
      expect(emailRenders).toBe(1); // EXACTLY 0 sibling re-renders!

      // Mutate Email once
      act(() => {
        form.fields.email.setValue("new@example.com");
      });

      expect(nameRenders).toBe(4); // EXACTLY 0 sibling re-renders!
      expect(emailRenders).toBe(2);

      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });

    it("server issue on field A does not re-render sibling field B", async () => {
      const form = createForm({
        fields: {
          username: createField({ initialValue: "alice" }),
          bio: createField({ initialValue: "developer" }),
        },
      });

      let userRenders = 0;
      let bioRenders = 0;

      function UserView({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        userRenders++;
        return createElement("span", null, binding.value);
      }

      function BioView({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        bioRenders++;
        return createElement("span", null, binding.value);
      }

      // Establish validated baseline
      await form.validate();

      const renderer = render(
        createElement(
          "div",
          null,
          createElement(UserView, { target: form.fields.username }),
          createElement(BioView, { target: form.fields.bio }),
        ),
      );

      expect(userRenders).toBe(1);
      expect(bioRenders).toBe(1);

      // Route server issue targeting username only
      await act(async () => {
        await form.submit(async () => ({
          ok: false,
          issues: [{ code: "username.taken", message: "Taken", path: ["username"] }],
        }));
      });

      expect(userRenders).toBe(2);
      expect(bioRenders).toBe(1); // 0 re-renders on sibling!

      // Clear server issue by editing username
      act(() => {
        form.fields.username.setValue("alice_edited");
      });

      expect(userRenders).toBe(3);
      expect(bioRenders).toBe(1); // 0 re-renders on sibling!

      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });
  });

  describe("useForm", () => {
    it("observes form aggregate values, dirty, touched, and submission lifecycle", async () => {
      const form = createForm({
        fields: {
          title: createField({ initialValue: "Draft" }),
          score: createField({ initialValue: 10 }),
        },
      });

      let formRenders = 0;
      let bindingRef!: ReturnType<typeof useForm<typeof form.fields>>;

      function FormView({ target }: { target: typeof form }) {
        bindingRef = useForm(target);
        formRenders++;
        return createElement("div", null, bindingRef.value.title);
      }

      const renderer = render(createElement(FormView, { target: form }));
      expect(formRenders).toBe(1);
      expect(bindingRef.value).toEqual({ title: "Draft", score: 10 });
      expect(bindingRef.dirty).toBe(false);
      expect(bindingRef.submitting).toBe(false);
      expect(bindingRef.submissionStatus).toBe("idle");

      // Aggregate value change re-renders useForm
      act(() => {
        form.fields.title.setValue("Published");
      });
      expect(formRenders).toBe(2);
      expect(bindingRef.value.title).toBe("Published");
      expect(bindingRef.dirty).toBe(true);

      // Submission lifecycle under Model A
      let resolveSubmit!: (val: unknown) => void;
      const submitPromise = new Promise((r) => {
        resolveSubmit = r;
      });

      let submitActionPromise!: Promise<unknown>;
      act(() => {
        submitActionPromise = bindingRef.submit(async () => {
          await submitPromise;
          return { ok: true, result: "saved" };
        });
      });

      expect(bindingRef.submissionStatus).toBe("submitting");
      expect(bindingRef.submitting).toBe(true);

      await act(async () => {
        resolveSubmit(true);
        await submitActionPromise;
      });

      expect(bindingRef.submissionStatus).toBe("succeeded");
      expect(bindingRef.submitting).toBe(false);

      // Model A: user edit retains succeeded status and sets dirty true
      act(() => {
        form.fields.score.setValue(99);
      });
      expect(bindingRef.submissionStatus).toBe("succeeded");
      expect(bindingRef.dirty).toBe(true);

      // Form reset resets status to idle
      act(() => {
        bindingRef.reset();
      });
      expect(bindingRef.submissionStatus).toBe("idle");
      expect(bindingRef.dirty).toBe(false);
      expect(bindingRef.value).toEqual({ title: "Draft", score: 10 });

      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });

    it("observes server-invalid submission and root serverIssues", async () => {
      const form = createForm({
        fields: {
          code: createField({ initialValue: "ABCD" }),
        },
      });

      let bindingRef!: ReturnType<typeof useForm<typeof form.fields>>;

      function FormView({ target }: { target: typeof form }) {
        bindingRef = useForm(target);
        return createElement("div", null, bindingRef.submissionStatus);
      }

      const renderer = render(createElement(FormView, { target: form }));

      await act(async () => {
        await bindingRef.submit(async () => ({
          ok: false,
          issues: [
            { code: "form.expired", message: "Form session expired", path: [] },
            { code: "code.invalid", message: "Invalid code", path: ["code"] },
          ],
        }));
      });

      expect(bindingRef.submissionStatus).toBe("failed");
      expect(bindingRef.serverIssues.length).toBe(1);
      expect(bindingRef.serverIssues[0]?.code).toBe("form.expired");
      expect(form.fields.code.serverIssues.get().length).toBe(1);

      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });

    it("observes reinitialize updating baseline values and pristine status", () => {
      const form = createForm({
        fields: {
          count: createField({ initialValue: 1 }),
        },
      });

      let bindingRef!: ReturnType<typeof useForm<typeof form.fields>>;

      function FormView({ target }: { target: typeof form }) {
        bindingRef = useForm(target);
        return createElement("div", null, bindingRef.value.count);
      }

      const renderer = render(createElement(FormView, { target: form }));

      act(() => {
        form.fields.count.setValue(5);
      });
      expect(bindingRef.dirty).toBe(true);

      act(() => {
        bindingRef.reinitialize({
          value: { count: 100 },
          rawValue: { count: 100 },
        });
      });

      expect(bindingRef.value.count).toBe(100);
      expect(bindingRef.dirty).toBe(false);

      act(() => {
        renderer.unmount();
      });
      form.dispose();
    });
  });

  describe("useFieldArray", () => {
    it("observes collection mutations (append, remove, move, swap) and preserves stable item IDs", () => {
      const arrayNode = createFieldArray({
        items: [
          createField({ initialValue: "A" }),
          createField({ initialValue: "B" }),
          createField({ initialValue: "C" }),
        ],
      });

      let bindingRef!: ReturnType<typeof useFieldArray<FieldState<string>>>;
      let renders = 0;

      function ArrayView({ target }: { target: typeof arrayNode }) {
        bindingRef = useFieldArray(target);
        renders++;
        return createElement(
          "ul",
          null,
          bindingRef.items.map((it) =>
            createElement("li", { key: it.id, "data-id": it.id }, it.node.value.get()),
          ),
        );
      }

      const renderer = render(createElement(ArrayView, { target: arrayNode }));
      expect(renders).toBe(1);
      expect(bindingRef.items.length).toBe(3);
      const idA = bindingRef.items[0]!.id;
      const idB = bindingRef.items[1]!.id;
      const idC = bindingRef.items[2]!.id;

      // Swap items 0 and 2 (A and C)
      act(() => {
        bindingRef.swap(0, 2);
      });

      expect(bindingRef.value).toEqual(["C", "B", "A"]);
      expect(bindingRef.items[0]!.id).toBe(idC);
      expect(bindingRef.items[1]!.id).toBe(idB);
      expect(bindingRef.items[2]!.id).toBe(idA);

      // Move item 1 to 0 (B to front)
      act(() => {
        bindingRef.move(1, 0);
      });

      expect(bindingRef.value).toEqual(["B", "C", "A"]);
      expect(bindingRef.items[0]!.id).toBe(idB);
      expect(bindingRef.items[1]!.id).toBe(idC);
      expect(bindingRef.items[2]!.id).toBe(idA);

      // Append new item
      act(() => {
        bindingRef.append(createField({ initialValue: "D" }));
      });
      expect(bindingRef.items.length).toBe(4);
      expect(bindingRef.value).toEqual(["B", "C", "A", "D"]);

      // Remove item at index 0 (B)
      act(() => {
        bindingRef.remove(0);
      });
      expect(bindingRef.items.length).toBe(3);
      expect(bindingRef.value).toEqual(["C", "A", "D"]);

      act(() => {
        renderer.unmount();
      });
      arrayNode.dispose();
    });
  });

  describe("StrictMode & Lifecycle", () => {
    it("handles StrictMode double-mount and unmount cleanly", () => {
      const field = createField<string>({ initialValue: "strict" });
      const renderCount = vi.fn();

      function StrictView({ target }: { target: FieldState<string> }) {
        const binding = useField(target);
        renderCount(binding.value);
        return createElement("span", null, binding.value);
      }

      const renderer = render(
        createElement(StrictMode, null, createElement(StrictView, { target: field })),
      );
      const countBefore = renderCount.mock.calls.length;

      act(() => {
        field.setValue("updated_strict");
      });
      expect(renderCount.mock.calls.length).toBeGreaterThan(countBefore);

      act(() => {
        renderer.unmount();
      });

      const countAfterUnmount = renderCount.mock.calls.length;
      act(() => {
        field.setValue("after_strict_unmount");
      });
      expect(renderCount.mock.calls.length).toBe(countAfterUnmount);

      // Node remains intact after React unmount
      expect(field.value.get()).toBe("after_strict_unmount");
      field.dispose();
    });

    it("does not auto-dispose the canonical Form node on component unmount", () => {
      const form = createForm({
        fields: {
          group: createFieldGroup({
            fields: {
              active: createField({ initialValue: true }),
            },
          }),
        },
      });

      function View({ target }: { target: typeof form }) {
        useForm(target);
        return createElement("div", null, "mounted");
      }

      const renderer = render(createElement(View, { target: form }));
      act(() => {
        renderer.unmount();
      });

      // Form node must remain usable
      expect(form.getValue()).toEqual({ group: { active: true } });
      form.fields.group.fields.active.setValue(false);
      expect(form.getValue()).toEqual({ group: { active: false } });

      form.dispose();
    });
  });

  describe("SSR & Import Safety", () => {
    it("renders Form and Field snapshots during SSR without DOM globals", () => {
      const form = createForm({
        fields: {
          title: createField({ initialValue: "SSR Page" }),
          count: createField({ initialValue: 42 }),
        },
      });

      function SsrApp({ target }: { target: typeof form }) {
        const formBinding = useForm(target);
        const titleBinding = useField(target.fields.title);
        return createElement(
          "main",
          null,
          createElement("h1", null, titleBinding.value),
          createElement("p", null, `Count: ${formBinding.value.count}`),
        );
      }

      const html = renderToStaticMarkup(createElement(SsrApp, { target: form }));
      expect(html).toBe("<main><h1>SSR Page</h1><p>Count: 42</p></main>");

      form.dispose();
    });
  });

  describe("Type Preservation", () => {
    it("preserves precise generic types for TValue, TRaw, FormValues, and FieldArray", () => {
      const field = createField<number, string>({
        initialValue: 123,
        initialRawValue: "123",
        parser: createNumberParser(),
      });

      function TypeProbe() {
        const binding = useField(field);
        const val: number = binding.value;
        const raw: string = binding.rawValue;
        return createElement("span", null, `${val}-${raw}`);
      }

      const renderer = render(createElement(TypeProbe));
      act(() => {
        renderer.unmount();
      });
      field.dispose();
    });
  });
});
