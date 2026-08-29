import { batch, computed, createScope, state, type Scope } from "@vii-labs/core";
import type { FieldIssue, ValidationTriggerMode } from "../validation/types.js";
import {
  commitArrayItemsAdoption,
  commitItemAdoption,
  preflightArrayItems,
} from "./array-adoption.js";
import { assertIntegerIndex, validateNode } from "./array-operations.js";
import type { CreateFieldArrayOptions, FieldArray, FieldArrayItem } from "./array-types.js";
import { attachInternalNode, type FormNodeInternal, type NodeOwnership } from "./internal.js";
import type { FormNode, FormRawValueFor, FormValueFor } from "./tree-types.js";

/**
 * Creates a reactive repeatable collection node with stable item identity.
 */
export function createFieldArray<TItemNode extends FormNode = FormNode>(
  options?: CreateFieldArrayOptions<TItemNode>,
): FieldArray<TItemNode> {
  const scope = options?.scope;
  const keyExtractor = options?.keyExtractor;
  let disposed = false;
  let ownership: NodeOwnership = scope ? "external-scope" : "standalone";

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("Array is disposed");
    }
  };

  const arrayScope = scope ? scope.createChild({ name: "array" }) : createScope({ name: "array" });
  const scopesMap = new Map<string, Scope>();

  // Phase 1: Preflight entire initial items list without mutating any candidate node
  const rawItems = options?.items ?? [];
  const preparedInitial = preflightArrayItems(rawItems, new Set(), keyExtractor);

  // Phase 2: Commit adoption for all pre-validated items
  const { items: initialItems, scopes: initialScopes } = commitArrayItemsAdoption(
    arrayScope,
    preparedInitial,
  );
  for (let i = 0; i < initialScopes.length; i++) {
    const [id, itemScope] = initialScopes[i]!;
    scopesMap.set(id, itemScope);
  }

  let baselineItems: readonly FieldArrayItem<TItemNode>[] = Object.freeze([...initialItems]);
  let baselineIds: readonly string[] = Object.freeze(initialItems.map((it) => it.id));
  let baselineLength = initialItems.length;

  const itemsState = state<readonly FieldArrayItem<TItemNode>[]>(Object.freeze(initialItems));
  let detachFromParent: (() => void) | undefined;

  const performDisposal = (): void => {
    if (disposed) return;
    disposed = true;
    ownership = "disposed";
    internal.ownership = "disposed";
    detachFromParent?.();
    for (const itemScope of scopesMap.values()) {
      itemScope.dispose();
    }
    scopesMap.clear();
    arrayScope.dispose();
  };

  const dispose = (): void => {
    if (internal.ownership === "tree") {
      throw new Error("Cannot dispose an adopted array directly; dispose its owning form or group");
    }
    performDisposal();
  };

  if (scope) {
    detachFromParent = scope.use(() => {
      performDisposal();
    });
  }

  const valueComputed = arrayScope.run(() =>
    computed(() => {
      const items = itemsState.get();
      const result: FormValueFor<TItemNode>[] = new Array(items.length);
      for (let i = 0; i < items.length; i++) {
        result[i] = items[i]!.node.value.get() as FormValueFor<TItemNode>;
      }
      return result;
    }),
  );

  const rawValueComputed = arrayScope.run(() =>
    computed(() => {
      const items = itemsState.get();
      const result: FormRawValueFor<TItemNode>[] = new Array(items.length);
      for (let i = 0; i < items.length; i++) {
        result[i] = items[i]!.node.rawValue.get() as FormRawValueFor<TItemNode>;
      }
      return result;
    }),
  );

  const dirtyComputed = arrayScope.run(() =>
    computed(() => {
      const current = itemsState.get();
      if (current.length !== baselineLength) return true;
      for (let i = 0; i < current.length; i++) {
        if (current[i]!.id !== baselineIds[i]) return true;
      }
      for (let i = 0; i < current.length; i++) {
        if (current[i]!.node.dirty.get()) return true;
      }
      return false;
    }),
  );

  const touchedComputed = arrayScope.run(() =>
    computed(() => {
      const current = itemsState.get();
      for (let i = 0; i < current.length; i++) {
        if (current[i]!.node.touched.get()) return true;
      }
      return false;
    }),
  );

  const pendingComputed = arrayScope.run(() =>
    computed(() => {
      const current = itemsState.get();
      for (let i = 0; i < current.length; i++) {
        if (current[i]!.node.pending.get()) return true;
      }
      return false;
    }),
  );

  const validComputed = arrayScope.run(() =>
    computed(() => {
      const current = itemsState.get();
      for (let i = 0; i < current.length; i++) {
        if (!current[i]!.node.valid.get()) return false;
      }
      return true;
    }),
  );

  const invalidComputed = arrayScope.run(() => computed(() => !validComputed.get()));

  const issuesComputed = arrayScope.run(() =>
    computed(() => {
      const collected: FieldIssue[] = [];
      const current = itemsState.get();
      for (let i = 0; i < current.length; i++) {
        const childIssues = current[i]!.node.issues.get();
        for (let j = 0; j < childIssues.length; j++) {
          const iss = childIssues[j]!;
          const prefix = [i, ...(iss.path ?? [])];
          collected.push({ ...iss, path: Object.freeze(prefix) });
        }
      }
      return Object.freeze(collected);
    }),
  );

  const insert = (index: number, node: TItemNode): FieldArrayItem<TItemNode> => {
    assertActive();
    const current = itemsState.get();
    assertIntegerIndex(index, current.length, true);

    // Phase 1: Preflight single candidate against active keys without mutation
    const existingKeys = new Set(scopesMap.keys());
    const [prepared] = preflightArrayItems([node], existingKeys, keyExtractor);

    // Phase 2: Commit adoption
    const { item, itemScope } = commitItemAdoption(arrayScope, prepared!);
    scopesMap.set(item.id, itemScope);

    batch(() => {
      const next = [...itemsState.get()];
      next.splice(index, 0, item);
      itemsState.set(Object.freeze(next));
    });

    return item;
  };

  const remove = (index: number): TItemNode => {
    assertActive();
    const current = itemsState.get();
    assertIntegerIndex(index, current.length, false);
    const item = current[index]!;
    const itemScope = scopesMap.get(item.id);
    scopesMap.delete(item.id);

    batch(() => {
      const next = [...itemsState.get()];
      next.splice(index, 1);
      itemsState.set(Object.freeze(next));
      itemScope?.dispose();
    });

    return item.node;
  };

  const move = (fromIndex: number, toIndex: number): void => {
    assertActive();
    const current = itemsState.get();
    assertIntegerIndex(fromIndex, current.length, false);
    assertIntegerIndex(toIndex, current.length, false);
    if (fromIndex === toIndex) return;
    batch(() => {
      const next = [...itemsState.get()];
      const item = next.splice(fromIndex, 1)[0]!;
      next.splice(toIndex, 0, item);
      itemsState.set(Object.freeze(next));
    });
  };

  const swap = (indexA: number, indexB: number): void => {
    assertActive();
    const current = itemsState.get();
    assertIntegerIndex(indexA, current.length, false);
    assertIntegerIndex(indexB, current.length, false);
    if (indexA === indexB) return;
    batch(() => {
      const next = [...itemsState.get()];
      const itemA = next[indexA]!;
      next[indexA] = next[indexB]!;
      next[indexB] = itemA;
      itemsState.set(Object.freeze(next));
    });
  };

  const clear = (): void => {
    assertActive();
    const current = itemsState.get();
    if (current.length === 0) return;
    const scopesToDispose: Scope[] = [];
    for (let i = 0; i < current.length; i++) {
      const id = current[i]!.id;
      const s = scopesMap.get(id);
      if (s) {
        scopesToDispose.push(s);
        scopesMap.delete(id);
      }
    }
    batch(() => {
      itemsState.set(Object.freeze([]));
      for (let i = 0; i < scopesToDispose.length; i++) {
        scopesToDispose[i]!.dispose();
      }
    });
  };

  const validate = (
    trigger: ValidationTriggerMode = "manual",
  ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
    assertActive();
    const current = itemsState.get();
    const promises: Promise<readonly FieldIssue[]>[] = [];
    for (let i = 0; i < current.length; i++) {
      const res = validateNode(current[i]!.node, trigger);
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
    const current = itemsState.get();
    const baselineIdSet = new Set(baselineIds);
    const scopesToDispose: Scope[] = [];
    for (let i = 0; i < current.length; i++) {
      const item = current[i]!;
      if (!baselineIdSet.has(item.id)) {
        const itemScope = scopesMap.get(item.id);
        if (itemScope) {
          scopesToDispose.push(itemScope);
          scopesMap.delete(item.id);
        }
      }
    }
    const restoredItems: FieldArrayItem<TItemNode>[] = [];
    for (let i = 0; i < baselineItems.length; i++) {
      const baseItem = baselineItems[i]!;
      if (scopesMap.has(baseItem.id)) {
        restoredItems.push(baseItem);
      }
    }
    batch(() => {
      itemsState.set(Object.freeze(restoredItems));
      for (let i = 0; i < restoredItems.length; i++) {
        restoredItems[i]!.node.reset();
      }
      for (let i = 0; i < scopesToDispose.length; i++) {
        scopesToDispose[i]!.dispose();
      }
    });
  };

  const reinitialize = (): void => {
    assertActive();
    const current = itemsState.get();
    baselineItems = Object.freeze([...current]);
    baselineIds = Object.freeze(current.map((it) => it.id));
    baselineLength = current.length;
  };

  const arrayState: FieldArray<TItemNode> = {
    kind: "array",
    items: itemsState,
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
    append: (node) => insert(itemsState.get().length, node),
    prepend: (node) => insert(0, node),
    insert,
    remove,
    move,
    swap,
    clear,
    validate,
    reset,
    dispose,
  };

  const internal: FormNodeInternal<unknown> = {
    kind: "array",
    scope: arrayScope,
    ownership,
    assertActive,
    reinitialize,
    getDirectChildNodes: () => itemsState.get().map((it) => it.node),
    disposeFromOwner: () => {
      performDisposal();
    },
  };

  attachInternalNode(arrayState, internal);
  return arrayState;
}
