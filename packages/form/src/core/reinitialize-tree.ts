import type { FormFieldsRecord } from "./tree-types.js";
import { getInternalNode, safeHasProperty } from "./internal.js";
import type { FormReinitializeInput } from "./baseline-types.js";

function assertObjectTree(
  label: "value" | "rawValue",
  tree: unknown,
): asserts tree is Record<string, unknown> {
  if (tree === null || typeof tree !== "object") {
    throw new TypeError(
      `Invalid reinitialize baseline: expected ${label} tree object, received ${
        tree === null ? "null" : typeof tree
      }`,
    );
  }
}

/**
 * Validates reinitialize input shape and dispatches explicit value/raw slices to child internals.
 */
export function reinitializeChildNodes<TFields extends FormFieldsRecord>(
  fields: TFields,
  fieldKeys: readonly string[],
  nextBaseline: FormReinitializeInput<TFields>,
): void {
  if (nextBaseline === null || typeof nextBaseline !== "object") {
    throw new TypeError(
      `Invalid reinitialize baseline: expected { value, rawValue }, received ${
        nextBaseline === null ? "null" : typeof nextBaseline
      }`,
    );
  }

  if (!safeHasProperty(nextBaseline, "value") || !safeHasProperty(nextBaseline, "rawValue")) {
    throw new TypeError(
      "Invalid reinitialize baseline: expected separate value and rawValue trees",
    );
  }

  const valueTree = nextBaseline.value;
  const rawTree = nextBaseline.rawValue;
  assertObjectTree("value", valueTree);
  assertObjectTree("rawValue", rawTree);

  for (let i = 0; i < fieldKeys.length; i++) {
    const key = fieldKeys[i]!;
    if (!safeHasProperty(valueTree, key)) {
      throw new TypeError(`Invalid reinitialize baseline: missing property "${key}" in value tree`);
    }
    if (!safeHasProperty(rawTree, key)) {
      throw new TypeError(
        `Invalid reinitialize baseline: missing property "${key}" in rawValue tree`,
      );
    }
  }

  for (let i = 0; i < fieldKeys.length; i++) {
    const key = fieldKeys[i]!;
    const child = fields[key]!;
    const childInternal = getInternalNode(child);
    if (!childInternal) {
      throw new Error(`Child node "${key}" is missing internal node metadata`);
    }
    childInternal.reinitialize({
      value: valueTree[key],
      rawValue: rawTree[key],
    });
  }
}
