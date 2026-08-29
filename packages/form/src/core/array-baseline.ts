import type { Scope } from "@vii-labs/core";
import type { FieldArrayItem } from "./array-types.js";
import type { FormNode } from "./tree-types.js";

/**
 * Manages canonical baseline state, baseline retention of removed items, and reset restoration.
 */
export class ArrayBaselineTracker<TItemNode extends FormNode = FormNode> {
  private _baselineItems: readonly FieldArrayItem<TItemNode>[];
  private _baselineIds: readonly string[];
  private _baselineIdSet: Set<string>;
  private _baselineLength: number;

  constructor(initialItems: readonly FieldArrayItem<TItemNode>[]) {
    this._baselineItems = Object.freeze([...initialItems]);
    this._baselineIds = Object.freeze(initialItems.map((it) => it.id));
    this._baselineIdSet = new Set(this._baselineIds);
    this._baselineLength = initialItems.length;
  }

  get baselineItems(): readonly FieldArrayItem<TItemNode>[] {
    return this._baselineItems;
  }

  get baselineIds(): readonly string[] {
    return this._baselineIds;
  }

  isBaseline(id: string): boolean {
    return this._baselineIdSet.has(id);
  }

  /**
   * Computes whether the active array items match the canonical baseline identity and purity.
   */
  isDirty(current: readonly FieldArrayItem<TItemNode>[]): boolean {
    if (current.length !== this._baselineLength) return true;
    for (let i = 0; i < current.length; i++) {
      if (current[i]!.id !== this._baselineIds[i]) return true;
    }
    for (let i = 0; i < current.length; i++) {
      if (current[i]!.node.dirty.get()) return true;
    }
    return false;
  }

  /**
   * Handles lifecycle disposal for a removed item.
   * If the item belongs to the baseline, it is retained privately for possible reset restoration
   * and its in-flight validation / state is reset. If non-baseline, it is disposed immediately.
   */
  handleItemRemoval(
    item: FieldArrayItem<TItemNode>,
    itemScope: Scope | undefined,
    scopesMap: Map<string, Scope>,
  ): void {
    if (this._baselineIdSet.has(item.id)) {
      // Baseline item: cancel in-flight async validations and reset state, keep scope alive
      item.node.reset();
    } else {
      // Non-baseline item: dispose immediately and remove mapping
      itemScope?.dispose();
      scopesMap.delete(item.id);
    }
  }

  /**
   * Restores the canonical baseline structure and resets all baseline nodes.
   * Disposes any active non-baseline items that are discarded by reset.
   */
  performReset(
    current: readonly FieldArrayItem<TItemNode>[],
    scopesMap: Map<string, Scope>,
  ): readonly FieldArrayItem<TItemNode>[] {
    // 1. Dispose any active non-baseline items
    for (let i = 0; i < current.length; i++) {
      const item = current[i]!;
      if (!this._baselineIdSet.has(item.id)) {
        const itemScope = scopesMap.get(item.id);
        itemScope?.dispose();
        scopesMap.delete(item.id);
      }
    }

    // 2. Restore all baseline items in exact canonical order and reset their node states
    const restoredItems: FieldArrayItem<TItemNode>[] = [];
    for (let i = 0; i < this._baselineItems.length; i++) {
      const baseItem = this._baselineItems[i]!;
      if (scopesMap.has(baseItem.id)) {
        restoredItems.push(baseItem);
        baseItem.node.reset();
      }
    }

    return Object.freeze(restoredItems);
  }

  /**
   * Establishes a new canonical baseline from the current active items.
   * Disposes any obsolete baseline-retained scopes from the previous baseline.
   */
  performReinitialize(
    current: readonly FieldArrayItem<TItemNode>[],
    scopesMap: Map<string, Scope>,
  ): void {
    const nextIds = current.map((it) => it.id);
    const nextIdSet = new Set(nextIds);

    // Dispose any retained scopes that are no longer part of the new baseline
    for (const [id, itemScope] of scopesMap.entries()) {
      if (!nextIdSet.has(id)) {
        itemScope.dispose();
        scopesMap.delete(id);
      }
    }

    this._baselineItems = Object.freeze([...current]);
    this._baselineIds = Object.freeze(nextIds);
    this._baselineIdSet = nextIdSet;
    this._baselineLength = current.length;
  }
}
