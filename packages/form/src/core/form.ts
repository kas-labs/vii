import { batch, computed, createScope, state } from "@vii-labs/core";
import { SubmissionCoordinator } from "../submission/state-machine.js";
import type { FieldIssue, ValidationTriggerMode } from "../validation/types.js";
import type { FormReinitializeInput } from "./baseline-types.js";
import {
  adoptChildNodes,
  adoptChildNode,
  attachInternalNode,
  safeDefineProperty,
  type FormNodeInternal,
  type NodeOwnership,
} from "./internal.js";
import { commitReinitializePlan, prepareReinitializePlan } from "./reinitialize-tree.js";
import type {
  CreateFormOptions,
  FormFieldsRecord,
  FormInstance,
  FormRawValues,
  FormValues,
  OptionalKeys,
} from "./types.js";

/**
 * Creates a root reactive form coordinator managing an object-shaped field tree.
 *
 * Exposes typed child access, aggregate domain and raw presentation values,
 * recursive dirty/touched tracking, aggregate validation validity/pending/issues,
 * Model A submission state machine, server issue routing, batched reset,
 * whole-form baseline reinitialization, and deterministic root Scope lifecycle ownership.
 */
export function createForm<TFields extends FormFieldsRecord>(
  options: CreateFormOptions<TFields>,
): FormInstance<TFields> {
  const { scope } = options;
  const fields = { ...options.fields } as TFields;
  const fieldKeysState = state<readonly string[]>(Object.keys(fields));
  let disposed = false;
  let ownership: NodeOwnership = scope ? "external-scope" : "standalone";

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("Form is disposed");
    }
  };

  const formScope = scope ? scope.createChild({ name: "form" }) : createScope({ name: "form" });
  let treeMutationRevision = 0;

  const detachFns = new Map<string, () => void>();

  const initialDetachFns = adoptChildNodes(formScope, fields, fieldKeysState.get(), () => {
    ++treeMutationRevision;
  });

  const keys = fieldKeysState.get();
  for (let i = 0; i < keys.length; i++) {
    detachFns.set(keys[i]!, initialDetachFns[i]!);
  }

  const coordinator = new SubmissionCoordinator<FormValues<TFields>>(formScope, {
    isDisposed: () => disposed,
    assertActive,
    getValues: () => valueComputed.get(),
    validateTree: (trigger) => validate(trigger),
    getIssues: () => issuesComputed.get(),
    isInvalid: () => invalidComputed.get(),
    rootNode: () => formInstance,
    getDiagnostics: () => options.diagnostics,
    getTreeRevision: () => treeMutationRevision,
  });

  let detachFromParent: (() => void) | undefined;

  const performDisposal = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    ownership = "disposed";
    internal.ownership = "disposed";
    coordinator.dispose();
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
      for (let i = 0; i < fieldKeysState.get().length; i++) {
        const key = fieldKeysState.get()[i]!;
        safeDefineProperty(result, key, fields[key]!.value.get());
      }
      return result as FormValues<TFields>;
    }),
  );

  const rawValueComputed = formScope.run(() =>
    computed(() => {
      const result: Record<string, unknown> = {};
      for (let i = 0; i < fieldKeysState.get().length; i++) {
        const key = fieldKeysState.get()[i]!;
        safeDefineProperty(result, key, fields[key]!.rawValue.get());
      }
      return result as FormRawValues<TFields>;
    }),
  );

  const dirtyComputed = formScope.run(() =>
    computed(() => {
      for (let i = 0; i < fieldKeysState.get().length; i++) {
        if (fields[fieldKeysState.get()[i]!]!.dirty.get()) {
          return true;
        }
      }
      return false;
    }),
  );

  const touchedComputed = formScope.run(() =>
    computed(() => {
      for (let i = 0; i < fieldKeysState.get().length; i++) {
        if (fields[fieldKeysState.get()[i]!]!.touched.get()) {
          return true;
        }
      }
      return false;
    }),
  );

  const pendingComputed = formScope.run(() =>
    computed(() => {
      for (let i = 0; i < fieldKeysState.get().length; i++) {
        if (fields[fieldKeysState.get()[i]!]!.pending.get()) {
          return true;
        }
      }
      return false;
    }),
  );

  const validComputed = formScope.run(() =>
    computed(() => {
      if (coordinator.formServerIssuesState.get().length > 0) {
        return false;
      }
      for (let i = 0; i < fieldKeysState.get().length; i++) {
        if (!fields[fieldKeysState.get()[i]!]!.valid.get()) {
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
      for (let i = 0; i < fieldKeysState.get().length; i++) {
        const key = fieldKeysState.get()[i]!;
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
      const ownServer = coordinator.formServerIssuesState.get();
      for (let i = 0; i < ownServer.length; i++) {
        collected.push(ownServer[i]!);
      }
      return Object.freeze(collected);
    }),
  );

  const validate = (
    trigger: ValidationTriggerMode = "manual",
  ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
    assertActive();
    const promises: Promise<readonly FieldIssue[]>[] = [];
    for (let i = 0; i < fieldKeysState.get().length; i++) {
      const child = fields[fieldKeysState.get()[i]!]!;
      const res = child.validate(trigger);
      if (res && typeof (res as Promise<unknown>).then === "function") {
        promises.push(res as Promise<readonly FieldIssue[]>);
      }
    }
    if (promises.length > 0) {
      return Promise.all(promises).then(() => issuesComputed.get());
    }
    return issuesComputed.get();
  };

  const reset = (): void => {
    assertActive();
    batch(() => {
      coordinator.reset();
      for (let i = 0; i < fieldKeysState.get().length; i++) {
        fields[fieldKeysState.get()[i]!]!.reset();
      }
    });
  };

  const reinitialize = (nextBaseline: FormReinitializeInput<TFields>): void => {
    assertActive();
    const plan = prepareReinitializePlan(fields, fieldKeysState.get(), nextBaseline);
    batch(() => {
      coordinator.reset();
      commitReinitializePlan(plan);
    });
  };

  const register = <K extends OptionalKeys<TFields>>(
    key: K,
    node: NonNullable<TFields[K]>,
  ): void => {
    assertActive();
    const strKey = String(key);
    const keys = fieldKeysState.get();
    if (keys.includes(strKey)) {
      throw new Error(`Duplicate child key "${strKey}" in form`);
    }

    const { detach: childDetach } = adoptChildNode(formScope, node, strKey, () => {
      ++treeMutationRevision;
    });

    batch(() => {
      fields[key] = node as TFields[K];
      const nextKeys = [...keys, strKey];
      fieldKeysState.set(Object.freeze(nextKeys));
      detachFns.set(strKey, childDetach);
    });

    ++treeMutationRevision;
  };

  const unregister = <K extends OptionalKeys<TFields>>(key: K): void => {
    assertActive();
    const strKey = String(key);
    const keys = fieldKeysState.get();
    const index = keys.indexOf(strKey);
    if (index === -1) return;

    const detach = detachFns.get(strKey);

    batch(() => {
      if (detach) {
        detach();
        detachFns.delete(strKey);
      }

      delete fields[key];
      const nextKeys = [...keys];
      nextKeys.splice(index, 1);
      fieldKeysState.set(Object.freeze(nextKeys));
    });

    ++treeMutationRevision;
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
    serverIssues: coordinator.formServerIssuesState,
    submissionStatus: coordinator.submissionStatusState,
    submitting: coordinator.submitting,
    getValue: () => {
      assertActive();
      return valueComputed.get();
    },
    getRawValue: () => {
      assertActive();
      return rawValueComputed.get();
    },
    validate,
    submit: (action, options) => coordinator.submit(action, options),
    cancelSubmit: () => coordinator.cancelSubmit(),
    reset,
    reinitialize,
    register,
    unregister,
    dispose,
  };

  const internal: FormNodeInternal<FormReinitializeInput<TFields>> = {
    kind: "form",
    scope: formScope,
    ownership,
    assertActive,
    reinitialize,
    getDirectChildNodes: () => fieldKeysState.get().map((k) => fields[k]!),
    getOwnershipHandleCount: () => detachFns.size,
    disposeFromOwner: () => {
      performDisposal();
    },
    clearServerIssues: () => {
      coordinator.formServerIssuesState.set([]);
    },
    setServerIssues: (sIssues) => {
      coordinator.formServerIssuesState.set(Object.freeze(sIssues));
    },
    notifyMutation: () => {
      ++treeMutationRevision;
    },
  };

  attachInternalNode(formInstance, internal);

  return formInstance;
}
