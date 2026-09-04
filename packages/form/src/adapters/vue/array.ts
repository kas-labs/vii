import { getCurrentScope, onScopeDispose, shallowReadonly, shallowRef } from "vue";
import type {
  FieldArray,
  FieldArrayItem,
  FieldIssue,
  FormNode,
  ValidationTriggerMode,
} from "../../core/types.js";
import type { VueAdapterOptions, VueArrayHandle } from "./types.js";

/**
 * Creates a Vue shallowRef projection over a dynamic repeatable FieldArray collection.
 *
 * Exposes readonly shallow refs for items and collection-level aggregate states.
 * Preserves exact FieldArrayItem.id stable identities and node references across operations.
 */
export function createVueFieldArray<TItemNode extends FormNode = FormNode>(
  array: FieldArray<TItemNode>,
  options?: VueAdapterOptions,
): VueArrayHandle<TItemNode> {
  const itemsRef = shallowRef(array.items.get());
  const valueRef = shallowRef(array.value.get());
  const rawValueRef = shallowRef(array.rawValue.get());
  const dirtyRef = shallowRef(array.dirty.get());
  const touchedRef = shallowRef(array.touched.get());
  const pendingRef = shallowRef(array.pending.get());
  const validRef = shallowRef(array.valid.get());
  const invalidRef = shallowRef(array.invalid.get());
  const issuesRef = shallowRef(array.issues.get());
  const serverIssuesRef = shallowRef(array.serverIssues.get());
  const lengthRef = shallowRef(array.items.get().length);

  let isDisposed = false;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    for (const unsubscribe of unsubs) {
      unsubscribe();
    }
  };

  const unsubs = [
    array.items.subscribe((items) => {
      if (!isDisposed) {
        itemsRef.value = items;
        lengthRef.value = items.length;
      }
    }),
    array.value.subscribe((v) => {
      if (!isDisposed) valueRef.value = v;
    }),
    array.rawValue.subscribe((r) => {
      if (!isDisposed) rawValueRef.value = r;
    }),
    array.dirty.subscribe((d) => {
      if (!isDisposed) dirtyRef.value = d;
    }),
    array.touched.subscribe((t) => {
      if (!isDisposed) touchedRef.value = t;
    }),
    array.pending.subscribe((p) => {
      if (!isDisposed) pendingRef.value = p;
    }),
    array.valid.subscribe((v) => {
      if (!isDisposed) validRef.value = v;
    }),
    array.invalid.subscribe((iv) => {
      if (!isDisposed) invalidRef.value = iv;
    }),
    array.issues.subscribe((iss) => {
      if (!isDisposed) issuesRef.value = iss;
    }),
    array.serverIssues.subscribe((si) => {
      if (!isDisposed) serverIssuesRef.value = si;
    }),
  ];

  if (options?.onDispose) {
    options.onDispose(dispose);
  } else if (getCurrentScope() !== undefined) {
    onScopeDispose(dispose);
  }

  const append = (node: TItemNode): FieldArrayItem<TItemNode> => {
    return array.append(node);
  };

  const prepend = (node: TItemNode): FieldArrayItem<TItemNode> => {
    return array.prepend(node);
  };

  const insert = (index: number, node: TItemNode): FieldArrayItem<TItemNode> => {
    return array.insert(index, node);
  };

  const remove = (index: number): void => {
    array.remove(index);
  };

  const move = (fromIndex: number, toIndex: number): void => {
    array.move(fromIndex, toIndex);
  };

  const swap = (indexA: number, indexB: number): void => {
    array.swap(indexA, indexB);
  };

  const clear = (): void => {
    array.clear();
  };

  const validate = (
    trigger?: ValidationTriggerMode,
  ): Promise<readonly FieldIssue[]> | readonly FieldIssue[] => {
    return array.validate(trigger);
  };

  const reset = (): void => {
    array.reset();
  };

  return {
    items: shallowReadonly(itemsRef),
    value: shallowReadonly(valueRef),
    rawValue: shallowReadonly(rawValueRef),
    dirty: shallowReadonly(dirtyRef),
    touched: shallowReadonly(touchedRef),
    pending: shallowReadonly(pendingRef),
    valid: shallowReadonly(validRef),
    invalid: shallowReadonly(invalidRef),
    issues: shallowReadonly(issuesRef),
    serverIssues: shallowReadonly(serverIssuesRef),
    length: shallowReadonly(lengthRef),
    array,
    append,
    prepend,
    insert,
    remove,
    move,
    swap,
    clear,
    validate,
    reset,
    dispose,
  };
}
