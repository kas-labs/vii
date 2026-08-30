import type { Computed, ReadableState, Scope } from "@vii-labs/core";
import type { FormNode, FormRawValueFor, FormValueFor } from "./tree-types.js";
import type { FieldIssue, ValidationTriggerMode } from "../validation/types.js";

/**
 * Public item wrapper containing a unique stable identifier and child form node.
 */
export interface FieldArrayItem<TItemNode extends FormNode = FormNode> {
  /**
   * Unique stable identifier for this logical array item.
   * Survives insertions, removals of siblings, and reordering.
   */
  readonly id: string;

  /**
   * Child form node (leaf field, nested group, or nested array).
   */
  readonly node: TItemNode;
}

/**
 * Configuration options for creating a dynamic repeatable field array.
 */
export interface CreateFieldArrayOptions<TItemNode extends FormNode = FormNode> {
  /**
   * Initial array of child form nodes.
   */
  readonly items?: readonly TItemNode[] | undefined;

  /**
   * Optional parent Scope that deterministically owns the array lifecycle.
   */
  readonly scope?: Scope | undefined;

  /**
   * Optional custom key extractor to derive a stable identifier from an item node.
   * If provided, it must return a non-empty string.
   * If omitted, an opaque unique token is generated automatically.
   */
  readonly keyExtractor?: ((node: TItemNode) => string) | undefined;
}

/**
 * Reactive state and interaction contract for a dynamic repeatable collection node.
 */
export interface FieldArray<TItemNode extends FormNode = FormNode> {
  /**
   * Node kind discriminator.
   */
  readonly kind: "array";

  /**
   * Reactive signal returning the current list of items with stable identifiers.
   */
  readonly items: ReadableState<readonly FieldArrayItem<TItemNode>[]>;

  /**
   * Lazy computed signal returning aggregate domain values array.
   */
  readonly value: ReadableState<readonly FormValueFor<TItemNode>[]>;

  /**
   * Lazy computed signal returning aggregate raw presentation values array.
   */
  readonly rawValue: ReadableState<readonly FormRawValueFor<TItemNode>[]>;

  /**
   * Lazy computed signal indicating whether any descendant field in any item has been touched.
   */
  readonly touched: ReadableState<boolean>;

  /**
   * Lazy computed signal indicating whether collection length, key sequence, or any child node differs from baseline.
   */
  readonly dirty: Computed<boolean>;

  /**
   * Lazy computed signal indicating whether any descendant field in any item is currently validating asynchronously.
   */
  readonly pending: Computed<boolean>;

  /**
   * Lazy computed signal indicating whether all descendant fields across all items are valid.
   */
  readonly valid: Computed<boolean>;

  /**
   * Lazy computed signal indicating whether any descendant field in any item is invalid.
   */
  readonly invalid: Computed<boolean>;

  /**
   * Lazy computed signal returning aggregate issues from all descendant items with numeric index prefix paths.
   */
  readonly issues: Computed<readonly FieldIssue[]>;

  /**
   * Returns current aggregate domain values array synchronously.
   */
  getValue(): readonly FormValueFor<TItemNode>[];

  /**
   * Returns current aggregate raw presentation values array synchronously.
   */
  getRawValue(): readonly FormRawValueFor<TItemNode>[];

  /**
   * Appends a new item node to the end of the array.
   */
  append(node: TItemNode): FieldArrayItem<TItemNode>;

  /**
   * Prepends a new item node to the beginning of the array.
   */
  prepend(node: TItemNode): FieldArrayItem<TItemNode>;

  /**
   * Inserts a new item node at the specified index.
   */
  insert(index: number, node: TItemNode): FieldArrayItem<TItemNode>;

  /**
   * Removes the item at the specified index from the active array.
   *
   * Lifecycle semantics:
   * - Baseline items (established at creation or reinitialization) are removed from active presentation
   *   and aggregate computations, but are retained privately for potential restoration by `reset()`.
   * - Non-baseline items (appended or inserted after baseline) are disposed immediately.
   * - Restoring the baseline via `reset()` restores baseline items with their original stable IDs and node instances.
   * - Replacing the baseline via `reinitialize()` disposes any obsolete retained baseline items.
   * - Disposing the array disposes all active and retained items.
   */
  remove(index: number): void;

  /**
   * Moves an item node from fromIndex to toIndex preserving stable identity and child states.
   */
  move(fromIndex: number, toIndex: number): void;

  /**
   * Swaps item nodes at indexA and indexB preserving stable identity and child states.
   */
  swap(indexA: number, indexB: number): void;

  /**
   * Removes all items from the active array presentation.
   *
   * Lifecycle semantics:
   * - Baseline items are retained privately for potential restoration by `reset()`.
   * - Non-baseline items are disposed immediately.
   * - Calling `reset()` restores all baseline items in canonical order and restores pristine dirty state.
   */
  clear(): void;

  /**
   * Explicitly triggers validation on all child items.
   */
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];

  /**
   * Atomically resets the array structure and all child items to their baseline state.
   */
  reset(): void;

  /**
   * Disposes the array and all owned descendant item resources idempotently.
   */
  dispose(): void;
}
