import type { InternalFieldBaseline } from "./baseline-types.js";
import type { FormReinitializeInput } from "./baseline-types.js";
import { getInternalNode, safeHasProperty, type FormNodeInternal } from "./internal.js";
import type { FieldArray, FieldGroup, FormFieldsRecord, FormNode } from "./types.js";

function assertObjectTree(
  label: "value" | "rawValue",
  tree: unknown,
  path: string,
): asserts tree is Record<string, unknown> {
  if (tree === null || typeof tree !== "object") {
    throw new TypeError(
      `Invalid reinitialize baseline at "${path}": expected ${label} tree object, received ${
        tree === null ? "null" : typeof tree
      }`,
    );
  }
}

function assertTopLevelInput<TFields extends FormFieldsRecord>(
  nextBaseline: FormReinitializeInput<TFields>,
): { valueTree: Record<string, unknown>; rawTree: Record<string, unknown> } {
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

  const valueTree = nextBaseline.value as unknown;
  const rawTree = nextBaseline.rawValue as unknown;
  assertObjectTree("value", valueTree, "value");
  assertObjectTree("rawValue", rawTree, "rawValue");
  return { valueTree, rawTree };
}

/**
 * Immutable prepared reinitialize plan for one tree node.
 * Built during prevalidation without mutating form state.
 */
export type PreparedNodeReinitialize =
  | {
      readonly kind: "field";
      readonly internal: FormNodeInternal<InternalFieldBaseline<unknown, unknown>>;
      readonly baseline: InternalFieldBaseline<unknown, unknown>;
    }
  | {
      readonly kind: "group";
      readonly children: readonly PreparedNodeReinitialize[];
    }
  | {
      readonly kind: "array";
      readonly internal: FormNodeInternal<unknown>;
      readonly children: readonly PreparedNodeReinitialize[];
    };

function prevalidateChildNode(
  node: FormNode,
  valueSlice: unknown,
  rawSlice: unknown,
  path: string,
): PreparedNodeReinitialize {
  const internal = getInternalNode(node);
  if (!internal) {
    throw new Error(`Child node "${path}" is missing internal node metadata`);
  }

  if (node.kind === "field") {
    return {
      kind: "field",
      internal: internal as FormNodeInternal<InternalFieldBaseline<unknown, unknown>>,
      baseline: { value: valueSlice, rawValue: rawSlice },
    };
  }

  if (node.kind === "array") {
    const arrayNode = node as FieldArray<FormNode>;
    if (!Array.isArray(valueSlice)) {
      throw new TypeError(
        `Invalid reinitialize baseline at "${path}": expected value tree array, received ${
          valueSlice === null ? "null" : typeof valueSlice
        }`,
      );
    }
    if (!Array.isArray(rawSlice)) {
      throw new TypeError(
        `Invalid reinitialize baseline at "${path}": expected rawValue tree array, received ${
          rawSlice === null ? "null" : typeof rawSlice
        }`,
      );
    }
    const currentItems = arrayNode.items.get();
    if (valueSlice.length !== rawSlice.length) {
      throw new TypeError(
        `Invalid reinitialize baseline at "${path}": value array length (${valueSlice.length}) does not match rawValue array length (${rawSlice.length})`,
      );
    }
    if (valueSlice.length !== currentItems.length) {
      throw new TypeError(
        `Invalid reinitialize baseline at "${path}": array length (${valueSlice.length}) does not match active items count (${currentItems.length})`,
      );
    }

    const children: PreparedNodeReinitialize[] = [];
    for (let i = 0; i < currentItems.length; i++) {
      const childPath = `${path}[${i}]`;
      children.push(
        prevalidateChildNode(currentItems[i]!.node, valueSlice[i], rawSlice[i], childPath),
      );
    }
    return { kind: "array", internal, children };
  }

  const group = node as FieldGroup<FormFieldsRecord>;
  const fieldKeys = Object.keys(group.fields);
  assertObjectTree("value", valueSlice, path);
  assertObjectTree("rawValue", rawSlice, path);
  const valueTree = valueSlice as Record<string, unknown>;
  const rawTree = rawSlice as Record<string, unknown>;

  for (let i = 0; i < fieldKeys.length; i++) {
    const key = fieldKeys[i]!;
    const childPath = path === "" ? key : `${path}.${key}`;
    if (!safeHasProperty(valueTree, key)) {
      throw new TypeError(
        `Invalid reinitialize baseline: missing property "${key}" in value tree at "${childPath}"`,
      );
    }
    if (!safeHasProperty(rawTree, key)) {
      throw new TypeError(
        `Invalid reinitialize baseline: missing property "${key}" in rawValue tree at "${childPath}"`,
      );
    }
  }

  const children: PreparedNodeReinitialize[] = [];
  for (let i = 0; i < fieldKeys.length; i++) {
    const key = fieldKeys[i]!;
    const childPath = path === "" ? key : `${path}.${key}`;
    children.push(
      prevalidateChildNode(group.fields[key]!, valueTree[key], rawTree[key], childPath),
    );
  }

  return { kind: "group", children };
}

/**
 * Phase 1: recursively prevalidate baseline trees and build an immutable commit plan.
 * Performs zero field/group state mutation.
 */
export function prepareReinitializePlan<TFields extends FormFieldsRecord>(
  fields: TFields,
  fieldKeys: readonly string[],
  nextBaseline: FormReinitializeInput<TFields>,
): readonly PreparedNodeReinitialize[] {
  const { valueTree, rawTree } = assertTopLevelInput(nextBaseline);

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

  const plan: PreparedNodeReinitialize[] = [];
  for (let i = 0; i < fieldKeys.length; i++) {
    const key = fieldKeys[i]!;
    plan.push(prevalidateChildNode(fields[key]!, valueTree[key], rawTree[key], key));
  }
  return plan;
}

function commitPreparedNode(plan: PreparedNodeReinitialize): void {
  if (plan.kind === "field") {
    plan.internal.reinitialize(plan.baseline);
    return;
  }

  for (let i = 0; i < plan.children.length; i++) {
    commitPreparedNode(plan.children[i]!);
  }

  if (plan.kind === "array") {
    plan.internal.reinitialize(undefined);
  }
}

/**
 * Phase 2: apply a prepared reinitialize plan. Structural validation must have completed in phase 1.
 */
export function commitReinitializePlan(plan: readonly PreparedNodeReinitialize[]): void {
  for (let i = 0; i < plan.length; i++) {
    commitPreparedNode(plan[i]!);
  }
}

/**
 * Recursively prevalidates and atomically commits a whole subtree baseline replacement.
 */
export function reinitializeChildNodes<TFields extends FormFieldsRecord>(
  fields: TFields,
  fieldKeys: readonly string[],
  nextBaseline: FormReinitializeInput<TFields>,
): void {
  const plan = prepareReinitializePlan(fields, fieldKeys, nextBaseline);
  commitReinitializePlan(plan);
}
