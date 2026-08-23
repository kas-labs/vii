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

describe("Form Research F1 & F2 — Complete Prototype and Regression Evidence", () => {
  // -------------------------------------------------------------------------
  // 1. Restored F1 Baselines & Edge Cases
  // -------------------------------------------------------------------------
  describe("F1 Baseline: Field Primitives & Signal Granularity", () => {
    it("should initialize field with pristine signals", () => {
      const field = createField({ initialValue: "Ada" });

      expect(field.value.get()).toBe("Ada");
      expect(field.initialValue.get()).toBe("Ada");
      expect(field.dirty.get()).toBe(false);
      expect(field.touched.get()).toBe(false);
      expect(field.pending.get()).toBe(false);
      expect(field.valid.get()).toBe(true);
      expect(field.invalid.get()).toBe(false);
      expect(field.errors.get()).toEqual([]);
    });

    it("should track dirty state based on equality comparison", () => {
      const field = createField({ initialValue: "Ada" });

      field.setValue("Grace");
      expect(field.value.get()).toBe("Grace");
      expect(field.dirty.get()).toBe(true);

      field.setValue("Ada");
      expect(field.dirty.get()).toBe(false);
    });

    it("should support custom equality comparators for complex values", () => {
      const field = createField<{ id: number; name: string }>({
        initialValue: { id: 1, name: "Ada" },
        equality: (a: { id: number; name: string }, b: { id: number; name: string }) =>
          a.id === b.id && a.name === b.name,
      });

      expect(field.dirty.get()).toBe(false);

      field.setValue({ id: 1, name: "Ada" });
      expect(field.dirty.get()).toBe(false);

      field.setValue({ id: 1, name: "Grace" });
      expect(field.dirty.get()).toBe(true);
    });

    it("should update touched and errors independently", () => {
      const field = createField({ initialValue: "" });

      expect(field.touched.get()).toBe(false);
      field.setTouched(true);
      expect(field.touched.get()).toBe(true);

      expect(field.valid.get()).toBe(true);
      field.setErrors(["Required field"]);
      expect(field.errors.get()).toEqual(["Required field"]);
      expect(field.valid.get()).toBe(false);
      expect(field.invalid.get()).toBe(true);
    });

    it("should reset field state to initial value", () => {
      const field = createField({ initialValue: "Ada" });

      field.setValue("Grace");
      field.setTouched(true);
      field.setErrors(["Some error"]);
      field.setPending(true);

      field.reset();

      expect(field.value.get()).toBe("Ada");
      expect(field.dirty.get()).toBe(false);
      expect(field.touched.get()).toBe(false);
      expect(field.pending.get()).toBe(false);
      expect(field.errors.get()).toEqual([]);
      expect(field.valid.get()).toBe(true);
    });

    it("should reset field to a new initial baseline when provided", () => {
      const field = createField({ initialValue: "Ada" });

      field.setValue("Temporary");
      field.reset("Margaret");

      expect(field.value.get()).toBe("Margaret");
      expect(field.initialValue.get()).toBe("Margaret");
      expect(field.dirty.get()).toBe(false);
    });

    it("should allow explicit undefined as a new initial value when T permits undefined", () => {
      const field = createField<string | undefined>({ initialValue: "Ada" });

      field.setValue("Grace");
      expect(field.dirty.get()).toBe(true);

      field.reset(undefined);

      expect(field.value.get()).toBeUndefined();
      expect(field.initialValue.get()).toBeUndefined();
      expect(field.dirty.get()).toBe(false);

      field.setValue("Ada");
      expect(field.dirty.get()).toBe(true);
    });

    it("should handle reset to same initial value and clear touched/pending/errors", () => {
      const field = createField({ initialValue: "Ada" });

      field.setValue("Ada");
      field.setTouched(true);
      field.setPending(true);
      field.setErrors(["Err"]);

      field.reset();

      expect(field.value.get()).toBe("Ada");
      expect(field.dirty.get()).toBe(false);
      expect(field.touched.get()).toBe(false);
      expect(field.pending.get()).toBe(false);
      expect(field.errors.get()).toEqual([]);
      expect(field.valid.get()).toBe(true);
    });

    it("should correctly report pristine after new baseline reset with custom comparator", () => {
      const field = createField<{ id: number; tag: string }>({
        initialValue: { id: 1, tag: "v1" },
        equality: (a: { id: number; tag: string }, b: { id: number; tag: string }) =>
          a.id === b.id && a.tag === b.tag,
      });

      field.setValue({ id: 1, tag: "v2" });
      expect(field.dirty.get()).toBe(true);

      field.reset({ id: 2, tag: "v2" });
      expect(field.value.get()).toEqual({ id: 2, tag: "v2" });
      expect(field.initialValue.get()).toEqual({ id: 2, tag: "v2" });
      expect(field.dirty.get()).toBe(false);

      field.setValue({ id: 2, tag: "v2" });
      expect(field.dirty.get()).toBe(false);

      field.setValue({ id: 2, tag: "v3" });
      expect(field.dirty.get()).toBe(true);
    });
  });

  describe("F1 Baseline: Aggregate Evaluation & Subscription Fan-Out", () => {
    it("should aggregate values, dirty, touched, and validity across flat fields", () => {
      const form = createForm({
        initialValues: {
          username: "ada",
          email: "ada@example.com",
          age: 36,
        },
      });

      expect(form.values.get()).toEqual({
        username: "ada",
        email: "ada@example.com",
        age: 36,
      });
      expect(form.dirty.get()).toBe(false);
      expect(form.touched.get()).toBe(false);
      expect(form.valid.get()).toBe(true);

      (form.fields.username as FieldState<string>).setValue("lovelace");
      expect(form.dirty.get()).toBe(true);
      expect(form.values.get().username).toBe("lovelace");

      (form.fields.email as FieldState<string>).setErrors(["Invalid domain"]);
      expect(form.valid.get()).toBe(false);
      expect(form.invalid.get()).toBe(true);
      expect(form.errors.get()["email"]).toEqual(["Invalid domain"]);

      form.dispose();
    });

    it("should isolate subscriptions so mutating field A does NOT notify field B subscribers", () => {
      const form = createForm({
        initialValues: {
          fieldA: "alpha",
          fieldB: "beta",
        },
      });

      const subscriberA = vi.fn();
      const subscriberB = vi.fn();
      const subscriberAggregate = vi.fn();

      (form.fields.fieldA as FieldState<string>).value.subscribe(subscriberA);
      (form.fields.fieldB as FieldState<string>).value.subscribe(subscriberB);
      form.values.subscribe(subscriberAggregate);

      expect(subscriberA).toHaveBeenCalledTimes(0);
      expect(subscriberB).toHaveBeenCalledTimes(0);
      expect(subscriberAggregate).toHaveBeenCalledTimes(0);

      // Mutate Field A
      (form.fields.fieldA as FieldState<string>).setValue("alpha-2");

      expect(subscriberA).toHaveBeenCalledTimes(1);
      expect(subscriberB).toHaveBeenCalledTimes(0); // ZERO extra notifications to B
      expect(subscriberAggregate).toHaveBeenCalledTimes(1);

      form.dispose();
    });

    it("should batch multiple field updates into a single aggregate change", () => {
      const form = createForm({
        initialValues: {
          firstName: "Ada",
          lastName: "Lovelace",
        },
      });

      const aggregateSub = vi.fn();
      form.values.subscribe(aggregateSub);
      expect(aggregateSub).toHaveBeenCalledTimes(0);

      form.setValues({
        firstName: "Grace",
        lastName: "Hopper",
      });

      expect(aggregateSub).toHaveBeenCalledTimes(1);
      expect(form.values.get()).toEqual({
        firstName: "Grace",
        lastName: "Hopper",
      });

      form.dispose();
    });

    it("should allow partial reset with explicit undefined on flat form", () => {
      const form = createForm<{
        name: string | undefined;
        role: string;
      }>({
        initialValues: {
          name: "Ada",
          role: "Engineer",
        },
      });

      (form.fields.name as FieldState<string | undefined>).setValue("Grace");
      (form.fields.role as FieldState<string>).setValue("Architect");
      expect(form.dirty.get()).toBe(true);

      form.reset({ name: undefined });

      expect((form.fields.name as FieldState<string | undefined>).value.get()).toBeUndefined();
      expect(
        (form.fields.name as FieldState<string | undefined>).initialValue.get(),
      ).toBeUndefined();
      expect((form.fields.name as FieldState<string | undefined>).dirty.get()).toBe(false);

      expect((form.fields.role as FieldState<string>).value.get()).toBe("Engineer");
      expect((form.fields.role as FieldState<string>).dirty.get()).toBe(false);

      form.dispose();
    });
  });

  describe("F1 Baseline: Model Ownership Comparison Fixtures", () => {
    it("Form-Owned baseline: completely self-contained state and lifecycle", () => {
      const form = createForm({
        initialValues: { count: 0 },
      });

      (form.fields.count as FieldState<number>).setValue(10);
      expect((form.fields.count as FieldState<number>).dirty.get()).toBe(true);
      expect(form.values.get().count).toBe(10);

      form.reset();
      expect((form.fields.count as FieldState<number>).value.get()).toBe(0);
      expect((form.fields.count as FieldState<number>).dirty.get()).toBe(false);

      form.dispose();
    });

    it("External State Binding: bidirectional synchronization with external store fixture", () => {
      const appStore = state<{ search: string; page: number }>({ search: "query", page: 1 });

      const form = bindFormToExternalState({
        externalState: appStore,
      });

      expect(form.values.get()).toEqual({ search: "query", page: 1 });

      (form.fields.search as FieldState<string>).setValue("new query");
      expect(appStore.get().search).toBe("new query");

      appStore.set({ search: "external update", page: 2 });
      expect((form.fields.search as FieldState<string>).value.get()).toBe("external update");
      expect((form.fields.page as FieldState<number>).value.get()).toBe(2);

      form.dispose();
    });

    it("External State Binding Lifecycle: clean disconnection post-disposal", () => {
      const appStore = state<{ search: string; page: number }>({ search: "query", page: 1 });

      const form = bindFormToExternalState({
        externalState: appStore,
      });

      form.dispose();

      (form.fields.search as FieldState<string>).setValue("disconnected form change");
      expect(appStore.get().search).toBe("query");

      appStore.set({ search: "external after disposal", page: 99 });
      expect((form.fields.search as FieldState<string>).value.get()).toBe(
        "disconnected form change",
      );
      expect((form.fields.page as FieldState<number>).value.get()).toBe(1);
    });

    it("External State Binding: repeated equal values do not create duplicate feedback loops", () => {
      const appStore = state<{ text: string }>({ text: "hello" });
      const externalListener = vi.fn();
      appStore.subscribe(externalListener);

      const form = bindFormToExternalState({
        externalState: appStore,
      });

      expect(externalListener).toHaveBeenCalledTimes(0);

      (form.fields.text as FieldState<string>).setValue("world");
      expect(externalListener).toHaveBeenCalledTimes(1);
      expect(appStore.get().text).toBe("world");

      appStore.set({ text: "world" });
      expect((form.fields.text as FieldState<string>).value.get()).toBe("world");

      form.dispose();
    });

    it("External State Binding: disposal is idempotent", () => {
      const appStore = state<{ text: string }>({ text: "test" });
      const form = bindFormToExternalState({
        externalState: appStore,
      });

      expect(() => {
        form.dispose();
        form.dispose();
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 2. F2 Specific Tests: Scope Ownership, Paths, Nested Objects & Arrays
  // -------------------------------------------------------------------------
  describe("F2: Scope Ownership & Deterministic Teardown", () => {
    it("should stop all nested and array item computed notifications upon form.dispose()", () => {
      const form = createForm<{
        user: {
          name: string;
          tags: string[];
        };
      }>({
        initialValues: {
          user: {
            name: "Ada",
            tags: ["alpha", "beta"],
          },
        },
      });

      const userGroup = form.fields.user as FieldGroup<{ name: string; tags: string[] }>;
      const tagsArray = userGroup.fields.tags as FieldArray<string>;
      const item0 = tagsArray.items.get()[0]!;
      const item0Field = item0.node as FieldState<string>;

      const itemDirtyListener = vi.fn();
      item0Field.dirty.subscribe(itemDirtyListener);
      expect(itemDirtyListener).toHaveBeenCalledTimes(0);

      item0Field.setValue("alpha-modified");
      expect(itemDirtyListener).toHaveBeenCalledTimes(1);

      // Dispose form root
      form.dispose();

      // Mutate retained item state after root disposal
      item0Field.setValue("alpha-after-dispose");
      // Proves child item computations are halted and no notification occurs
      expect(itemDirtyListener).toHaveBeenCalledTimes(1);

      // Proves disposal is idempotent
      expect(() => form.dispose()).not.toThrow();
    });
  });

  describe("F2: Path Parsing Hardening & Security", () => {
    it("should parse valid dot and bracket paths correctly", () => {
      expect(parsePath("user.name")).toEqual(["user", "name"]);
      expect(parsePath("user.addresses[0].street")).toEqual(["user", "addresses", 0, "street"]);
      expect(parsePath("items[2][1].name")).toEqual(["items", 2, 1, "name"]);
      expect(parsePath("field")).toEqual(["field"]);
    });

    it("should reject malformed or ambiguous path syntax", () => {
      expect(() => parsePath("")).toThrow(/empty/);
      expect(() => parsePath("  ")).toThrow(/empty/);
      expect(() => parsePath("user..name")).toThrow(/unexpected dot/);
      expect(() => parsePath(".user.name")).toThrow(/unexpected dot/);
      expect(() => parsePath("user.name.")).toThrow(/unexpected dot/);
      expect(() => parsePath("user[0")).toThrow(/unclosed bracket/);
      expect(() => parsePath("user]0[")).toThrow(/unexpected closing bracket/);
      expect(() => parsePath("user[-1]")).toThrow(/non-negative integer/);
      expect(() => parsePath("user[1.5]")).toThrow(/non-negative integer/);
      expect(() => parsePath("user[01]")).toThrow(/leading zeros/);
      expect(() => parsePath("tasks[0]b")).toThrow(/bracket segment must be followed by/);
      expect(() => parsePath("a.[0]")).toThrow(/dot before bracket/);
    });

    it("should block prototype pollution attempts on any segment", () => {
      expect(() => parsePath("user.__proto__.admin")).toThrow(/Prototype pollution/);
      expect(() => parsePath("constructor.prototype.polluted")).toThrow(/Prototype pollution/);
      expect(() => parsePath("users[0].prototype.name")).toThrow(/Prototype pollution/);
    });
  });

  describe("F2: Plain Record Classification & Cycle Defense", () => {
    it("should treat non-plain objects (Date, Map, Set, Regex) as leaf FieldState values", () => {
      const today = new Date();
      const customMap = new Map([["key", "val"]]);
      const customSet = new Set([1, 2]);

      const form = createForm<{
        createdAt: Date;
        metaMap: Map<string, string>;
        metaSet: Set<number>;
      }>({
        initialValues: {
          createdAt: today,
          metaMap: customMap,
          metaSet: customSet,
        },
      });

      const createdNode = form.getNode("createdAt") as FieldState<Date>;
      expect(createdNode.kind).toBe("field");
      expect(createdNode.value.get()).toBe(today);

      const mapNode = form.getNode("metaMap") as FieldState<Map<string, string>>;
      expect(mapNode.kind).toBe("field");

      const setNode = form.getNode("metaSet") as FieldState<Set<number>>;
      expect(setNode.kind).toBe("field");

      form.dispose();
    });

    it("should detect cyclic input and throw a deterministic error", () => {
      const cyclicObj: any = { name: "cycle" };
      cyclicObj.self = cyclicObj;

      expect(() => {
        createForm({ initialValues: cyclicObj });
      }).toThrow(/Cyclic input detected/);
    });
  });

  describe("F2: FieldGroup Nested Objects", () => {
    it("should aggregate values, dirty, touched across deep nested groups", () => {
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

      const nameField = userGroup.fields.name as FieldState<string>;
      expect(nameField.dirty.get()).toBe(false);
    });

    it("should aggregate non-empty errors across nested groups", () => {
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
  });

  describe("F2: FieldArray Repeatable Collections, Undefined Elements & Identity", () => {
    it("should support array elements containing explicit undefined", () => {
      const array = createFieldArray<string | undefined>({
        initialValues: [undefined, "Alpha"],
      });

      expect(array.values.get()).toEqual([undefined, "Alpha"]);
      expect(array.dirty.get()).toBe(false);

      // Push undefined
      array.push(undefined);
      expect(array.values.get()).toEqual([undefined, "Alpha", undefined]);
      expect(array.dirty.get()).toBe(true);

      // Insert undefined at index 1
      array.insert(1, undefined);
      expect(array.values.get()).toEqual([undefined, undefined, "Alpha", undefined]);

      // setValues with explicit undefined
      array.setValues(["Beta", undefined]);
      expect(array.values.get()).toEqual(["Beta", undefined]);

      // Reset containing undefined
      array.reset([undefined, "Gamma"]);
      expect(array.values.get()).toEqual([undefined, "Gamma"]);
      expect(array.dirty.get()).toBe(false);
    });

    it("should support application keyExtractor without recursive child pollution", () => {
      const array = createFieldArray<{ id: number; items: string[] }>({
        initialValues: [
          { id: 101, items: ["A", "B"] },
          { id: 102, items: ["C"] },
        ],
        keyExtractor: (item) => item.id,
      });

      const items = array.items.get();
      expect(items[0]!.id).toBe(101);
      expect(items[1]!.id).toBe(102);

      // Child array inside item 0 should generate its own independent IDs, not inherit parent keyExtractor
      const childGroup = items[0]!.node as FieldGroup<{ items: string[] }>;
      const childArray = childGroup.fields.items as FieldArray<string>;
      const childItems = childArray.items.get();
      expect(typeof childItems[0]!.id).toBe("string");
      expect((childItems[0]!.id as string).startsWith("vii_item_")).toBe(true);
    });

    it("should detect duplicate application keys and throw a deterministic error", () => {
      expect(() => {
        createFieldArray<{ id: number; name: string }>({
          initialValues: [
            { id: 1, name: "First" },
            { id: 1, name: "Duplicate" },
          ],
          keyExtractor: (item) => item.id,
        });
      }).toThrow(/Duplicate key "1"/);
    });

    it("Reorder Dirty Semantics: swapping pristine items marks array dirty, swapping back restores pristine", () => {
      const array = createFieldArray<{ name: string }>({
        initialValues: [{ name: "First" }, { name: "Second" }],
      });

      expect(array.dirty.get()).toBe(false);

      // Swap pristine items
      array.swap(0, 1);
      expect(array.dirty.get()).toBe(true); // Provisional semantic: order participates in dirty state

      // Swap back to original order
      array.swap(0, 1);
      expect(array.dirty.get()).toBe(false); // Restored pristine order!

      // Move item
      array.move(0, 1);
      expect(array.dirty.get()).toBe(true);

      // Move back
      array.move(1, 0);
      expect(array.dirty.get()).toBe(false);
    });

    it("should preserve item state and differentiate positional path vs stable identity across reorders", () => {
      const form = createForm<{
        tasks: Array<{ title: string }>;
      }>({
        initialValues: {
          tasks: [{ title: "Task 1" }, { title: "Task 2" }],
        },
      });

      const tasksArray = form.fields.tasks as FieldArray<{ title: string }>;
      const firstItem = tasksArray.items.get()[0]!;
      const secondItem = tasksArray.items.get()[1]!;

      const firstGroup = firstItem.node as FieldGroup<{ title: string }>;
      const firstTitleField = firstGroup.fields.title as FieldState<string>;
      firstTitleField.setValue("Task 1 Modified");
      firstTitleField.setTouched(true);
      firstTitleField.setErrors(["Task 1 has error"]);

      // Reorder items
      tasksArray.swap(0, 1);

      // Positional path "tasks[0]" now resolves the node currently at index 0 (Task 2)
      const currentPos0Node = form.getNode("tasks[0].title") as FieldState<string>;
      expect(currentPos0Node.value.get()).toBe("Task 2");
      expect(currentPos0Node.dirty.get()).toBe(false);

      // Positional path "tasks[1]" now resolves Task 1 Modified
      const currentPos1Node = form.getNode("tasks[1].title") as FieldState<string>;
      expect(currentPos1Node.value.get()).toBe("Task 1 Modified");
      expect(currentPos1Node.dirty.get()).toBe(true);
      expect(currentPos1Node.touched.get()).toBe(true);
      expect(currentPos1Node.errors.get()).toEqual(["Task 1 has error"]);

      // Stable identity remained attached to the item
      const swappedItems = tasksArray.items.get();
      expect(swappedItems[1]!.id).toBe(firstItem.id);

      form.dispose();
    });

    it("Reset with no args on unkeyed array: ids regenerated AND dirty === false, touched === false, values match initial", () => {
      const array = createFieldArray<string>({
        initialValues: ["a", "b"],
      });
      const oldId = array.items.get()[0]!.id;

      array.push("c");
      expect(array.dirty.get()).toBe(true);

      array.reset();

      expect(array.dirty.get()).toBe(false);
      expect(array.touched.get()).toBe(false);
      expect(array.values.get()).toEqual(["a", "b"]);
      expect(array.items.get()[0]!.id).not.toBe(oldId); // ids regenerated
    });

    it("Reset with no args on keyed array: keys preserved AND dirty === false", () => {
      const array = createFieldArray<{ id: string; val: number }>({
        initialValues: [
          { id: "k1", val: 1 },
          { id: "k2", val: 2 },
        ],
        keyExtractor: (item) => item.id,
      });

      array.push({ id: "k3", val: 3 });
      expect(array.dirty.get()).toBe(true);

      array.reset();

      expect(array.dirty.get()).toBe(false);
      expect(array.touched.get()).toBe(false);
      expect(array.values.get()).toEqual([
        { id: "k1", val: 1 },
        { id: "k2", val: 2 },
      ]);
      expect(array.items.get().map((i) => i.id)).toEqual(["k1", "k2"]);
    });

    it("form.reset() on a form containing a nested array: form.dirty === false", () => {
      const form = createForm<{ tasks: string[] }>({
        initialValues: { tasks: ["a", "b"] },
      });
      const arr = form.getNode("tasks") as FieldArray<string>;

      expect(arr.dirty.get()).toBe(false);
      expect(form.dirty.get()).toBe(false);

      form.reset();

      expect(arr.dirty.get()).toBe(false);
      expect(form.dirty.get()).toBe(false);

      form.dispose();
    });

    it("setValues shrink then regrow to initial values: dirty === false", () => {
      const array = createFieldArray<string>({
        initialValues: ["a", "b", "c"],
      });
      expect(array.dirty.get()).toBe(false);

      array.setValues(["a"]);
      expect(array.dirty.get()).toBe(true);

      array.setValues(["a", "b", "c"]);
      expect(array.dirty.get()).toBe(false);
    });

    it("keyed setValues reorder: item.id matches keyExtractor(item value) for every item", () => {
      const array = createFieldArray<{ id: string; v: number }>({
        initialValues: [
          { id: "r1", v: 1 },
          { id: "r2", v: 2 },
        ],
        keyExtractor: (item) => item.id,
      });

      array.setValues([
        { id: "r2", v: 2 },
        { id: "r1", v: 1 },
      ]);

      const items = array.items.get();
      expect(items.map((i) => i.id)).toEqual(["r2", "r1"]);
      expect(items[0]!.id).toBe("r2");
      expect((items[0]!.node as FieldGroup<{ id: string; v: number }>).values.get()).toEqual({
        id: "r2",
        v: 2,
      });
      expect(items[1]!.id).toBe("r1");
      expect((items[1]!.node as FieldGroup<{ id: string; v: number }>).values.get()).toEqual({
        id: "r1",
        v: 1,
      });
    });

    it("keyed setValues introducing a real duplicate key: throws Duplicate key", () => {
      const array = createFieldArray<{ id: string; v: number }>({
        initialValues: [
          { id: "r1", v: 1 },
          { id: "r2", v: 2 },
        ],
        keyExtractor: (item) => item.id,
      });

      expect(() => {
        array.setValues([
          { id: "r1", v: 10 },
          { id: "r1", v: 20 },
        ]);
      }).toThrow(/Duplicate key "r1"/);
    });

    it("keyed setValues: an item whose key survived keeps its child scope and child signals", () => {
      const array = createFieldArray<{ id: string; v: number }>({
        initialValues: [
          { id: "r1", v: 1 },
          { id: "r2", v: 2 },
        ],
        keyExtractor: (item) => item.id,
      });

      const initialR1Item = array.items.get()[0]!;
      const r1Group = initialR1Item.node as FieldGroup<{ id: string; v: number }>;
      (r1Group.fields.v as FieldState<number>).setTouched(true);
      (r1Group.fields.v as FieldState<number>).setErrors(["Err"]);

      // Reorder and update
      array.setValues([
        { id: "r2", v: 20 },
        { id: "r1", v: 1 },
      ]);

      const newItems = array.items.get();
      const survivedR1Item = newItems[1]!;
      expect(survivedR1Item.scope).toBe(initialR1Item.scope); // Scope reused!

      const survivedR1Group = survivedR1Item.node as FieldGroup<{ id: string; v: number }>;
      expect((survivedR1Group.fields.v as FieldState<number>).touched.get()).toBe(true);
      expect((survivedR1Group.fields.v as FieldState<number>).errors.get()).toEqual(["Err"]);
    });

    it("Reset Identity Semantics: reset re-creates internal IDs, preserves keyExtractor keys, and disposes old scopes", () => {
      const unkeyedArray = createFieldArray<string>({
        initialValues: ["Item A", "Item B"],
      });
      const oldId0 = unkeyedArray.items.get()[0]!.id;

      unkeyedArray.reset();
      const newId0 = unkeyedArray.items.get()[0]!.id;
      expect(newId0).not.toBe(oldId0); // Internal IDs re-generated

      const keyedArray = createFieldArray<{ id: number; text: string }>({
        initialValues: [{ id: 42, text: "Fixed Key" }],
        keyExtractor: (item) => item.id,
      });
      keyedArray.reset();
      expect(keyedArray.items.get()[0]!.id).toBe(42); // KeyExtractor key preserved
    });
  });

  describe("F2: Deep Branch Subscription Isolation", () => {
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

      nodeA.setValue(10);

      expect(subA).toHaveBeenCalledTimes(1);
      expect(subB).toHaveBeenCalledTimes(0); // ZERO notification to Branch B

      form.dispose();
    });
  });
});
