import { batch, computed, createScope } from "@vii-labs/core";
import {
  adoptChildNodes,
  attachInternalNode,
  getInternalNode,
  safeDefineProperty,
  safeHasProperty,
  type FormNodeInternal,
} from "./internal.js";
import type { CreateFormOptions, FormFieldsRecord, FormInstance, FormValues } from "./types.js";

/**
 * Creates a root reactive form coordinator managing an object-shaped field tree.
 *
 * Exposes typed child access, aggregate domain and raw presentation values,
 * recursive dirty/touched tracking, batched reset, whole-form baseline reinitialization,
 * and deterministic root Scope lifecycle ownership.
 */
export function createForm<TFields extends FormFieldsRecord>(
  options: CreateFormOptions<TFields>,
): FormInstance<TFields> {
  const { fields, scope } = options;
  const fieldKeys = Object.keys(fields);
  let disposed = false;

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("Form is disposed");
    }
  };

  const formScope = scope ? scope.createChild({ name: "form" }) : createScope({ name: "form" });

  adoptChildNodes(formScope, fields, fieldKeys);

  let detachFromParent: (() => void) | undefined;

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    detachFromParent?.();
    formScope.dispose();
  };

  if (scope) {
    detachFromParent = scope.use(() => {
      dispose();
    });
  }

  const valueComputed = formScope.run(() =>
    computed(() => {
      const result: Record<string, unknown> = {};
      for (let i = 0; i < fieldKeys.length; i++) {
        const key = fieldKeys[i]!;
        safeDefineProperty(result, key, fields[key]!.value.get());
      }
      return result as FormValues<TFields>;
    }),
  );

  const rawValueComputed = formScope.run(() =>
    computed(() => {
      const result: Record<string, unknown> = {};
      for (let i = 0; i < fieldKeys.length; i++) {
        const key = fieldKeys[i]!;
        safeDefineProperty(result, key, fields[key]!.rawValue.get());
      }
      return result as FormValues<TFields>;
    }),
  );

  const dirtyComputed = formScope.run(() =>
    computed(() => {
      let isDirty = false;
      for (let i = 0; i < fieldKeys.length; i++) {
        const childDirty = fields[fieldKeys[i]!]!.dirty.get();
        if (childDirty) {
          isDirty = true;
        }
      }
      return isDirty;
    }),
  );

  const touchedComputed = formScope.run(() =>
    computed(() => {
      let isTouched = false;
      for (let i = 0; i < fieldKeys.length; i++) {
        const childTouched = fields[fieldKeys[i]!]!.touched.get();
        if (childTouched) {
          isTouched = true;
        }
      }
      return isTouched;
    }),
  );

  const reset = (): void => {
    assertActive();
    batch(() => {
      for (let i = 0; i < fieldKeys.length; i++) {
        fields[fieldKeys[i]!]!.reset();
      }
    });
  };

  const reinitialize = (nextBaseline: FormValues<TFields>): void => {
    assertActive();
    if (nextBaseline === null || typeof nextBaseline !== "object") {
      throw new TypeError(
        `Invalid reinitialize baseline: expected an object, received ${
          nextBaseline === null ? "null" : typeof nextBaseline
        }`,
      );
    }
    for (let i = 0; i < fieldKeys.length; i++) {
      const key = fieldKeys[i]!;
      if (!safeHasProperty(nextBaseline, key)) {
        throw new TypeError(`Invalid reinitialize baseline: missing property "${key}"`);
      }
    }
    batch(() => {
      for (let i = 0; i < fieldKeys.length; i++) {
        const key = fieldKeys[i]!;
        const child = fields[key]!;
        const childInternal = getInternalNode(child);
        if (!childInternal) {
          throw new Error(`Child node "${key}" is missing internal node metadata`);
        }
        childInternal.reinitialize((nextBaseline as Record<string, unknown>)[key]);
      }
    });
  };

  const formInstance: FormInstance<TFields> = {
    kind: "form",
    fields,
    value: valueComputed,
    rawValue: rawValueComputed,
    touched: touchedComputed,
    dirty: dirtyComputed,
    getValue: () => {
      assertActive();
      return valueComputed.get();
    },
    getRawValue: () => {
      assertActive();
      return rawValueComputed.get();
    },
    reset,
    reinitialize,
    dispose,
  };

  const internal: FormNodeInternal<FormValues<TFields>> = {
    kind: "form",
    scope: formScope,
    isAdopted: false,
    assertActive,
    reinitialize,
    getDirectChildNodes: () => fieldKeys.map((k) => fields[k]!),
  };

  attachInternalNode(formInstance, internal);

  return formInstance;
}
