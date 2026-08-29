import type { FieldIssue, ValidationTriggerMode } from "../validation/types.js";
import type { FieldArrayItem } from "./array-types.js";
import type { FormFieldsRecord, FormNode } from "./tree-types.js";

/**
 * Asserts that an index is an integer within bounds.
 */
export function assertIntegerIndex(index: number, max: number, inclusive: boolean): void {
  if (typeof index !== "number" || !Number.isInteger(index)) {
    throw new TypeError(
      `Index must be an integer, received ${typeof index === "number" ? index : typeof index}`,
    );
  }
  const upper = inclusive ? max : max - 1;
  if (index < 0 || index > upper) {
    throw new RangeError(`Index ${index} is out of bounds for FieldArray of length ${max}`);
  }
}

/**
 * Asserts that all item IDs in an array are unique.
 */
export function assertUniqueKeys<TNode extends FormNode>(
  items: readonly FieldArrayItem<TNode>[],
): void {
  const seen = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    if (seen.has(item.id)) {
      throw new Error(`Duplicate key "${item.id}" detected in FieldArray`);
    }
    seen.add(item.id);
  }
}

/**
 * Recursively validates a form node (field, group, or array).
 */
export function validateNode(
  node: FormNode,
  trigger?: ValidationTriggerMode,
): Promise<readonly FieldIssue[]> | readonly FieldIssue[] {
  if ("validate" in node && typeof (node as { validate?: unknown }).validate === "function") {
    return (
      node as {
        validate: (
          t?: ValidationTriggerMode,
        ) => Promise<readonly FieldIssue[]> | readonly FieldIssue[];
      }
    ).validate(trigger);
  }
  if (node.kind === "group") {
    const group = node as unknown as {
      fields: FormFieldsRecord;
      issues: { get(): readonly FieldIssue[] };
    };
    const keys = Object.keys(group.fields);
    const promises: Promise<readonly FieldIssue[]>[] = [];
    for (let i = 0; i < keys.length; i++) {
      const childRes = validateNode(group.fields[keys[i]!]!, trigger);
      if (childRes && typeof (childRes as Promise<unknown>).then === "function") {
        promises.push(childRes as Promise<readonly FieldIssue[]>);
      }
    }
    if (promises.length > 0) {
      return Promise.all(promises).then(() => group.issues.get());
    }
    return group.issues.get();
  }
  return [];
}
