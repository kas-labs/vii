import { batch, computed, createScope, state, type Scope } from "@vii-labs/core";
import type { FieldIssue, ValidationTriggerMode } from "../validation/types.js";
import { assertIntegerIndex, assertUniqueKeys, validateNode } from "./array-operations.js";
import type { CreateFieldArrayOptions, FieldArray, FieldArrayItem } from "./array-types.js";
import {
  adoptChildNode,
  attachInternalNode,
  type FormNodeInternal,
  type NodeOwnership,
} from "./internal.js";
import type { FormNode, FormRawValueFor, FormValueFor } from "./tree-types.js";

let idCounter = 0;

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

  const createItemEntry = (node: TItemNode): FieldArrayItem<TItemNode> => {
    const itemScope = arrayScope.createChild({ name: "array-item" });
    try {
      adoptChildNode(itemScope, node, "array item");
      let id: string;
      if (keyExtractor) {
        const extracted = keyExtractor(node);
        id =
          typeof extracted === "string" && extracted.length > 0
            ? extracted
            : `vii_item_${++idCounter}`;
      } else {
        id = `vii_item_${++idCounter}`;
      }
      scopesMap.set(id, itemScope);
      return { id, node };
    } catch (err) {
      itemScope.dispose();
      throw err;
    }
  };

  const rawItems = options?.items ?? [];
  const initialItems: FieldArrayItem<TItemNode>[] = [];
  try {
    for (let i = 0; i < rawItems.length; i++) {
      initialItems.push(createItemEntry(rawItems[i]!));
    }
    assertUniqueKeys(initialItems);
  } catch (err) {
    for (let i = 0; i < initialItems.length; i++) {
      const item = initialItems[i]!;
      scopesMap.get(item.id)?.dispose();
      scopesMap.delete(item.id);
    }
    throw err;
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
    const item = createItemEntry(node);
    try {
      batch(() => {
        const next = [...itemsState.get()];
        next.splice(index, 0, item);
        assertUniqueKeys(next);
        itemsState.set(Object.freeze(next));
      });
      return item;
    } catch (err) {
      scopesMap.get(item.id)?.dispose();
      scopesMap.delete(item.id);
      throw err;
    }
  };

  const remove = (index: number): TItemNode => {
    assertActive();
    const current = itemsState.get();
    assertIntegerIndex(index, current.length, false);
    let removedNode!: TItemNode;
    batch(() => {
      const next = [...itemsState.get()];
      const removed = next.splice(index, 1)[0]!;
      removedNode = removed.node;
      scopesMap.get(removed.id)?.dispose();
      scopesMap.delete(removed.id);
      itemsState.set(Object.freeze(next));
    });
    return removedNode;
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
    if (itemsState.get().length === 0) return;
    batch(() => {
      const current = itemsState.get();
      for (let i = 0; i < current.length; i++) {
        const item = current[i]!;
        scopesMap.get(item.id)?.dispose();
        scopesMap.delete(item.id);
      }
      itemsState.set(Object.freeze([]));
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
    batch(() => {
      const current = itemsState.get();
      const baselineIdSet = new Set(baselineIds);
      for (let i = 0; i < current.length; i++) {
        const item = current[i]!;
        if (!baselineIdSet.has(item.id)) {
          scopesMap.get(item.id)?.dispose();
          scopesMap.delete(item.id);
        }
      }
      const restoredItems: FieldArrayItem<TItemNode>[] = [];
      for (let i = 0; i < baselineItems.length; i++) {
        const baseItem = baselineItems[i]!;
        if (scopesMap.has(baseItem.id)) {
          restoredItems.push(baseItem);
          baseItem.node.reset();
        }
      }
      itemsState.set(Object.freeze(restoredItems));
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
