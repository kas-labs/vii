import { createScope } from "@vii-labs/core";
import { describe, expect, test, vi } from "vitest";
import { createField } from "../../src/core/field.js";
import { createForm } from "../../src/core/form.js";
import { createFieldGroup } from "../../src/core/group.js";
import type { FormReinitializeInput } from "../../src/core/types.js";

describe("createForm (P1d corrections)", () => {
  test("initializes with aggregate domain and raw presentation values", () => {
    const form = createForm({
      fields: {
        title: createField({ initialValue: "Lead Engineer" }),
        salary: createField({ initialValue: 120000 }),
        location: createFieldGroup({
          fields: {
            city: createField({ initialValue: "Berlin" }),
            country: createField({ initialValue: "Germany" }),
          },
        }),
      },
    });

    expect(form.kind).toBe("form");
    expect(form.getValue()).toEqual({
      title: "Lead Engineer",
      salary: 120000,
      location: { city: "Berlin", country: "Germany" },
    });
    expect(form.getRawValue()).toEqual({
      title: "Lead Engineer",
      salary: 120000,
      location: { city: "Berlin", country: "Germany" },
    });
    expect(form.dirty.get()).toBe(false);
    expect(form.touched.get()).toBe(false);
  });

  test("derives aggregate dirty state across nested form hierarchy", () => {
    const form = createForm({
      fields: {
        title: createField({ initialValue: "Engineer" }),
        details: createFieldGroup({
          fields: {
            department: createField({ initialValue: "Core" }),
          },
        }),
      },
    });

    expect(form.dirty.get()).toBe(false);

    form.fields.details.fields.department.setValue("Infrastructure");
    expect(form.dirty.get()).toBe(true);

    form.fields.details.fields.department.setValue("Core");
    expect(form.dirty.get()).toBe(false);
  });

  test("derives aggregate touched state across nested form hierarchy", () => {
    const form = createForm({
      fields: {
        title: createField({ initialValue: "Engineer" }),
        details: createFieldGroup({
          fields: {
            department: createField({ initialValue: "Core" }),
          },
        }),
      },
    });

    expect(form.touched.get()).toBe(false);

    form.fields.details.fields.department.markTouched();
    expect(form.touched.get()).toBe(true);

    form.reset();
    expect(form.touched.get()).toBe(false);
  });

  test("form.reset() atomically restores baseline across whole tree", () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
        address: createFieldGroup({
          fields: {
            city: createField({ initialValue: "Berlin" }),
          },
        }),
      },
    });

    form.fields.name.setValue("Bob");
    form.fields.name.markTouched();
    form.fields.address.fields.city.setValue("Munich");
    form.fields.address.fields.city.markTouched();

    expect(form.getValue()).toEqual({
      name: "Bob",
      address: { city: "Munich" },
    });
    expect(form.dirty.get()).toBe(true);
    expect(form.touched.get()).toBe(true);

    form.reset();

    expect(form.getValue()).toEqual({
      name: "Alice",
      address: { city: "Berlin" },
    });
    expect(form.dirty.get()).toBe(false);
    expect(form.touched.get()).toBe(false);
  });

  test("form disposal cascades to owned groups and fields and is idempotent", () => {
    const name = createField({ initialValue: "Alice" });
    const city = createField({ initialValue: "Berlin" });
    const address = createFieldGroup({ fields: { city } });
    const form = createForm({ fields: { name, address } });

    form.dispose();
    form.dispose(); // Idempotent

    expect(() => form.getValue()).toThrowError("Form is disposed");
    expect(() => form.getRawValue()).toThrowError("Form is disposed");
    expect(() => form.reset()).toThrowError("Form is disposed");
    expect(() =>
      form.reinitialize({
        value: { name: "X", address: { city: "Y" } },
        rawValue: { name: "X", address: { city: "Y" } },
      }),
    ).toThrowError("Form is disposed");
    expect(() => name.getValue()).toThrowError("Field is disposed");
    expect(() => address.getValue()).toThrowError("Group is disposed");
    expect(() => city.getValue()).toThrowError("Field is disposed");
  });

  test("owner Scope disposal cascades to root form and all descendants", () => {
    const ownerScope = createScope({ name: "owner" });
    const name = createField({ initialValue: "Alice" });
    const form = createForm({ fields: { name }, scope: ownerScope });

    ownerScope.dispose();

    expect(() => form.getValue()).toThrowError("Form is disposed");
    expect(() => name.getValue()).toThrowError("Field is disposed");
  });

  test("sibling field isolation and granular reactive subscriptions", () => {
    const name = createField({ initialValue: "Alice" });
    const email = createField({ initialValue: "alice@example.com" });
    const form = createForm({ fields: { name, email } });

    const nameSub = vi.fn();
    const emailSub = vi.fn();
    const formSub = vi.fn();

    name.value.subscribe(nameSub);
    email.value.subscribe(emailSub);
    form.value.subscribe(formSub);

    expect(nameSub).toHaveBeenCalledTimes(0);
    expect(emailSub).toHaveBeenCalledTimes(0);
    expect(formSub).toHaveBeenCalledTimes(0);

    name.setValue("Alicia");

    expect(nameSub).toHaveBeenCalledTimes(1);
    expect(nameSub).toHaveBeenLastCalledWith("Alicia");
    expect(emailSub).toHaveBeenCalledTimes(0); // Sibling not notified!
    expect(formSub).toHaveBeenCalledTimes(1); // Aggregate notified!
    expect(formSub).toHaveBeenLastCalledWith({ name: "Alicia", email: "alice@example.com" });
  });

  test("reinitialize replaces whole-form baseline atomically and preserves node identities", () => {
    const nameField = createField({ initialValue: "A" });
    const cityField = createField({ initialValue: "X" });
    const addressGroup = createFieldGroup({ fields: { city: cityField } });
    const form = createForm({
      fields: {
        name: nameField,
        address: addressGroup,
      },
    });

    // 1. Mutate and touch
    form.fields.name.setValue("B");
    form.fields.address.fields.city.setValue("Y");
    form.fields.name.markTouched();
    form.fields.address.fields.city.markTouched();

    expect(form.getValue()).toEqual({ name: "B", address: { city: "Y" } });
    expect(form.dirty.get()).toBe(true);
    expect(form.touched.get()).toBe(true);

    // 2. Reinitialize with new baseline
    form.reinitialize({
      value: { name: "C", address: { city: "Z" } },
      rawValue: { name: "C", address: { city: "Z" } },
    });

    // Node identities must be preserved
    expect(form.fields.name).toBe(nameField);
    expect(form.fields.address).toBe(addressGroup);
    expect(form.fields.address.fields.city).toBe(cityField);

    // Current values and raw values must match new baseline
    expect(form.getValue()).toEqual({ name: "C", address: { city: "Z" } });
    expect(form.getRawValue()).toEqual({ name: "C", address: { city: "Z" } });
    expect(form.fields.name.getValue()).toBe("C");
    expect(form.fields.address.fields.city.getValue()).toBe("Z");

    // Dirty and touched must be pristine
    expect(form.dirty.get()).toBe(false);
    expect(form.touched.get()).toBe(false);
    expect(form.fields.name.dirty.get()).toBe(false);
    expect(form.fields.name.touched.get()).toBe(false);
    expect(form.fields.address.fields.city.dirty.get()).toBe(false);
    expect(form.fields.address.fields.city.touched.get()).toBe(false);

    // 3. Mutate relative to new baseline
    form.fields.name.setValue("D");
    expect(form.dirty.get()).toBe(true);

    form.fields.name.setValue("C");
    expect(form.dirty.get()).toBe(false);

    // 4. reset() restores reinitialized baseline C/Z (NOT original A/X)
    form.fields.name.setValue("D");
    form.fields.address.fields.city.setValue("W");
    form.reset();

    expect(form.getValue()).toEqual({ name: "C", address: { city: "Z" } });
    expect(form.dirty.get()).toBe(false);
  });

  test("reinitialize validates baseline shape and rejects malformed inputs", () => {
    const fields = {
      name: createField({ initialValue: "A" }),
      address: createFieldGroup({
        fields: { city: createField({ initialValue: "X" }) },
      }),
    };
    const form = createForm({ fields });

    expect(() =>
      form.reinitialize(null as unknown as FormReinitializeInput<typeof fields>),
    ).toThrowError(TypeError);
    expect(() =>
      form.reinitialize(undefined as unknown as FormReinitializeInput<typeof fields>),
    ).toThrowError(TypeError);
    expect(() =>
      form.reinitialize({ value: { name: "C" } } as unknown as FormReinitializeInput<
        typeof fields
      >),
    ).toThrowError(TypeError);
    expect(() =>
      form.reinitialize({
        value: { name: "C", address: { city: "Y" } },
        rawValue: { name: "C", address: null },
      } as unknown as FormReinitializeInput<typeof fields>),
    ).toThrowError(TypeError);
  });

  test("rejects duplicate node adoption across multiple groups or forms", () => {
    const sharedField = createField({ initialValue: "shared" });

    createForm({ fields: { a: sharedField } });

    // Attempting to adopt sharedField into another form must throw
    expect(() => {
      createForm({ fields: { b: sharedField } });
    }).toThrowError(/Cannot adopt node at "b": node is already part of another form or group/);

    // Attempting to adopt sharedField into a group must throw
    expect(() => {
      createFieldGroup({ fields: { c: sharedField } });
    }).toThrowError(/Cannot adopt node at "c": node is already part of another form or group/);
  });

  test("rejects duplicate group adoption across multiple forms", () => {
    const leaf = createField({ initialValue: "leaf" });
    const sharedGroup = createFieldGroup({ fields: { leaf } });

    createForm({ fields: { g1: sharedGroup } });

    expect(() => {
      createForm({ fields: { g2: sharedGroup } });
    }).toThrowError(/Cannot adopt node at "g2": node is already part of another form or group/);
  });

  test("rejects adoption of an externally Scope-owned field or group", () => {
    const externalScope = createScope({ name: "external" });
    const extField = createField({ initialValue: "ext", scope: externalScope });
    const extGroup = createFieldGroup({
      fields: { inner: createField({ initialValue: "in" }) },
      scope: externalScope,
    });

    expect(() => {
      createForm({ fields: { field: extField } });
    }).toThrowError(/Cannot adopt node at "field": node already has an external Scope owner/);

    expect(() => {
      createForm({ fields: { group: extGroup } });
    }).toThrowError(/Cannot adopt node at "group": node already has an external Scope owner/);

    // External scope disposal still disposes the standalone nodes cleanly
    externalScope.dispose();
    expect(() => extField.getValue()).toThrowError("Field is disposed");
    expect(() => extGroup.getValue()).toThrowError("Group is disposed");
  });

  test("rejects adoption of an already disposed field or group", () => {
    const deadField = createField({ initialValue: "dead" });
    deadField.dispose();

    expect(() => {
      createForm({ fields: { dead: deadField } });
    }).toThrowError(/Cannot adopt node at "dead": node is disposed/);

    const deadGroup = createFieldGroup({
      fields: { inner: createField({ initialValue: "inner" }) },
    });
    deadGroup.dispose();

    expect(() => {
      createForm({ fields: { deadG: deadGroup } });
    }).toThrowError(/Cannot adopt node at "deadG": node is disposed/);
  });

  test("two-phase adoption is transactional: failed adoption leaves valid nodes unmutated and adoptable", () => {
    const alreadyOwned = createField({ initialValue: "owned" });
    createForm({ fields: { alreadyOwned } });

    const fresh = createField({ initialValue: "fresh" });

    expect(() =>
      createForm({
        fields: {
          fresh,
          duplicate: alreadyOwned,
        },
      }),
    ).toThrow();

    // fresh node must remain standalone and usable
    expect(fresh.getValue()).toBe("fresh");

    // fresh node must be adoptable into a subsequent valid form
    const validForm = createForm({
      fields: { fresh },
    });
    expect(validForm.getValue()).toEqual({ fresh: "fresh" });
  });

  test("direct disposal of an adopted field or group is rejected and preserves tree consistency", () => {
    const leaf = createField({ initialValue: "leaf" });
    const group = createFieldGroup({ fields: { leaf } });
    const form = createForm({
      fields: {
        title: createField({ initialValue: "My Form" }),
        group,
      },
    });

    expect(() => {
      form.fields.title.dispose();
    }).toThrowError("Cannot dispose an adopted field directly; dispose its owning form or group");

    expect(() => {
      form.fields.group.dispose();
    }).toThrowError("Cannot dispose an adopted group directly; dispose its owning form or group");

    expect(() => {
      form.fields.group.fields.leaf.dispose();
    }).toThrowError("Cannot dispose an adopted field directly; dispose its owning form or group");

    // Form must remain fully valid and functional
    expect(form.getValue()).toEqual({
      title: "My Form",
      group: { leaf: "leaf" },
    });
    expect(form.dirty.get()).toBe(false);
    expect(form.touched.get()).toBe(false);

    form.fields.title.setValue("Updated Form");
    expect(form.dirty.get()).toBe(true);

    form.reset();
    expect(form.getValue()).toEqual({
      title: "My Form",
      group: { leaf: "leaf" },
    });
    expect(form.dirty.get()).toBe(false);

    form.reinitialize({
      value: {
        title: "Rebased Form",
        group: { leaf: "rebased" },
      },
      rawValue: {
        title: "Rebased Form",
        group: { leaf: "rebased" },
      },
    });
    expect(form.getValue()).toEqual({
      title: "Rebased Form",
      group: { leaf: "rebased" },
    });
  });

  test("handles dangerous-looking object keys safely without prototype pollution", () => {
    const protoField = createField({ initialValue: "safe-proto" });
    const constructorField = createField({ initialValue: "safe-constructor" });
    const prototypeField = createField({ initialValue: "safe-prototype" });
    const fieldsField = createField({ initialValue: "safe-fields" });

    const form = createForm({
      fields: {
        ["__proto__"]: protoField,
        constructor: constructorField,
        prototype: prototypeField,
        fields: fieldsField,
      },
    });

    const val = form.getValue();
    expect(Object.hasOwn(val, "__proto__")).toBe(true);
    expect(Object.hasOwn(val, "constructor")).toBe(true);
    expect(Object.hasOwn(val, "prototype")).toBe(true);
    expect(Object.hasOwn(val, "fields")).toBe(true);
    expect(val["__proto__"]).toBe("safe-proto");
    expect(val["constructor"]).toBe("safe-constructor");
    expect(val["prototype"]).toBe("safe-prototype");
    expect(val["fields"]).toBe("safe-fields");

    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "safeProto")).toBe(false);
    expect(Object.getPrototypeOf(val)).toBe(Object.prototype);

    form.reinitialize({
      value: {
        ["__proto__"]: "rebase-proto",
        constructor: "rebase-constructor",
        prototype: "rebase-prototype",
        fields: "rebase-fields",
      },
      rawValue: {
        ["__proto__"]: "rebase-proto",
        constructor: "rebase-constructor",
        prototype: "rebase-prototype",
        fields: "rebase-fields",
      },
    });

    expect(form.getValue()["__proto__"]).toBe("rebase-proto");
    expect(form.getValue()["constructor"]).toBe("rebase-constructor");
    expect(form.getValue()["prototype"]).toBe("rebase-prototype");
    expect(form.getValue()["fields"]).toBe("rebase-fields");
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "rebaseProto")).toBe(false);
  });
});
