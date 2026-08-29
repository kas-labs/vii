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
  CreateFieldGroupOptions,
  FieldGroup,
  FormFieldsRecord,
  FormRawValues,
  FormValues,
} from "./types.js";

/**
 * Creates a reactive nested field group aggregating child field and group nodes.
 *
 * Exposes typed child access, aggregate domain and raw presentation values,
 * recursive dirty/touched tracking, aggregate validation validity/pending/issues,
 * batched reset, and deterministic Scope lifecycle ownership.
 */
export function createFieldGroup<TFields extends FormFieldsRecord>(
  options: CreateFieldGroupOptions<TFields>,
): FieldGroup<TFields> {
  const { fields, scope } = options;
  const fieldKeys = Object.keys(fields);
  let disposed = false;
  let ownership: NodeOwnership = scope ? "external-scope" : "standalone";

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("Group is disposed");
    }
  };

  const groupScope = scope ? scope.createChild({ name: "group" }) : createScope({ name: "group" });

  adoptChildNodes(groupScope, fields, fieldKeys);

  let detachFromParent: (() => void) | undefined;

  const performDisposal = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    ownership = "disposed";
    internal.ownership = "disposed";
    detachFromParent?.();
    groupScope.dispose();
  };

  const dispose = (): void => {
    if (internal.ownership === "tree") {
      throw new Error("Cannot dispose an adopted group directly; dispose its owning form or group");
    }
    performDisposal();
  };

  if (scope) {
    detachFromParent = scope.use(() => {
      performDisposal();
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
      return result as FormRawValues<TFields>;
    }),
  );

  const dirtyComputed = groupScope.run(() =>
    computed(() => {
      for (let i = 0; i < fieldKeys.length; i++) {
        if (fields[fieldKeys[i]!]!.dirty.get()) {
          return true;
        }
      }
      return false;
    }),
  );

  const touchedComputed = groupScope.run(() =>
    computed(() => {
      for (let i = 0; i < fieldKeys.length; i++) {
        if (fields[fieldKeys[i]!]!.touched.get()) {
          return true;
        }
      }
      return false;
    }),
  );

  const pendingComputed = groupScope.run(() =>
    computed(() => {
      for (let i = 0; i < fieldKeys.length; i++) {
        if (fields[fieldKeys[i]!]!.pending.get()) {
          return true;
        }
      }
      return false;
    }),
  );

  const validComputed = groupScope.run(() =>
    computed(() => {
      for (let i = 0; i < fieldKeys.length; i++) {
        if (!fields[fieldKeys[i]!]!.valid.get()) {
          return false;
        }
      }
      return true;
    }),
  );

  const invalidComputed = groupScope.run(() => computed(() => !validComputed.get()));

  const issuesComputed = groupScope.run(() =>
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

  const groupState: FieldGroup<TFields> = {
    kind: "group",
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
    dispose,
  };

  const internal: FormNodeInternal<FormValues<TFields>> = {
    kind: "group",
    scope: groupScope,
    ownership,
    assertActive,
    reinitialize,
    getDirectChildNodes: () => fieldKeys.map((k) => fields[k]!),
    disposeFromOwner: () => {
      performDisposal();
    },
  };

  attachInternalNode(groupState, internal);

  return groupState;
}
