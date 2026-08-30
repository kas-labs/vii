import { createScope } from "@vii-labs/core";
import { describe, expect, test, vi } from "vitest";
import {
  createField,
  createFieldArray,
  createFieldGroup,
  createForm,
  createNumberParser,
  type AsyncValidationRule,
  type FieldIssue,
  type SyncValidationRule,
} from "../../src/index.js";

describe("FieldArray — dynamic collection with stable identity (P1f)", () => {
  describe("Creation & Initial Aggregation", () => {
    test("creates an empty field array with correct initial state", () => {
      const array = createFieldArray();

      expect(array.kind).toBe("array");
      expect(array.items.get()).toEqual([]);
      expect(array.getValue()).toEqual([]);
      expect(array.getRawValue()).toEqual([]);
      expect(array.value.get()).toEqual([]);
      expect(array.rawValue.get()).toEqual([]);
      expect(array.touched.get()).toBe(false);
      expect(array.dirty.get()).toBe(false);
      expect(array.pending.get()).toBe(false);
      expect(array.valid.get()).toBe(true);
      expect(array.invalid.get()).toBe(false);
      expect(array.issues.get()).toEqual([]);

      array.dispose();
    });

    test("creates field array with initial items and aggregates values/rawValues", () => {
      const field1 = createField({ initialValue: "apple" });
      const field2 = createField<number, string>({
        initialValue: 42,
        initialRawValue: "042",
        parser: createNumberParser(),
      });

      const array = createFieldArray({
        items: [field1, field2],
      });

      expect(array.items.get().length).toBe(2);
      expect(array.items.get()[0]!.node).toBe(field1);
      expect(array.items.get()[1]!.node).toBe(field2);

      expect(array.getValue()).toEqual(["apple", 42]);
      expect(array.getRawValue()).toEqual(["apple", "042"]);
      expect(array.value.get()).toEqual(["apple", 42]);
      expect(array.rawValue.get()).toEqual(["apple", "042"]);
      expect(array.dirty.get()).toBe(false);
      expect(array.touched.get()).toBe(false);
      expect(array.valid.get()).toBe(true);

      array.dispose();
    });

    test("supports custom keyExtractor when provided", () => {
      const field1 = createField({ initialValue: "one" });
      const field2 = createField({ initialValue: "two" });

      let keyCount = 0;
      const array = createFieldArray({
        items: [field1, field2],
        keyExtractor: () => `custom_key_${++keyCount}`,
      });

      const items = array.items.get();
      expect(items[0]!.id).toBe("custom_key_1");
      expect(items[1]!.id).toBe("custom_key_2");

      array.dispose();
    });
  });

  describe("Stable Item Identity", () => {
    test("append preserves existing IDs and assigns a fresh stable ID to new item", () => {
      const f1 = createField({ initialValue: "first" });
      const array = createFieldArray({ items: [f1] });

      const initialId = array.items.get()[0]!.id;
      expect(initialId).toBeDefined();

      const f2 = createField({ initialValue: "second" });
      const item2 = array.append(f2);

      const itemsAfter = array.items.get();
      expect(itemsAfter.length).toBe(2);
      expect(itemsAfter[0]!.id).toBe(initialId);
      expect(itemsAfter[0]!.node).toBe(f1);
      expect(itemsAfter[1]!.id).toBe(item2.id);
      expect(itemsAfter[1]!.node).toBe(f2);
      expect(itemsAfter[0]!.id).not.toBe(itemsAfter[1]!.id);

      array.dispose();
    });

    test("insert preserves existing sibling IDs", () => {
      const f1 = createField({ initialValue: "first" });
      const f2 = createField({ initialValue: "second" });
      const array = createFieldArray({ items: [f1, f2] });

      const id1 = array.items.get()[0]!.id;
      const id2 = array.items.get()[1]!.id;

      const fMiddle = createField({ initialValue: "middle" });
      const insertedItem = array.insert(1, fMiddle);

      const current = array.items.get();
      expect(current.length).toBe(3);
      expect(current[0]!.id).toBe(id1);
      expect(current[0]!.node).toBe(f1);
      expect(current[1]!.id).toBe(insertedItem.id);
      expect(current[1]!.node).toBe(fMiddle);
      expect(current[2]!.id).toBe(id2);
      expect(current[2]!.node).toBe(f2);

      array.dispose();
    });

    test("prepend inserts at index 0 preserving sibling IDs", () => {
      const f1 = createField({ initialValue: "original" });
      const array = createFieldArray({ items: [f1] });
      const id1 = array.items.get()[0]!.id;

      const fPre = createField({ initialValue: "prefixed" });
      const preItem = array.prepend(fPre);

      const current = array.items.get();
      expect(current.length).toBe(2);
      expect(current[0]!.id).toBe(preItem.id);
      expect(current[0]!.node).toBe(fPre);
      expect(current[1]!.id).toBe(id1);
      expect(current[1]!.node).toBe(f1);

      array.dispose();
    });

    test("remove preserves remaining sibling IDs and returns removed node", () => {
      const f1 = createField({ initialValue: "a" });
      const f2 = createField({ initialValue: "b" });
      const f3 = createField({ initialValue: "c" });
      const array = createFieldArray({ items: [f1, f2, f3] });

      const id1 = array.items.get()[0]!.id;
      const id3 = array.items.get()[2]!.id;

      array.remove(1);

      const current = array.items.get();
      expect(current.length).toBe(2);
      expect(current[0]!.id).toBe(id1);
      expect(current[0]!.node).toBe(f1);
      expect(current[1]!.id).toBe(id3);
      expect(current[1]!.node).toBe(f3);

      array.dispose();
    });

    test("move preserves logical item identities and child node instances across reordering", () => {
      const f0 = createField({ initialValue: "item-0" });
      const f1 = createField({ initialValue: "item-1" });
      const f2 = createField({ initialValue: "item-2" });
      const array = createFieldArray({ items: [f0, f1, f2] });

      const id0 = array.items.get()[0]!.id;
      const id1 = array.items.get()[1]!.id;
      const id2 = array.items.get()[2]!.id;

      // Move item 2 to index 0: [item-2, item-0, item-1]
      array.move(2, 0);

      const current = array.items.get();
      expect(current.length).toBe(3);
      expect(current[0]!.id).toBe(id2);
      expect(current[0]!.node).toBe(f2);
      expect(current[1]!.id).toBe(id0);
      expect(current[1]!.node).toBe(f0);
      expect(current[2]!.id).toBe(id1);
      expect(current[2]!.node).toBe(f1);

      expect(array.getValue()).toEqual(["item-2", "item-0", "item-1"]);

      array.dispose();
    });

    test("swap exchanges positions while preserving item IDs and nodes", () => {
      const f0 = createField({ initialValue: "zero" });
      const f1 = createField({ initialValue: "one" });
      const array = createFieldArray({ items: [f0, f1] });

      const id0 = array.items.get()[0]!.id;
      const id1 = array.items.get()[1]!.id;

      array.swap(0, 1);

      const current = array.items.get();
      expect(current[0]!.id).toBe(id1);
      expect(current[0]!.node).toBe(f1);
      expect(current[1]!.id).toBe(id0);
      expect(current[1]!.node).toBe(f0);

      expect(array.getValue()).toEqual(["one", "zero"]);

      array.dispose();
    });

    test("move and swap are safe no-ops when source equals target index", () => {
      const f0 = createField({ initialValue: "zero" });
      const array = createFieldArray({ items: [f0] });

      const id0 = array.items.get()[0]!.id;
      array.move(0, 0);
      array.swap(0, 0);

      expect(array.items.get()[0]!.id).toBe(id0);
      expect(array.items.get()[0]!.node).toBe(f0);

      array.dispose();
    });

    test("out of bounds indices throw deterministic RangeErrors", () => {
      const f0 = createField({ initialValue: "a" });
      const array = createFieldArray({ items: [f0] });

      expect(() => array.insert(-1, createField({ initialValue: "x" }))).toThrow(RangeError);
      expect(() => array.insert(5, createField({ initialValue: "x" }))).toThrow(RangeError);
      expect(() => array.remove(-1)).toThrow(RangeError);
      expect(() => array.remove(1)).toThrow(RangeError);
      expect(() => array.move(0, 5)).toThrow(RangeError);
      expect(() => array.move(5, 0)).toThrow(RangeError);
      expect(() => array.swap(0, 2)).toThrow(RangeError);
      expect(() => array.swap(-1, 0)).toThrow(RangeError);

      array.dispose();
    });
  });

  describe("Lifecycle & Ownership Model", () => {
    test("adopted child node cannot be directly disposed publicly", () => {
      const field = createField({ initialValue: "hello" });
      const array = createFieldArray({ items: [field] });

      expect(() => field.dispose()).toThrow(
        "Cannot dispose an adopted field directly; dispose its owning form or group",
      );

      array.dispose();
    });

    test("removed non-baseline item is cleanly disposed while baseline item is retained for reset", () => {
      const field1 = createField({ initialValue: "keep" });
      const array = createFieldArray({ items: [field1] });

      const field2 = createField({
        initialValue: "remove-me",
        rules: [(v: string) => (v === "bad" ? { code: "invalid_str" } : null)],
      });
      array.append(field2);

      expect(array.items.get().length).toBe(2);
      expect(array.valid.get()).toBe(true);

      // Remove non-baseline field2
      array.remove(1);

      // Mutating non-baseline field2 throws because it was disposed
      expect(() => field2.setValue("bad")).toThrow("Field is disposed");
      expect(array.items.get().length).toBe(1);
      expect(array.valid.get()).toBe(true);
      expect(array.issues.get()).toEqual([]);

      array.dispose();
    });

    test("clear() disposes non-baseline items, retains baseline items for reset, and empties array", () => {
      const f1 = createField({ initialValue: "1" });
      const array = createFieldArray({ items: [f1] });

      const f2 = createField({ initialValue: "2" });
      array.append(f2);

      array.clear();
      expect(array.items.get()).toEqual([]);
      expect(array.getValue()).toEqual([]);

      // Non-baseline f2 is disposed
      expect(() => f2.setValue("y")).toThrow("Field is disposed");

      // clear on empty array is safe no-op
      expect(() => array.clear()).not.toThrow();

      array.dispose();
    });

    test("array disposal cascades and disposes all child item scopes", () => {
      const f1 = createField({ initialValue: "1" });
      const f2 = createField({ initialValue: "2" });
      const array = createFieldArray({ items: [f1, f2] });

      array.dispose();

      expect(() => array.getValue()).toThrow("Array is disposed");
      expect(() => array.append(createField({ initialValue: "3" }))).toThrow("Array is disposed");
      expect(() => f1.setValue("new")).toThrow("Field is disposed");
      expect(() => f2.setValue("new")).toThrow("Field is disposed");

      // Idempotent disposal
      expect(() => array.dispose()).not.toThrow();
    });

    test("root Form and FieldGroup disposal cascades through FieldArray", () => {
      const f = createField({ initialValue: "nested" });
      const array = createFieldArray({ items: [f] });
      const group = createFieldGroup({ fields: { list: array } });
      const form = createForm({ fields: { grp: group } });

      form.dispose();

      expect(() => form.getValue()).toThrow("Form is disposed");
      expect(() => group.getValue()).toThrow("Group is disposed");
      expect(() => array.getValue()).toThrow("Array is disposed");
      expect(() => f.getValue()).toThrow("Field is disposed");
    });

    test("initial duplicate key failure throws, leaves all candidate nodes standalone, usable, and not disposed", () => {
      const f1 = createField({ initialValue: "apple" });
      const f2 = createField({ initialValue: "banana" });

      expect(() =>
        createFieldArray({
          items: [f1, f2],
          keyExtractor: () => "duplicate_key",
        }),
      ).toThrow('Duplicate key "duplicate_key" detected in FieldArray');

      // Both nodes remain standalone, usable, and not disposed
      expect(() => f1.setValue("apple-modified")).not.toThrow();
      expect(f1.getValue()).toBe("apple-modified");
      expect(() => f2.setValue("banana-modified")).not.toThrow();
      expect(f2.getValue()).toBe("banana-modified");

      f1.dispose();
      f2.dispose();
    });

    test("initial invalid/adoption-ineligible later item leaves earlier valid nodes standalone with zero partial adoption", () => {
      const f1 = createField({ initialValue: "valid-1" });
      const f2 = createField({ initialValue: "valid-2" });
      const fDisposed = createField({ initialValue: "dead" });
      fDisposed.dispose();

      expect(() =>
        createFieldArray({
          items: [f1, f2, fDisposed],
        }),
      ).toThrow('Cannot adopt node at "array item at index 2": node is disposed');

      // Earlier valid nodes were not adopted and not disposed
      expect(() => f1.setValue("f1-alive")).not.toThrow();
      expect(f1.getValue()).toBe("f1-alive");
      expect(() => f2.setValue("f2-alive")).not.toThrow();
      expect(f2.getValue()).toBe("f2-alive");

      // f1 and f2 can be adopted by another array cleanly
      const newArray = createFieldArray({ items: [f1, f2] });
      expect(newArray.getValue()).toEqual(["f1-alive", "f2-alive"]);

      newArray.dispose();
    });

    test("insert duplicate key leaves candidate standalone and existing item healthy", () => {
      const f1 = createField({ initialValue: "existing" });
      const array = createFieldArray({
        items: [f1],
        keyExtractor: (node) => (node.getValue() === "existing" ? "fixed_key" : "fixed_key"),
      });

      const candidate = createField({ initialValue: "candidate" });
      expect(() => array.insert(0, candidate)).toThrow(
        'Duplicate key "fixed_key" detected in FieldArray',
      );

      // Array state unchanged
      expect(array.items.get().length).toBe(1);
      expect(array.items.get()[0]!.node).toBe(f1);
      expect(array.getValue()).toEqual(["existing"]);

      // Candidate remains standalone and usable
      expect(() => candidate.setValue("candidate-still-works")).not.toThrow();
      expect(candidate.getValue()).toBe("candidate-still-works");

      // Existing item and array still work normally
      f1.setValue("existing-modified");
      expect(array.getValue()).toEqual(["existing-modified"]);

      candidate.dispose();
      array.dispose();
    });

    test("insert adoption-ineligible node (disposed, tree-owned, external-scope) leaves array and candidate unchanged", () => {
      const f1 = createField({ initialValue: "orig" });
      const array = createFieldArray({ items: [f1] });

      const fDisposed = createField({ initialValue: "dead" });
      fDisposed.dispose();

      expect(() => array.insert(0, fDisposed)).toThrow(
        'Cannot adopt node at "array item at index 0": node is disposed',
      );
      expect(array.items.get().length).toBe(1);

      const externalScope = createScope({ name: "ext" });
      const fScoped = createField({ initialValue: "scoped", scope: externalScope });
      expect(() => array.append(fScoped)).toThrow(
        'Cannot adopt node at "array item at index 0": node already has an external Scope owner',
      );
      expect(array.items.get().length).toBe(1);

      // Candidate fScoped was not mutated
      expect(() => fScoped.setValue("scoped-edit")).not.toThrow();
      expect(fScoped.getValue()).toBe("scoped-edit");

      externalScope.dispose();
      array.dispose();
    });

    test("failed append and prepend provide same zero-mutation guarantee", () => {
      const f1 = createField({ initialValue: "only" });
      const array = createFieldArray({ items: [f1] });

      const fTree = createField({ initialValue: "in-other-tree" });
      const otherArr = createFieldArray({ items: [fTree] });

      expect(() => array.append(fTree)).toThrow(
        'Cannot adopt node at "array item at index 0": node is already part of another form or group',
      );
      expect(array.items.get().length).toBe(1);

      expect(() => array.prepend(fTree)).toThrow(
        'Cannot adopt node at "array item at index 0": node is already part of another form or group',
      );
      expect(array.items.get().length).toBe(1);

      array.dispose();
      otherArr.dispose();
    });

    test("successful operation after a rejected collision still works", () => {
      const keyGen = (v: string) => v;
      const f1 = createField({ initialValue: "item-1" });
      const array = createFieldArray({
        items: [f1],
        keyExtractor: (n) => keyGen(n.getValue()),
      });

      // Attempt insert with duplicate key "item-1"
      const fDup = createField({ initialValue: "item-1" });
      expect(() => array.append(fDup)).toThrow('Duplicate key "item-1" detected in FieldArray');
      expect(array.items.get().length).toBe(1);

      // Subsequent valid append succeeds
      const fValid = createField({ initialValue: "item-2" });
      const appended = array.append(fValid);
      expect(appended.id).toBe("item-2");
      expect(array.items.get().length).toBe(2);
      expect(array.getValue()).toEqual(["item-1", "item-2"]);

      fDup.dispose();
      array.dispose();
    });

    test("array disposal after rejected collision disposes every legitimately owned item exactly once", () => {
      const f1 = createField({ initialValue: "item-1" });
      const array = createFieldArray({
        items: [f1],
        keyExtractor: (n) => n.getValue(),
      });

      const fDup = createField({ initialValue: "item-1" });
      expect(() => array.append(fDup)).toThrow('Duplicate key "item-1" detected in FieldArray');

      // Dispose array
      array.dispose();

      // Legitimate child f1 is disposed
      expect(() => f1.setValue("new")).toThrow("Field is disposed");

      // Rejected candidate fDup is NOT disposed by array disposal
      expect(() => fDup.setValue("candidate-works")).not.toThrow();
      expect(fDup.getValue()).toBe("candidate-works");

      fDup.dispose();
    });
  });

  describe("Reactivity & Aggregation (Dirty, Touched, Pending, Valid, Issues)", () => {
    test("dirty tracks item value changes and structural modifications strictly", () => {
      const f1 = createField({ initialValue: "a" });
      const f2 = createField({ initialValue: "b" });
      const array = createFieldArray({ items: [f1, f2] });

      expect(array.dirty.get()).toBe(false);

      // Leaf edit -> dirty
      f1.setValue("a-modified");
      expect(array.dirty.get()).toBe(true);

      // Revert leaf edit -> pristine
      f1.setValue("a");
      expect(array.dirty.get()).toBe(false);

      // Append -> dirty
      const f3 = createField({ initialValue: "c" });
      array.append(f3);
      expect(array.dirty.get()).toBe(true);

      // Remove appended -> pristine
      array.remove(2);
      expect(array.dirty.get()).toBe(false);

      // Reorder items -> dirty
      array.swap(0, 1);
      expect(array.dirty.get()).toBe(true);

      // Swap back -> pristine
      array.swap(0, 1);
      expect(array.dirty.get()).toBe(false);

      array.dispose();
    });

    test("touched aggregates across items", () => {
      const f1 = createField({ initialValue: "a" });
      const f2 = createField({ initialValue: "b" });
      const array = createFieldArray({ items: [f1, f2] });

      expect(array.touched.get()).toBe(false);

      f2.markTouched();
      expect(array.touched.get()).toBe(true);

      f2.setTouched(false);
      expect(array.touched.get()).toBe(false);

      array.dispose();
    });

    test("issues aggregates child issues with current array index prefix", () => {
      const rule: SyncValidationRule<string> = (val) =>
        val.length < 3 ? { code: "min_len", message: "Too short" } : null;

      const f0 = createField({ initialValue: "valid", rules: [rule] });
      const f1 = createField({ initialValue: "valid-str", rules: [rule] });
      const array = createFieldArray({ items: [f0, f1] });

      expect(array.valid.get()).toBe(true);

      // Mutate f0 to trigger validation
      f0.setValue("ab");

      expect(array.valid.get()).toBe(false);
      expect(array.invalid.get()).toBe(true);
      expect(array.issues.get()).toEqual([
        {
          code: "min_len",
          message: "Too short",
          source: "validation",
          path: [0],
        },
      ]);

      // Move item 0 to index 1: issue path dynamically reflects new index [1]
      array.move(0, 1);
      expect(array.issues.get()).toEqual([
        {
          code: "min_len",
          message: "Too short",
          source: "validation",
          path: [1],
        },
      ]);

      // Fix issue
      f0.setValue("now-valid");
      expect(array.valid.get()).toBe(true);
      expect(array.invalid.get()).toBe(false);
      expect(array.issues.get()).toEqual([]);

      array.dispose();
    });

    test("nested group issues receive [arrayIndex, fieldName, ...path]", () => {
      const rule: SyncValidationRule<number> = (v) => (v < 0 ? { code: "positive" } : null);

      const array = createFieldArray({
        items: [
          createFieldGroup({
            fields: {
              name: createField({ initialValue: "John" }),
              age: createField({ initialValue: 10, rules: [rule] }),
            },
          }),
        ],
      });

      expect(array.valid.get()).toBe(true);

      // Mutate age to invalid
      array.items.get()[0]!.node.fields.age.setValue(-5);

      expect(array.valid.get()).toBe(false);
      expect(array.issues.get()).toEqual([
        {
          code: "positive",
          source: "validation",
          path: [0, "age"],
        },
      ]);

      array.dispose();
    });
  });

  describe("Async Validation & Remove/Move Race Conditions", () => {
    test("removing an item while async validation is pending disposes controller and clears pending", async () => {
      let resolveAsync: ((val: FieldIssue | null) => void) | undefined;
      const asyncRule: AsyncValidationRule<string> = () =>
        new Promise((resolve) => {
          resolveAsync = resolve;
        });

      const f0 = createField({ initialValue: "valid" });
      const f1 = createField({ initialValue: "async-test", rules: [asyncRule] });
      const array = createFieldArray({ items: [f0, f1] });

      // Trigger async validation on f1
      f1.setValue("trigger-async");
      expect(f1.pending.get()).toBe(true);
      expect(array.pending.get()).toBe(true);

      // Remove f1 while validation is pending
      array.remove(1);
      expect(array.pending.get()).toBe(false);
      expect(array.items.get().length).toBe(1);

      // Late resolution occurs after removal
      resolveAsync?.({ code: "late_error", message: "Stale", source: "validation" });
      await new Promise((r) => setTimeout(r, 10));

      // Array remains pristine and valid with zero stale issue leakage
      expect(array.pending.get()).toBe(false);
      expect(array.valid.get()).toBe(true);
      expect(array.issues.get()).toEqual([]);

      array.dispose();
    });

    test("moving an item while async validation is pending updates issue path upon resolution", async () => {
      let resolveAsync: ((val: FieldIssue | null) => void) | undefined;
      const asyncRule: AsyncValidationRule<string> = () =>
        new Promise((resolve) => {
          resolveAsync = resolve;
        });

      const f0 = createField({ initialValue: "zero" });
      const f1 = createField({ initialValue: "one", rules: [asyncRule] });
      const array = createFieldArray({ items: [f0, f1] });

      // Start validation on item at index 1
      f1.setValue("validating");
      expect(array.pending.get()).toBe(true);

      // Move item from index 1 to index 0
      array.move(1, 0);
      expect(array.items.get()[0]!.node).toBe(f1);

      // Resolve async validation with an issue
      resolveAsync?.({ code: "async_err", message: "Async failed", source: "validation" });
      await new Promise((r) => setTimeout(r, 20));

      expect(array.pending.get()).toBe(false);
      expect(array.valid.get()).toBe(false);
      expect(array.issues.get()).toEqual([
        {
          code: "async_err",
          message: "Async failed",
          source: "validation",
          path: [0],
        },
      ]);

      array.dispose();
    });
  });

  describe("Reset Semantics", () => {
    test("reset restores baseline order, discards appended items, and resets remaining baseline items", () => {
      const f0 = createField({ initialValue: "base-0" });
      const f1 = createField({ initialValue: "base-1" });
      const array = createFieldArray({ items: [f0, f1] });

      const id0 = array.items.get()[0]!.id;
      const id1 = array.items.get()[1]!.id;

      // 1. Mutate field values
      f0.setValue("mutated-0");
      // 2. Append new item
      const fAdded = createField({ initialValue: "added" });
      array.append(fAdded);
      // 3. Move items
      array.move(0, 1);

      expect(array.getValue()).toEqual(["base-1", "mutated-0", "added"]);
      expect(array.dirty.get()).toBe(true);

      // Reset
      array.reset();

      expect(array.getValue()).toEqual(["base-0", "base-1"]);
      expect(array.items.get().length).toBe(2);
      expect(array.items.get()[0]!.id).toBe(id0);
      expect(array.items.get()[0]!.node).toBe(f0);
      expect(array.items.get()[1]!.id).toBe(id1);
      expect(array.items.get()[1]!.node).toBe(f1);
      expect(array.dirty.get()).toBe(false);
      expect(array.touched.get()).toBe(false);

      // Appended node was disposed by reset
      expect(() => fAdded.setValue("should fail")).toThrow("Field is disposed");

      array.dispose();
    });

    test("removing a baseline item and calling reset restores original item, stable id, and node instance", () => {
      const a = createField({ initialValue: "a" });
      const b = createField({ initialValue: "b" });
      const array = createFieldArray({ items: [a, b] });

      const idA = array.items.get()[0]!.id;
      const idB = array.items.get()[1]!.id;

      // Remove baseline item 0 ("a")
      array.remove(0);
      expect(array.getValue()).toEqual(["b"]);
      expect(array.dirty.get()).toBe(true);

      // Baseline-retained node is still tree-owned by the array: cannot be disposed directly or adopted elsewhere
      expect(() => a.dispose()).toThrow("Cannot dispose an adopted field directly");
      expect(() => createFieldArray({ items: [a] })).toThrow(
        "node is already part of another form or group",
      );

      // Reset restores "a" and "b" in original baseline order with exact node identities
      array.reset();
      expect(array.getValue()).toEqual(["a", "b"]);
      expect(array.items.get()[0]!.id).toBe(idA);
      expect(array.items.get()[0]!.node).toBe(a);
      expect(array.items.get()[1]!.id).toBe(idB);
      expect(array.items.get()[1]!.node).toBe(b);
      expect(array.dirty.get()).toBe(false);

      // Restored node is active and usable
      a.setValue("a-updated");
      expect(array.getValue()).toEqual(["a-updated", "b"]);

      array.dispose();
    });

    test("keyExtractor returning an empty string throws TypeError and leaves candidates standalone", () => {
      const f1 = createField({ initialValue: "test" });
      expect(() =>
        createFieldArray({
          items: [f1],
          keyExtractor: () => "",
        }),
      ).toThrow(TypeError);

      // Candidate f1 was not mutated or adopted
      expect(() => f1.setValue("new")).not.toThrow();
      expect(() => f1.dispose()).not.toThrow();
    });

    test("removing multiple baseline items then calling reset restores all items in canonical order", () => {
      const a = createField({ initialValue: "1" });
      const b = createField({ initialValue: "2" });
      const c = createField({ initialValue: "3" });
      const array = createFieldArray({ items: [a, b, c] });

      const [idA, idB, idC] = array.items.get().map((it) => it.id);

      array.remove(1); // remove "2" -> [1, 3]
      array.remove(0); // remove "1" -> [3]
      expect(array.getValue()).toEqual(["3"]);
      expect(array.dirty.get()).toBe(true);

      array.reset();
      expect(array.getValue()).toEqual(["1", "2", "3"]);
      expect(array.items.get().map((it) => it.id)).toEqual([idA, idB, idC]);
      expect(array.items.get().map((it) => it.node)).toEqual([a, b, c]);
      expect(array.dirty.get()).toBe(false);

      array.dispose();
    });

    test("clear() on baseline array then reset() restores all baseline items and pristine dirty state", () => {
      const a = createField({ initialValue: "x" });
      const b = createField({ initialValue: "y" });
      const array = createFieldArray({ items: [a, b] });

      const [idA, idB] = array.items.get().map((it) => it.id);

      array.clear();
      expect(array.items.get()).toEqual([]);
      expect(array.getValue()).toEqual([]);
      expect(array.dirty.get()).toBe(true);

      array.reset();
      expect(array.getValue()).toEqual(["x", "y"]);
      expect(array.items.get()[0]!.id).toBe(idA);
      expect(array.items.get()[0]!.node).toBe(a);
      expect(array.items.get()[1]!.id).toBe(idB);
      expect(array.items.get()[1]!.node).toBe(b);
      expect(array.dirty.get()).toBe(false);

      array.dispose();
    });

    test("baseline item moved then removed then reset restores original canonical baseline position", () => {
      const a = createField({ initialValue: "a" });
      const b = createField({ initialValue: "b" });
      const c = createField({ initialValue: "c" });
      const array = createFieldArray({ items: [a, b, c] });

      // Move c to start: [c, a, b]
      array.move(2, 0);
      expect(array.getValue()).toEqual(["c", "a", "b"]);

      // Remove a (now at index 1): [c, b]
      array.remove(1);
      expect(array.getValue()).toEqual(["c", "b"]);

      // Reset restores [a, b, c]
      array.reset();
      expect(array.getValue()).toEqual(["a", "b", "c"]);
      expect(array.items.get()[0]!.node).toBe(a);
      expect(array.items.get()[1]!.node).toBe(b);
      expect(array.items.get()[2]!.node).toBe(c);
      expect(array.dirty.get()).toBe(false);

      array.dispose();
    });

    test("appended non-baseline item is disposed on remove or clear and not restored on reset", () => {
      const a = createField({ initialValue: "base" });
      const array = createFieldArray({ items: [a] });

      const extra1 = createField({ initialValue: "extra-1" });
      const extra2 = createField({ initialValue: "extra-2" });
      array.append(extra1);
      array.append(extra2);

      // Remove extra1 -> extra1 is disposed immediately because it's not in baseline
      array.remove(1);
      expect(() => extra1.setValue("mut")).toThrow("Field is disposed");

      // Clear remaining items ([base, extra2])
      array.clear();
      expect(() => extra2.setValue("mut")).toThrow("Field is disposed");

      // Reset restores only baseline "base"
      array.reset();
      expect(array.getValue()).toEqual(["base"]);
      expect(array.items.get()[0]!.node).toBe(a);
      expect(() => a.setValue("base-updated")).not.toThrow();

      array.dispose();
    });

    test("baseline child state mutated then removed then reset restores canonical baseline values", () => {
      const a = createField({ initialValue: "a-init" });
      const array = createFieldArray({ items: [a] });

      // Mutate child
      a.setValue("a-mutated");
      a.markTouched();
      expect(array.dirty.get()).toBe(true);
      expect(array.touched.get()).toBe(true);

      // Remove child
      array.remove(0);
      expect(array.getValue()).toEqual([]);

      // Reset restores child with pristine baseline value and untouched
      array.reset();
      expect(array.getValue()).toEqual(["a-init"]);
      expect(a.getValue()).toBe("a-init");
      expect(a.touched.get()).toBe(false);
      expect(a.dirty.get()).toBe(false);
      expect(array.dirty.get()).toBe(false);
      expect(array.touched.get()).toBe(false);

      array.dispose();
    });

    test("parsed field baseline Raw/Value presentation is restored on reset after removal", () => {
      const f = createField<number, string>({
        initialValue: 5,
        initialRawValue: "05",
        parser: createNumberParser(),
      });
      const array = createFieldArray({ items: [f] });

      f.setRawValue("099");
      expect(array.getValue()).toEqual([99]);
      expect(array.getRawValue()).toEqual(["099"]);

      array.remove(0);
      expect(array.getValue()).toEqual([]);

      array.reset();
      expect(array.getValue()).toEqual([5]);
      expect(array.getRawValue()).toEqual(["05"]);
      expect(f.getValue()).toBe(5);
      expect(f.getRawValue()).toBe("05");

      array.dispose();
    });

    test("repeated remove and reset cycles do not leak or double-dispose", () => {
      const a = createField({ initialValue: "a" });
      const b = createField({ initialValue: "b" });
      const array = createFieldArray({ items: [a, b] });

      for (let i = 0; i < 5; i++) {
        array.remove(0);
        expect(array.getValue()).toEqual(["b"]);
        array.reset();
        expect(array.getValue()).toEqual(["a", "b"]);
        expect(array.items.get()[0]!.node).toBe(a);
        expect(array.items.get()[1]!.node).toBe(b);
      }

      array.dispose();
    });

    test("remove baseline item with pending async validation aborts work, causes no stale leak, and reset restores clean state", async () => {
      let resolveAsync: ((val: FieldIssue | null) => void) | undefined;
      const asyncRule: AsyncValidationRule<string> = () =>
        new Promise((resolve) => {
          resolveAsync = resolve;
        });

      const f0 = createField({ initialValue: "zero" });
      const f1 = createField({ initialValue: "one", rules: [asyncRule] });
      const array = createFieldArray({ items: [f0, f1] });

      // Start validation on baseline item f1
      f1.setValue("validating");
      expect(f1.pending.get()).toBe(true);
      expect(array.pending.get()).toBe(true);

      // Remove baseline item f1 -> aborts pending validation
      array.remove(1);
      expect(array.pending.get()).toBe(false);
      expect(f1.pending.get()).toBe(false);

      // Late resolution occurs while f1 is baseline-retained
      resolveAsync?.({ code: "stale_err", message: "Stale error", source: "validation" });
      await new Promise((r) => setTimeout(r, 20));

      // Active array is clean
      expect(array.pending.get()).toBe(false);
      expect(array.valid.get()).toBe(true);
      expect(array.issues.get()).toEqual([]);

      // Reset restores f1 in pristine, valid state
      array.reset();
      expect(array.getValue()).toEqual(["zero", "one"]);
      expect(array.pending.get()).toBe(false);
      expect(array.valid.get()).toBe(true);
      expect(array.issues.get()).toEqual([]);

      array.dispose();
    });

    test("reinitialize establishes new baseline and disposes obsolete retained baseline items", () => {
      const a = createField({ initialValue: "a" });
      const b = createField({ initialValue: "b" });
      const array = createFieldArray({ items: [a, b] });
      const form = createForm({ fields: { list: array } });

      // Remove baseline item "a" -> active list is [b], "a" is baseline-retained
      array.remove(0);
      expect(form.getValue()).toEqual({ list: ["b"] });

      // Reinitialize form with new baseline for active structure
      form.reinitialize({
        value: { list: ["b-reinit"] },
        rawValue: { list: ["b-reinit"] },
      });

      expect(form.getValue()).toEqual({ list: ["b-reinit"] });
      expect(form.dirty.get()).toBe(false);

      // "a" was obsolete and was disposed during reinitialize
      expect(() => a.setValue("should fail")).toThrow("Field is disposed");

      // Reset restores new baseline only
      form.fields.list.items.get()[0]!.node.setValue("b-modified");
      expect(form.dirty.get()).toBe(true);
      form.reset();
      expect(form.getValue()).toEqual({ list: ["b-reinit"] });
      expect(form.dirty.get()).toBe(false);

      form.dispose();
    });
  });

  describe("Whole-Form Reinitialize Integration", () => {
    test("reinitialize updates array item baselines and resets dirty state", () => {
      const form = createForm({
        fields: {
          contacts: createFieldArray({
            items: [
              createFieldGroup({
                fields: {
                  name: createField({ initialValue: "Alice" }),
                  age: createField<number, string>({
                    initialValue: 25,
                    initialRawValue: "25",
                    parser: createNumberParser(),
                  }),
                },
              }),
            ],
          }),
        },
      });

      const initialId = form.fields.contacts.items.get()[0]!.id;

      // Mutate leaf field
      form.fields.contacts.items.get()[0]!.node.fields.name.setValue("Alice Modified");
      expect(form.dirty.get()).toBe(true);

      // Reinitialize with new baseline
      form.reinitialize({
        value: {
          contacts: [{ name: "Bob", age: 30 }],
        },
        rawValue: {
          contacts: [{ name: "Bob", age: "30" }],
        },
      });

      expect(form.getValue()).toEqual({
        contacts: [{ name: "Bob", age: 30 }],
      });
      expect(form.getRawValue()).toEqual({
        contacts: [{ name: "Bob", age: "30" }],
      });
      expect(form.dirty.get()).toBe(false);
      expect(form.touched.get()).toBe(false);

      // Preserves existing item stable ID
      expect(form.fields.contacts.items.get()[0]!.id).toBe(initialId);

      // Reset after reinitialize restores new baseline
      form.fields.contacts.items.get()[0]!.node.fields.name.setValue("Bob Modified");
      expect(form.dirty.get()).toBe(true);
      form.reset();
      expect(form.getValue()).toEqual({
        contacts: [{ name: "Bob", age: 30 }],
      });
      expect(form.dirty.get()).toBe(false);

      form.dispose();
    });

    test("reinitialize fails cleanly with zero mutations on malformed input or length mismatch", () => {
      const form = createForm({
        fields: {
          items: createFieldArray({
            items: [createField({ initialValue: "original" })],
          }),
        },
      });

      // Length mismatch: expected 1, passed 2
      expect(() =>
        form.reinitialize({
          value: { items: ["a", "b"] },
          rawValue: { items: ["a", "b"] },
        }),
      ).toThrow(TypeError);

      // Non-array input
      expect(() =>
        form.reinitialize({
          value: { items: "not-an-array" as never },
          rawValue: { items: "not-an-array" as never },
        }),
      ).toThrow(TypeError);

      // Form remains pristine and unmutated
      expect(form.getValue()).toEqual({ items: ["original"] });
      expect(form.dirty.get()).toBe(false);

      form.dispose();
    });
  });

  describe("Security: Data vs Sink Prototype Invariants", () => {
    test("item values with property names like __proto__, constructor, prototype remain valid data", () => {
      type DangerousRecord = { __proto__: string; constructor: string; prototype: string };

      const array = createFieldArray({
        items: [
          createField<DangerousRecord>({
            initialValue: {
              __proto__: "data-proto",
              constructor: "data-constructor",
              prototype: "data-prototype",
            },
          }),
        ],
      });

      expect(array.getValue()).toEqual([
        {
          __proto__: "data-proto",
          constructor: "data-constructor",
          prototype: "data-prototype",
        },
      ]);
      expect(array.valid.get()).toBe(true);

      array.dispose();
    });
  });

  describe("Recursive Nesting: Nested FieldArray & Form Integration", () => {
    test("nested FieldArray inside FieldArray aggregates values and paths", () => {
      const innerArray = createFieldArray({
        items: [
          createField({
            initialValue: "nested-value",
            rules: [(v: string) => (v === "bad" ? { code: "invalid_nested" } : null)],
          }),
        ],
      });

      const outerArray = createFieldArray({
        items: [innerArray],
      });

      expect(outerArray.getValue()).toEqual([["nested-value"]]);
      expect(outerArray.valid.get()).toBe(true);

      // Invalidate inner field
      innerArray.items.get()[0]!.node.setValue("bad");
      expect(outerArray.valid.get()).toBe(false);
      expect(outerArray.issues.get()).toEqual([
        {
          code: "invalid_nested",
          source: "validation",
          path: [0, 0],
        },
      ]);

      outerArray.dispose();
    });
  });

  describe("Explicit validate() on FieldArray", () => {
    test("validate() executes on all child nodes and returns aggregate issues", async () => {
      const syncRule = vi.fn<SyncValidationRule<string>>((v) =>
        v === "" ? { code: "required", message: "Required" } : null,
      );

      const f1 = createField({ initialValue: "", rules: [syncRule], validateOn: "manual" });
      const f2 = createField({ initialValue: "valid", rules: [syncRule], validateOn: "manual" });
      const array = createFieldArray({ items: [f1, f2] });

      const issues = await array.validate();
      expect(issues).toHaveLength(1);
      expect(issues[0]!.code).toBe("required");
      expect(issues[0]!.path).toEqual([0]);

      array.dispose();
    });
  });
});
