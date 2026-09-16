import { computed } from "@angular/core";
import type { FieldArray, FormNode } from "../../core/types.js";
import { bridgeSignal, createTeardown } from "./destroy.js";
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
  const { isDisposed, unsubs, dispose } = createTeardown(options);

  const items = bridgeSignal(array.items, unsubs, isDisposed);

  return {
    items,
    value: bridgeSignal(array.value, unsubs, isDisposed),
    rawValue: bridgeSignal(array.rawValue, unsubs, isDisposed),
    dirty: bridgeSignal(array.dirty, unsubs, isDisposed),
    touched: bridgeSignal(array.touched, unsubs, isDisposed),
    pending: bridgeSignal(array.pending, unsubs, isDisposed),
    valid: bridgeSignal(array.valid, unsubs, isDisposed),
    invalid: bridgeSignal(array.invalid, unsubs, isDisposed),
    issues: bridgeSignal(array.issues, unsubs, isDisposed),
    serverIssues: bridgeSignal(array.serverIssues, unsubs, isDisposed),
    length: computed(() => items().length),
    array,
    append: (node) => array.append(node),
    prepend: (node) => array.prepend(node),
    insert: (index, node) => array.insert(index, node),
    remove: (index) => array.remove(index),
    move: (from, to) => array.move(from, to),
    swap: (iA, iB) => array.swap(iA, iB),
    clear: () => array.clear(),
    validate: (trigger) => array.validate(trigger),
    reset: () => array.reset(),
    dispose,
  };
}
