import type { Scope } from "@vii-labs/core";
import type { FieldArrayItem } from "./array-types.js";
import { commitChildAdoption, validateAdoptableChild, type FormNodeInternal } from "./internal.js";
import type { FormNode } from "./tree-types.js";

let idCounter = 0;

/**
 * Prepared candidate array item validated during adoption preflight.
 */
export interface PreparedArrayItem<TNode extends FormNode = FormNode> {
  readonly id: string;
  readonly node: TNode;
  readonly internal: FormNodeInternal;
}

/**
 * Preflights candidate array items for adoption.
 * Validates node shape, internal metadata, adoption eligibility, and stable ID uniqueness.
 * Guarantees zero mutation to any candidate or existing node on validation failure.
 */
export function preflightArrayItems<TNode extends FormNode>(
  rawItems: readonly TNode[],
  existingKeys: ReadonlySet<string>,
  keyExtractor?: (node: TNode) => string,
): PreparedArrayItem<TNode>[] {
  const prepared: PreparedArrayItem<TNode>[] = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < rawItems.length; i++) {
    const node = rawItems[i]!;
    const internal = validateAdoptableChild(node, `array item at index ${i}`);

    let id: string;
    if (keyExtractor) {
      const extracted = keyExtractor(node);
      if (typeof extracted !== "string" || extracted.length === 0) {
        throw new TypeError(
          `keyExtractor must return a non-empty string, received ${
            typeof extracted === "string" ? '""' : typeof extracted
          }`,
        );
      }
      id = extracted;
    } else {
      id = `vii_item_${++idCounter}`;
    }

    if (existingKeys.has(id) || seenKeys.has(id)) {
      throw new Error(`Duplicate key "${id}" detected in FieldArray`);
    }

    seenKeys.add(id);
    prepared.push({ id, node, internal });
  }

  return prepared;
}

/**
 * Commits adoption of a single pre-validated array item into its dedicated child Scope.
 */
export function commitItemAdoption<TNode extends FormNode>(
  arrayScope: Scope,
  prepared: PreparedArrayItem<TNode>,
  onMutation?: () => void,
): { item: FieldArrayItem<TNode>; itemScope: Scope } {
  const itemScope = arrayScope.createChild({ name: "array-item" });
  commitChildAdoption(itemScope, prepared.internal, onMutation);
  return {
    item: { id: prepared.id, node: prepared.node },
    itemScope,
  };
}

/**
 * Commits adoption of multiple pre-validated array items into their dedicated child Scopes.
 */
export function commitArrayItemsAdoption<TNode extends FormNode>(
  arrayScope: Scope,
  preparedItems: readonly PreparedArrayItem<TNode>[],
  onMutation?: () => void,
): { items: FieldArrayItem<TNode>[]; scopes: [string, Scope][] } {
  const items: FieldArrayItem<TNode>[] = [];
  const scopes: [string, Scope][] = [];
  for (let i = 0; i < preparedItems.length; i++) {
    const { item, itemScope } = commitItemAdoption(arrayScope, preparedItems[i]!, onMutation);
    items.push(item);
    scopes.push([item.id, itemScope]);
  }
  return { items, scopes };
}
