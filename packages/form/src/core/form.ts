import { batch, computed, createScope } from "@vii-labs/core";
import type { FieldIssue } from "../validation/types.js";
import {
  adoptChildNodes,
  attachInternalNode,
  getInternalNode,
  safeDefineProperty,
  safeHasProperty,
  type FormNodeInternal,
  type NodeOwnership,
} from "./internal.js";
import type {
  CreateFormOptions,
  FormFieldsRecord,
  FormInstance,
  FormRawValues,
  FormValues,
} from "./types.js";

/**
 * Creates a root reactive form coordinator managing an object-shaped field tree.
 *
 * Exposes typed child access, aggregate domain and raw presentation values,
 * recursive dirty/touched tracking, aggregate validation validity/pending/issues,
 * batched reset, whole-form baseline reinitialization, and deterministic root Scope lifecycle ownership.
 */
export function createForm<TFields extends FormFieldsRecord>(
  options: CreateFormOptions<TFields>,
): FormInstance<TFields> {
  const { fields, scope } = options;
  const fieldKeys = Object.keys(fields);
  let disposed = false;
  let ownership: NodeOwnership = scope ? "external-scope" : "standalone";

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("Form is disposed");
    }
  };

  const formScope = scope ? scope.createChild({ name: "form" }) : createScope({ name: "form" });

  adoptChildNodes(formScope, fields, fieldKeys);

  let detachFromParent: (() => void) | undefined;

  const performDisposal = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    ownership = "disposed";
    internal.ownership = "disposed";
    detachFromParent?.();
    formScope.dispose();
  };

  const dispose = (): void => {
    performDisposal();
  };

  if (scope) {
    detachFromParent = scope.use(() => {
      performDisposal();
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
      return result as FormRawValues<TFields>;
    }),
  );

  const dirtyComputed = formScope.run(() =>
    computed(() => {
      for (let i = 0; i < fieldKeys.length; i++) {
        if (fields[fieldKeys[i]!]!.dirty.get()) {
          return true;
        }
      }
      return false;
    }),
  );

  const touchedComputed = formScope.run(() =>
    computed(() => {
      for (let i = 0; i < fieldKeys.length; i++) {
        if (fields[fieldKeys[i]!]!.touched.get()) {
          return true;
        }
      }
      return false;
    }),
  );

  const pendingComputed = formScope.run(() =>
    computed(() => {
      for (let i = 0; i < fieldKeys.length; i++) {
        if (fields[fieldKeys[i]!]!.pending.get()) {
          return true;
        }
      }
      return false;
    }),
  );

  const validComputed = formScope.run(() =>
    computed(() => {
      for (let i = 0; i < fieldKeys.length; i++) {
        if (!fields[fieldKeys[i]!]!.valid.get()) {
          return false;
        }
      }
      return true;
    }),
  );

  const invalidComputed = formScope.run(() => computed(() => !validComputed.get()));

  const issuesComputed = formScope.run(() =>
    computed(() => {
      const collected: FieldIssue[] = [];
      for (let i = 0; i < fieldKeys.length; i++) {
        const key = fieldKeys[i]!;
        const childIssues = fields[key]!.issues.get();
        for (let j = 0; j < childIssues.length; j++) {
          const iss = childIssues[j]!;
          const prefix = [key, ...(iss.path ?? [])];
          collected.push({
            ...iss,
            path: Object.freeze(prefix),
          });
        }
      }
      return Object.freeze(collected);
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
    pending: pendingComputed,
    valid: validComputed,
    invalid: invalidComputed,
    issues: issuesComputed,
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
    ownership,
    assertActive,
    reinitialize,
    getDirectChildNodes: () => fieldKeys.map((k) => fields[k]!),
    disposeFromOwner: () => {
      performDisposal();
    },
  };

  attachInternalNode(formInstance, internal);

  return formInstance;
}
