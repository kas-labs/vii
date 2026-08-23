import { describe, expect, it, vi } from "vitest";
import {
  type FieldArray,
  type FieldGroup,
  type FieldState,
  bindFormToExternalState,
  createField,
  createFieldArray,
  createFieldGroup,
  createForm,
  parsePath,
} from "./form-core.js";
import { state } from "../../packages/core/src/index.js";

describe("Form Research F2 — Nested Objects, Arrays, and Stable Identity Prototype", () => {
  describe("F1 Baseline & Regression Coverage", () => {
    it("should initialize field with pristine signals and support custom equality", () => {
      const field = createField<{ id: number; name: string }>({
        initialValue: { id: 1, name: "Ada" },
        equality: (a: { id: number; name: string }, b: { id: number; name: string }) =>
          a.id === b.id && a.name === b.name,
      });

      expect(field.value.get()).toEqual({ id: 1, name: "Ada" });
      expect(field.dirty.get()).toBe(false);
      expect(field.touched.get()).toBe(false);
      expect(field.valid.get()).toBe(true);

      field.setValue({ id: 1, name: "Ada" });
      expect(field.dirty.get()).toBe(false);

      field.setValue({ id: 1, name: "Grace" });
      expect(field.dirty.get()).toBe(true);
    });

    it("should support reset with explicit undefined when type permits", () => {
      const field = createField<string | undefined>({ initialValue: "Ada" });
      field.setValue("Grace");
      expect(field.dirty.get()).toBe(true);

      field.reset(undefined);
      expect(field.value.get()).toBeUndefined();
      expect(field.initialValue.get()).toBeUndefined();
      expect(field.dirty.get()).toBe(false);
    });

    it("External State Binding Lifecycle: clean disconnection post-disposal", () => {
      const appStore = state<{ search: string; page: number }>({ search: "query", page: 1 });

      const form = bindFormToExternalState({
        externalState: appStore,
      });

      form.dispose();

      // After form disposal, form changes must not sync to external State
      (form.fields.search as FieldState<string>).setValue("disconnected form change");
      expect(appStore.get().search).toBe("query");

      // After form disposal, external State changes must not sync to form
      appStore.set({ search: "external after disposal", page: 99 });
      expect((form.fields.search as FieldState<string>).value.get()).toBe(
        "disconnected form change",
      );
      expect((form.fields.page as FieldState<number>).value.get()).toBe(1);
    });
  });

  describe("Path Parsing & Security", () => {
    it("should parse dot and bracket paths correctly", () => {
      expect(parsePath("user.name")).toEqual(["user", "name"]);
      expect(parsePath("user.addresses[0].street")).toEqual(["user", "addresses", 0, "street"]);
      expect(parsePath("items[2][1].name")).toEqual(["items", 2, 1, "name"]);
    });

    it("should block prototype pollution attempts in path segments", () => {
      expect(() => parsePath("user.__proto__.admin")).toThrow(/Prototype pollution/);
      expect(() => parsePath("constructor.prototype.polluted")).toThrow(/Prototype pollution/);
      expect(() => parsePath("users[0].prototype.name")).toThrow(/Prototype pollution/);
    });
  });

  describe("FieldGroup: Nested Object Structures", () => {
    it("should create nested field groups and derive aggregate values/dirty/touched", () => {
      const userGroup = createFieldGroup<{
        name: string;
        profile: {
          bio: string;
          social: { twitter: string };
        };
      }>({
        initialValues: {
          name: "Ada",
          profile: {
            bio: "Mathematician",
            social: { twitter: "@ada" },
          },
        },
      });

      expect(userGroup.values.get()).toEqual({
        name: "Ada",
        profile: {
          bio: "Mathematician",
          social: { twitter: "@ada" },
        },
      });
      expect(userGroup.dirty.get()).toBe(false);
      expect(userGroup.touched.get()).toBe(false);
      expect(userGroup.valid.get()).toBe(true);

      // Mutate deep leaf
      const profileGroup = userGroup.fields.profile as FieldGroup<{
        bio: string;
        social: { twitter: string };
      }>;
      const socialGroup = profileGroup.fields.social as FieldGroup<{ twitter: string }>;
      const twitterField = socialGroup.fields.twitter as FieldState<string>;

      twitterField.setValue("@lovelace");

      expect(twitterField.dirty.get()).toBe(true);
      expect(socialGroup.dirty.get()).toBe(true);
      expect(profileGroup.dirty.get()).toBe(true);
      expect(userGroup.dirty.get()).toBe(true);

      // Sibling field remains untouched
      const nameField = userGroup.fields.name as FieldState<string>;
      expect(nameField.dirty.get()).toBe(false);
    });

    it("should aggregate errors across nested groups", () => {
      const group = createFieldGroup<{
        user: { name: string; email: string };
      }>({
        initialValues: {
          user: { name: "", email: "invalid" },
        },
      });

      const user = group.fields.user as FieldGroup<{ name: string; email: string }>;
      const nameField = user.fields.name as FieldState<string>;
      const emailField = user.fields.email as FieldState<string>;

      nameField.setErrors(["Name required"]);
      emailField.setErrors(["Invalid email format"]);

      expect(group.valid.get()).toBe(false);
      expect(group.invalid.get()).toBe(true);
      expect(group.errors.get()).toEqual({
        "user.name": ["Name required"],
        "user.email": ["Invalid email format"],
      });
    });

    it("should support partial setValues and reset on nested group", () => {
      const group = createFieldGroup<{
        address: { street: string; city: string };
      }>({
        initialValues: {
          address: { street: "123 Main", city: "London" },
        },
      });

      group.setValues({
        address: { street: "456 High St", city: "Oxford" },
      });

      expect(group.values.get()).toEqual({
        address: { street: "456 High St", city: "Oxford" },
      });
      expect(group.dirty.get()).toBe(true);

      group.reset();
      expect(group.values.get()).toEqual({
        address: { street: "123 Main", city: "London" },
      });
      expect(group.dirty.get()).toBe(false);
    });
  });

  describe("FieldArray: Repeatable Collections & Stable Identity", () => {
    it("should manage list items with generated stable IDs", () => {
      const array = createFieldArray<{ title: string }>({
        initialValues: [{ title: "Task 1" }, { title: "Task 2" }],
      });

      expect(array.values.get()).toEqual([{ title: "Task 1" }, { title: "Task 2" }]);
      const items = array.items.get();
      expect(items.length).toBe(2);
      const id1 = items[0]!.id;
      const id2 = items[1]!.id;
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it("should support application-provided keyExtractor", () => {
      const array = createFieldArray<{ id: number; name: string }>({
        initialValues: [
          { id: 101, name: "Alpha" },
          { id: 102, name: "Beta" },
        ],
        keyExtractor: (item) => item.id,
      });

      const items = array.items.get();
      expect(items[0]!.id).toBe(101);
      expect(items[1]!.id).toBe(102);
    });

    it("should push, insert, and remove items with proper Scope disposal", () => {
      const array = createFieldArray<string>({
        initialValues: ["A", "B"],
      });

      expect(array.values.get()).toEqual(["A", "B"]);

      // Push
      array.push("C");
      expect(array.values.get()).toEqual(["A", "B", "C"]);
      expect(array.dirty.get()).toBe(true);

      // Insert at index 1
      array.insert(1, "A.5");
      expect(array.values.get()).toEqual(["A", "A.5", "B", "C"]);

      // Remove index 2 ("B")
      array.remove(2);
      expect(array.values.get()).toEqual(["A", "A.5", "C"]);
    });

    it("should swap and move items while PRESERVING touched, dirty, and error states", () => {
      const array = createFieldArray<{ name: string }>({
        initialValues: [{ name: "First" }, { name: "Second" }],
      });

      const firstItem = array.items.get()[0]!;
      const secondItem = array.items.get()[1]!;

      const firstGroup = firstItem.node as FieldGroup<{ name: string }>;
      const secondGroup = secondItem.node as FieldGroup<{ name: string }>;

      const firstNameField = firstGroup.fields.name as FieldState<string>;
      firstNameField.setValue("First Edited");
      firstNameField.setTouched(true);
      firstNameField.setErrors(["First has error"]);

      expect(firstNameField.dirty.get()).toBe(true);
      expect(firstNameField.touched.get()).toBe(true);
      expect(firstNameField.errors.get()).toEqual(["First has error"]);

      // Swap index 0 and 1
      array.swap(0, 1);

      // Verify items were swapped in position
      const swappedItems = array.items.get();
      expect(swappedItems[0]!.id).toBe(secondItem.id);
      expect(swappedItems[1]!.id).toBe(firstItem.id);

      // The edited item (now at index 1) preserved its exact dirty, touched, and error signals
      const newIndex1Group = swappedItems[1]!.node as FieldGroup<{ name: string }>;
      const newIndex1Field = newIndex1Group.fields.name as FieldState<string>;

      expect(newIndex1Field.value.get()).toBe("First Edited");
      expect(newIndex1Field.dirty.get()).toBe(true);
      expect(newIndex1Field.touched.get()).toBe(true);
      expect(newIndex1Field.errors.get()).toEqual(["First has error"]);

      // Move it back from 1 to 0
      array.move(1, 0);
      const movedItems = array.items.get();
      expect(movedItems[0]!.id).toBe(firstItem.id);
    });

    it("should aggregate errors with indexed paths", () => {
      const array = createFieldArray<{ email: string }>({
        initialValues: [{ email: "a@example.com" }, { email: "b@example.com" }],
      });

      const item1 = array.items.get()[0]!.node as FieldGroup<{ email: string }>;
      const item1Email = item1.fields.email as FieldState<string>;
      item1Email.setErrors(["Invalid email"]);

      expect(array.valid.get()).toBe(false);
      expect(array.errors.get()).toEqual({
        "[0].email": ["Invalid email"],
      });
    });

    it("should reset field array to initial items and dispose removed items", () => {
      const array = createFieldArray<string>({
        initialValues: ["Initial 1", "Initial 2"],
      });

      array.push("Added 3");
      expect(array.values.get()).toEqual(["Initial 1", "Initial 2", "Added 3"]);
      expect(array.dirty.get()).toBe(true);

      array.reset();
      expect(array.values.get()).toEqual(["Initial 1", "Initial 2"]);
      expect(array.dirty.get()).toBe(false);
    });
  });

  describe("Form Root: getNode & Unified Form State", () => {
    it("should resolve nodes using getNode with dot and bracket syntax", () => {
      const form = createForm<{
        user: {
          name: string;
          tasks: Array<{ title: string }>;
        };
      }>({
        initialValues: {
          user: {
            name: "Ada",
            tasks: [{ title: "First task" }, { title: "Second task" }],
          },
        },
      });

      const nameNode = form.getNode("user.name") as FieldState<string>;
      expect(nameNode).toBeDefined();
      expect(nameNode.kind).toBe("field");
      expect(nameNode.value.get()).toBe("Ada");

      const task0Title = form.getNode("user.tasks[0].title") as FieldState<string>;
      expect(task0Title).toBeDefined();
      expect(task0Title.value.get()).toBe("First task");

      const taskArray = form.getNode("user.tasks") as FieldArray<{ title: string }>;
      expect(taskArray).toBeDefined();
      expect(taskArray.kind).toBe("array");

      expect(form.getNode("non.existent.path")).toBeUndefined();

      form.dispose();
    });

    it("should isolate subscription notifications across deeply nested branches", () => {
      const form = createForm<{
        branchA: { count: number };
        branchB: { count: number };
      }>({
        initialValues: {
          branchA: { count: 1 },
          branchB: { count: 2 },
        },
      });

      const subA = vi.fn();
      const subB = vi.fn();

      const nodeA = form.getNode("branchA.count") as FieldState<number>;
      const nodeB = form.getNode("branchB.count") as FieldState<number>;

      nodeA.value.subscribe(subA);
      nodeB.value.subscribe(subB);

      expect(subA).toHaveBeenCalledTimes(0);
      expect(subB).toHaveBeenCalledTimes(0);

      // Mutate Branch A leaf
      nodeA.setValue(10);

      expect(subA).toHaveBeenCalledTimes(1);
      expect(subB).toHaveBeenCalledTimes(0); // ZERO notification to Branch B

      form.dispose();
    });
  });
});
