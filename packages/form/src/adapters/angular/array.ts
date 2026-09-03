import { signal } from "@angular/core";
import type {
  FieldArray,
  FieldArrayItem,
  FieldIssue,
  FormNode,
  ValidationTriggerMode,
} from "../../core/types.js";
import type { AngularAdapterOptions, AngularArrayHandle } from "./types.js";

/**
 * Creates an Angular Signals projection over a dynamic repeatable FieldArray collection.
 *
 * Exposes readonly Angular Signals for items and collection-level aggregate states.
 * Preserves exact FieldArrayItem.id stable identities and node references across operations.
 */
export function createAngularFieldArray<TItemNode extends FormNode = FormNode>(
  array: FieldArray<TItemNode>,
  options?: AngularAdapterOptions,
): AngularArrayHandle<TItemNode> {
  const itemsSig = signal(array.items.get());
  const valueSig = signal(array.value.get());
  const rawValueSig = signal(array.rawValue.get());
  const dirtySig = signal(array.dirty.get());
  const touchedSig = signal(array.touched.get());
  const pendingSig = signal(array.pending.get());
  const validSig = signal(array.valid.get());
  const invalidSig = signal(array.invalid.get());
  const issuesSig = signal(array.issues.get());
  const serverIssuesSig = signal(array.serverIssues.get());
  const lengthSig = signal(array.items.get().length);

  let isDisposed = false;
  let unregisterDestroy: (() => void) | undefined;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    for (const unsubscribe of unsubs) {
      unsubscribe();
    }
    if (unregisterDestroy) {
      const clean = unregisterDestroy;
      unregisterDestroy = undefined;
      clean();
    }
  };

  const unsubs = [
    array.items.subscribe((items) => {
      if (!isDisposed) {
        itemsSig.set(items);
        lengthSig.set(items.length);
      }
    }),
    array.value.subscribe((v) => {
      if (!isDisposed) valueSig.set(v);
    }),
    array.rawValue.subscribe((r) => {
      if (!isDisposed) rawValueSig.set(r);
    }),
    array.dirty.subscribe((d) => {
      if (!isDisposed) dirtySig.set(d);
    }),
    array.touched.subscribe((t) => {
      if (!isDisposed) touchedSig.set(t);
    }),
    array.pending.subscribe((p) => {
      if (!isDisposed) pendingSig.set(p);
    }),
    array.valid.subscribe((v) => {
      if (!isDisposed) validSig.set(v);
    }),
    array.invalid.subscribe((iv) => {
      if (!isDisposed) invalidSig.set(iv);
    }),
    array.issues.subscribe((iss) => {
      if (!isDisposed) issuesSig.set(iss);
    }),
    array.serverIssues.subscribe((si) => {
      if (!isDisposed) serverIssuesSig.set(si);
    }),
  ];

  if (options?.destroyRef) {
    if (options.destroyRef.destroyed) {
      dispose();
    } else {
      unregisterDestroy = options.destroyRef.onDestroy(dispose);
    }
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
    items: itemsSig.asReadonly(),
    value: valueSig.asReadonly(),
    rawValue: rawValueSig.asReadonly(),
    dirty: dirtySig.asReadonly(),
    touched: touchedSig.asReadonly(),
    pending: pendingSig.asReadonly(),
    valid: validSig.asReadonly(),
    invalid: invalidSig.asReadonly(),
    issues: issuesSig.asReadonly(),
    serverIssues: serverIssuesSig.asReadonly(),
    length: lengthSig.asReadonly(),
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
