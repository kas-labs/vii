import { batch, computed, createScope, type Scope } from "@vii-labs/core";
import {
  adoptChildNodes,
  attachInternalNode,
  getInternalNode,
  safeDefineProperty,
  safeHasProperty,
  type FormNodeInternal,
} from "./internal.js";
import type {
  CreateFieldGroupOptions,
  FieldGroup,
  FormFieldsRecord,
  FormNode,
  FormValues,
} from "./types.js";

/**
 * Creates a reactive nested field group aggregating child field and group nodes.
 *
 * Exposes typed child access, aggregate domain and raw presentation values,
 * recursive dirty/touched tracking, batched reset, and deterministic Scope lifecycle ownership.
 */
export function createFieldGroup<TFields extends FormFieldsRecord>(
  configOrFields: CreateFieldGroupOptions<TFields> | TFields,
  options?: { readonly scope?: Scope | undefined },
): FieldGroup<TFields> {
  let fields: TFields;
  let scope: Scope | undefined;

  if (
    configOrFields !== null &&
    typeof configOrFields === "object" &&
    "fields" in configOrFields &&
    typeof (configOrFields as CreateFieldGroupOptions<TFields>).fields === "object" &&
    (configOrFields as CreateFieldGroupOptions<TFields>).fields !== null &&
    (configOrFields as unknown as FormNode).kind === undefined
  ) {
    fields = (configOrFields as CreateFieldGroupOptions<TFields>).fields;
    scope = (configOrFields as CreateFieldGroupOptions<TFields>).scope ?? options?.scope;
  } else {
    fields = configOrFields as TFields;
    scope = options?.scope;
  }

  const fieldKeys = Object.keys(fields);
  let disposed = false;

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("Group is disposed");
    }
  };

  const groupScope = scope ? scope.createChild({ name: "group" }) : createScope({ name: "group" });

  adoptChildNodes(groupScope, fields, fieldKeys);

  let detachFromParent: (() => void) | undefined;

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    detachFromParent?.();
    groupScope.dispose();
  };

  if (scope) {
    detachFromParent = scope.use(() => {
      dispose();
    });
  }

  const valueComputed = groupScope.run(() =>
    computed(() => {
      const result: Record<string, unknown> = {};
      for (let i = 0; i < fieldKeys.length; i++) {
        const key = fieldKeys[i]!;
        safeDefineProperty(result, key, fields[key]!.value.get());
      }
      return result as FormValues<TFields>;
    }),
  );

  const rawValueComputed = groupScope.run(() =>
    computed(() => {
      const result: Record<string, unknown> = {};
      for (let i = 0; i < fieldKeys.length; i++) {
        const key = fieldKeys[i]!;
        safeDefineProperty(result, key, fields[key]!.rawValue.get());
      }
      return result as FormValues<TFields>;
    }),
  );

  const dirtyComputed = groupScope.run(() =>
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

  const touchedComputed = groupScope.run(() =>
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

  const groupState: FieldGroup<TFields> = {
    kind: "group",
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
    dispose,
  };

  const internal: FormNodeInternal<FormValues<TFields>> = {
    kind: "group",
    scope: groupScope,
    isAdopted: false,
    assertActive,
    reinitialize,
    getDirectChildNodes: () => fieldKeys.map((k) => fields[k]!),
  };

  attachInternalNode(groupState, internal);

  return groupState;
}
