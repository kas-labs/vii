import { describe, expect, it, vi } from "vitest";
import { batch, createScope } from "../../packages/core/src/index.js";
import {
  createField,
  createFieldArray,
  createFieldGroup,
  createForm,
  type FieldState,
  type FieldValues,
  type FormInstance,
} from "./form-core.js";
import { createNumberParser } from "./parser.js";

describe("Form Research F9: Runtime Scaling, Fan-Out & Aggregate Evidence", () => {
  // ---------------------------------------------------------------------------
  // 1. Scaled Form Construction & Mutation Lifecycle
  // ---------------------------------------------------------------------------
  describe("Form Scaling Baselines (10, 100, 500, 1000 fields)", () => {
    function createFlatTestForm(fieldCount: number): FormInstance<FieldValues> {
      const initialValues: Record<string, string> = {};
      for (let i = 0; i < fieldCount; i++) {
        initialValues[`field_${i}`] = `value_${i}`;
      }
      return createForm({ initialValues });
    }

    it("measures small form (10 fields) construction, mutation, validation, disposal", () => {
      const form = createFlatTestForm(10);
      expect(Object.keys(form.fields).length).toBe(10);
      expect(form.dirty.get()).toBe(false);

      // Single field mutation
      (form.fields["field_0"] as FieldState<string>).setValue("updated_0");
      expect(form.dirty.get()).toBe(true);
      expect(form.values.get()["field_0"]).toBe("updated_0");

      // Subset mutation via setValues
      form.setValues({ field_1: "updated_1", field_2: "updated_2" });
      expect(form.values.get()["field_1"]).toBe("updated_1");
      expect(form.values.get()["field_2"]).toBe("updated_2");

      // Reset
      form.reset();
      expect(form.dirty.get()).toBe(false);
      expect(form.values.get()["field_0"]).toBe("value_0");

      form.dispose();
    });

    it("measures medium form (100 fields) construction, mutation, validation, disposal", () => {
      const form = createFlatTestForm(100);
      expect(Object.keys(form.fields).length).toBe(100);
      expect(form.dirty.get()).toBe(false);

      // Mutate 10 random fields
      for (let i = 0; i < 10; i++) {
        (form.fields[`field_${i * 10}`] as FieldState<string>).setValue(`mod_${i}`);
      }
      expect(form.dirty.get()).toBe(true);
      expect(form.values.get()["field_90"]).toBe("mod_9");

      // Validate
      const issues = form.validate();
      expect(issues).toEqual([]);

      form.dispose();
    });

    it("measures large form (500 fields) operations and steady-state mutations", () => {
      const form = createFlatTestForm(500);
      expect(Object.keys(form.fields).length).toBe(500);

      // Single field update in 500-field form
      (form.fields["field_250"] as FieldState<string>).setValue("changed_250");
      expect(form.values.get()["field_250"]).toBe("changed_250");
      expect(form.dirty.get()).toBe(true);

      // setValues on subset (20 fields)
      const subset: Record<string, string> = {};
      for (let i = 0; i < 20; i++) {
        subset[`field_${i}`] = `sub_${i}`;
      }
      form.setValues(subset);
      expect(form.values.get()["field_19"]).toBe("sub_19");

      form.dispose();
    });

    it("measures stress form (1,000 fields) construction and disposal", () => {
      const form = createFlatTestForm(1000);
      expect(Object.keys(form.fields).length).toBe(1000);

      (form.fields["field_999"] as FieldState<string>).setValue("last_changed");
      expect(form.values.get()["field_999"]).toBe("last_changed");

      form.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Large Realistic Nested Form (~100-300 leaf fields)
  // ---------------------------------------------------------------------------
  describe("Large Realistic Nested Form", () => {
    function buildRealisticNestedForm(): FormInstance<any> {
      const initialValues = {
        profile: {
          firstName: "Ada",
          lastName: "Lovelace",
          title: "Senior Mathematician",
          department: "Computing",
          contact: {
            email: "ada@computing.org",
            phone: "+44 1234 567890",
            emergency: {
              name: "Lord Byron",
              relation: "Father",
              phone: "+44 9876 543210",
            },
          },
        },
        preferences: {
          notifications: true,
          theme: "dark",
          language: "en-GB",
          timezone: "Europe/London",
        },
        addresses: Array.from({ length: 20 }, (_, i) => ({
          street: `Street ${i}`,
          city: `City ${i}`,
          postalCode: `AB${i} 3CD`,
          country: "UK",
          isPrimary: i === 0,
        })),
        workHistory: Array.from({ length: 15 }, (_, i) => ({
          company: `Company ${i}`,
          role: `Role ${i}`,
          startDate: `201${i % 10}-01-01`,
          endDate: `202${i % 6}-01-01`,
          description: `Extensive work on project ${i}`,
        })),
      };

      return createForm({
        initialValues,
        rules: [
          (vals: any) =>
            vals.addresses.length >= 1
              ? null
              : {
                  code: "min_addresses",
                  message: "At least one address is required",
                  path: ["addresses"],
                },
        ],
      });
    }

    it("handles complex nested form navigation, updates, and deep validation", () => {
      const form = buildRealisticNestedForm();

      // Verify deep node resolution via strict path navigation
      const postalNode = form.getNode("addresses[0].postalCode") as FieldState<string>;
      expect(postalNode).toBeDefined();
      expect(postalNode.value.get()).toBe("AB0 3CD");

      // Mutate deep nested node
      postalNode.setValue("SW1A 1AA");
      expect(form.dirty.get()).toBe(true);
      expect(form.values.get().addresses[0].postalCode).toBe("SW1A 1AA");

      // Validate entire complex tree
      const issues = form.validate();
      expect(issues).toEqual([]);

      form.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Fan-Out & Notification Granularity
  // ---------------------------------------------------------------------------
  describe("Invalidation Fan-Out and Granularity", () => {
    it("proves single field change notifies ONLY direct subscribers and affected aggregates (zero sibling notification)", () => {
      const form = createForm({
        initialValues: {
          fieldA: "A",
          fieldB: "B",
          fieldC: "C",
          group1: {
            g1_a: "G1_A",
            g1_b: "G1_B",
          },
        },
      });

      const subA = vi.fn();
      const subB = vi.fn();
      const subC = vi.fn();
      const subG1_A = vi.fn();
      const subG1_B = vi.fn();
      const subFormValues = vi.fn();

      (form.fields.fieldA as FieldState<string>).value.subscribe(subA);
      (form.fields.fieldB as FieldState<string>).value.subscribe(subB);
      (form.fields.fieldC as FieldState<string>).value.subscribe(subC);
      ((form.fields.group1 as any).fields.g1_a as FieldState<string>).value.subscribe(subG1_A);
      ((form.fields.group1 as any).fields.g1_b as FieldState<string>).value.subscribe(subG1_B);
      form.values.subscribe(subFormValues);

      // Mutate Field A
      (form.fields.fieldA as FieldState<string>).setValue("A2");

      expect(subA).toHaveBeenCalledTimes(1);
      expect(subB).toHaveBeenCalledTimes(0); // Zero sibling notification
      expect(subC).toHaveBeenCalledTimes(0); // Zero sibling notification
      expect(subG1_A).toHaveBeenCalledTimes(0); // Zero nested sibling notification
      expect(subG1_B).toHaveBeenCalledTimes(0); // Zero nested sibling notification
      expect(subFormValues).toHaveBeenCalledTimes(1); // Form aggregate notified once

      // Mutate Group1.g1_a
      ((form.fields.group1 as any).fields.g1_a as FieldState<string>).setValue("G1_A2");

      expect(subA).toHaveBeenCalledTimes(1); // Still 1
      expect(subG1_A).toHaveBeenCalledTimes(1); // Notified
      expect(subG1_B).toHaveBeenCalledTimes(0); // Zero nested sibling notification
      expect(subFormValues).toHaveBeenCalledTimes(2);

      form.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Batching & form.setValues Batching
  // ---------------------------------------------------------------------------
  describe("Batching Behavior", () => {
    it("proves form.setValues coalesces all field mutations into a single aggregate notification", () => {
      const form = createForm({
        initialValues: {
          a: 1,
          b: 2,
          c: 3,
          d: 4,
          e: 5,
        },
      });

      const aggregateSub = vi.fn();
      form.values.subscribe(aggregateSub);

      expect(aggregateSub).toHaveBeenCalledTimes(0);

      // Mutate 5 fields at once via setValues
      form.setValues({ a: 10, b: 20, c: 30, d: 40, e: 50 });

      expect(aggregateSub).toHaveBeenCalledTimes(1);
      expect(form.values.get()).toEqual({ a: 10, b: 20, c: 30, d: 40, e: 50 });

      form.dispose();
    });

    it("proves multiple direct setValue calls inside Vii batch() coalesce notifications", () => {
      const form = createForm({
        initialValues: { x: "x", y: "y" },
      });

      const aggregateSub = vi.fn();
      form.values.subscribe(aggregateSub);

      batch(() => {
        (form.fields.x as FieldState<string>).setValue("x2");
        (form.fields.y as FieldState<string>).setValue("y2");
      });

      expect(aggregateSub).toHaveBeenCalledTimes(1);
      expect(form.values.get()).toEqual({ x: "x2", y: "y2" });

      form.dispose();
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Error Path & Exception Boundary Resilience
  // ---------------------------------------------------------------------------
  describe("Error Paths & Resilience", () => {
    it("recovers safely and cleanly when a parser throws", () => {
      const field = createField<number, string>({
        initialValue: 0,
        parser: (raw: string) => {
          if (raw === "throw") throw new Error("Parser failure");
          return { ok: true, value: Number(raw) };
        },
      });

      expect(() => field.setRawValue("throw")).toThrow("Parser failure");
      expect(field.value.get()).toBe(0); // Value preserved
      expect(field.dirty.get()).toBe(false);

      // Valid follow-up parses normally
      field.setRawValue("42");
      expect(field.value.get()).toBe(42);
      expect(field.dirty.get()).toBe(true);
    });

    it("handles validation rule throws gracefully without corrupting form state", () => {
      const field = createField<string>({
        initialValue: "start",
        rules: [
          (val: string) => {
            if (val === "explode") throw new Error("Validator crashed");
            return null;
          },
        ],
      });

      expect(() => field.setValue("explode")).toThrow("Validator crashed");
      expect(field.value.get()).toBe("explode");

      // Follow-up valid value validates cleanly
      field.setValue("clean");
      expect(field.valid.get()).toBe(true);
    });
  });
});
