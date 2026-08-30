import { useMemo, useSyncExternalStore } from "react";
import type {
  FieldArray,
  FieldArrayItem,
  FormNode,
  ValidationTriggerMode,
} from "../../core/types.js";
import { createMemoizedSnapshotReader, subscribeSignals } from "./external-store.js";
import type { ReactArrayBinding, ReactArraySnapshot } from "./types.js";

/**
 * Subscribes a React component to a dynamic repeatable collection node (FieldArray).
 * Uses React's useSyncExternalStore for concurrent rendering safety, collection state observation,
 * and stable item identity preservation across reorders.
 */
export function useFieldArray<TItemNode extends FormNode = FormNode>(
  arrayNode: FieldArray<TItemNode>,
): ReactArrayBinding<TItemNode> {
  const bridge = useMemo(() => {
    const readSnapshot = (): ReactArraySnapshot<TItemNode> => ({
      items: arrayNode.items.get(),
      value: arrayNode.value.get(),
      rawValue: arrayNode.rawValue.get(),
      dirty: arrayNode.dirty.get(),
      touched: arrayNode.touched.get(),
      pending: arrayNode.pending.get(),
      valid: arrayNode.valid.get(),
      invalid: arrayNode.invalid.get(),
      issues: arrayNode.issues.get(),
      serverIssues: arrayNode.serverIssues.get(),
      length: arrayNode.items.get().length,
    });

    const getSnapshot = createMemoizedSnapshotReader(readSnapshot);

    const subscribe = (onStoreChange: () => void): (() => void) =>
      subscribeSignals(
        [
          arrayNode.items,
          arrayNode.value,
          arrayNode.rawValue,
          arrayNode.dirty,
          arrayNode.touched,
          arrayNode.pending,
          arrayNode.valid,
          arrayNode.invalid,
          arrayNode.issues,
          arrayNode.serverIssues,
        ],
        onStoreChange,
      );

    return {
      subscribe,
      getSnapshot,
      getServerSnapshot: getSnapshot,
      append: (node: TItemNode): FieldArrayItem<TItemNode> => arrayNode.append(node),
      prepend: (node: TItemNode): FieldArrayItem<TItemNode> => arrayNode.prepend(node),
      insert: (index: number, node: TItemNode): FieldArrayItem<TItemNode> =>
        arrayNode.insert(index, node),
      remove: (index: number): void => {
        arrayNode.remove(index);
      },
      move: (fromIndex: number, toIndex: number): void => {
        arrayNode.move(fromIndex, toIndex);
      },
      swap: (indexA: number, indexB: number): void => {
        arrayNode.swap(indexA, indexB);
      },
      clear: (): void => {
        arrayNode.clear();
      },
      validate: (trigger?: ValidationTriggerMode) => arrayNode.validate(trigger),
      reset: (): void => {
        arrayNode.reset();
      },
    };
  }, [arrayNode]);

  const snapshot = useSyncExternalStore(
    bridge.subscribe,
    bridge.getSnapshot,
    bridge.getServerSnapshot,
  );

  return useMemo(
    () => ({
      ...snapshot,
      append: bridge.append,
      prepend: bridge.prepend,
      insert: bridge.insert,
      remove: bridge.remove,
      move: bridge.move,
      swap: bridge.swap,
      clear: bridge.clear,
      validate: bridge.validate,
      reset: bridge.reset,
    }),
    [snapshot, bridge],
  );
}
