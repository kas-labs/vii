import type { Scope } from "@vii-labs/core";
import type { ServerIssue } from "../submission/types.js";
import type { FormFieldsRecord, FormNode } from "./types.js";

/**
 * Unique symbol used to attach and retrieve internal node lifecycle metadata.
 * Module-local to prevent accidental global symbol registry collision.
 */
export const FORM_NODE_INTERNAL = Symbol("vii.form.node.internal");

/**
 * Explicit internal lifecycle ownership state.
 */
export type NodeOwnership = "standalone" | "external-scope" | "tree" | "disposed";

/**
 * Internal interface implemented by all form tree nodes (fields, groups, arrays, and root form).
 */
export interface FormNodeInternal<T = unknown> {
  readonly kind: "field" | "group" | "form" | "array";
  readonly scope: Scope;
  ownership: NodeOwnership;
  assertActive(): void;
  reinitialize(nextBaseline: T): void;
  getDirectChildNodes(): readonly FormNode[];
  disposeFromOwner(): void;
  clearServerIssues?(): void;
  setServerIssues?(issues: readonly ServerIssue[]): void;
  notifyMutation?(): void;
  onMutation?: () => void;
}

/**
 * Attaches internal lifecycle metadata to a public form node instance.
 */
export function attachInternalNode<T>(node: object, internal: FormNodeInternal<T>): void {
  Object.defineProperty(node, FORM_NODE_INTERNAL, {
    value: internal,
    writable: false,
    enumerable: false,
    configurable: false,
  });
}

/**
 * Retrieves internal lifecycle metadata from a candidate form node instance.
 */
export function getInternalNode<T = unknown>(node: unknown): FormNodeInternal<T> | undefined {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  return (node as Record<symbol, FormNodeInternal<T>>)[FORM_NODE_INTERNAL];
}

/**
 * Safely defines an own property on a target object without invoking prototype setters.
 * Protects against prototype pollution when handling keys like "__proto__", "constructor", "prototype".
 */
export function safeDefineProperty(target: object, propertyKey: string, value: unknown): void {
  Object.defineProperty(target, propertyKey, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

/**
 * Safely checks whether target object has an own property matching propertyKey.
 */
export function safeHasProperty(target: unknown, propertyKey: string): boolean {
  if (target === null || typeof target !== "object") {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(target, propertyKey);
}

/**
 * Validates that a candidate child node is adoptable without mutating its ownership.
 */
export function validateAdoptableChild(child: unknown, label = "node"): FormNodeInternal {
  if (
    child === null ||
    typeof child !== "object" ||
    !("kind" in (child as Record<string, unknown>)) ||
    ((child as Record<string, unknown>)["kind"] !== "field" &&
      (child as Record<string, unknown>)["kind"] !== "group" &&
      (child as Record<string, unknown>)["kind"] !== "array")
  ) {
    throw new TypeError(
      `Invalid form node at "${label}": expected a FieldState, FieldGroup, or FieldArray`,
    );
  }

  const childInternal = getInternalNode(child);
  if (!childInternal) {
    throw new TypeError(`Invalid form node at "${label}": missing internal lifecycle metadata`);
  }

  if (childInternal.ownership === "disposed") {
    throw new Error(`Cannot adopt node at "${label}": node is disposed`);
  }

  if (childInternal.ownership === "tree") {
    throw new Error(
      `Cannot adopt node at "${label}": node is already part of another form or group`,
    );
  }

  if (childInternal.ownership === "external-scope") {
    throw new Error(`Cannot adopt node at "${label}": node already has an external Scope owner`);
  }

  return childInternal;
}

/**
 * Commits adoption of a pre-validated child node to a parent scope.
 */
export function commitChildAdoption(
  parentScope: Scope,
  childInternal: FormNodeInternal,
  onMutation?: () => void,
): () => void {
  childInternal.ownership = "tree";
  if (onMutation) {
    childInternal.onMutation = onMutation;
  }
  return parentScope.use(() => {
    childInternal.disposeFromOwner();
  });
}

/**
 * Validates and attaches a single child node to a parent scope transactionally.
 */
export function adoptChildNode(
  parentScope: Scope,
  child: unknown,
  label = "node",
  onMutation?: () => void,
): FormNodeInternal {
  const childInternal = validateAdoptableChild(child, label);
  commitChildAdoption(parentScope, childInternal, onMutation);
  return childInternal;
}

/**
 * Validates and attaches child nodes to a parent scope transactionally in two phases.
 * If any child validation fails, zero child ownership mutations occur.
 */
export function adoptChildNodes<TFields extends FormFieldsRecord>(
  parentScope: Scope,
  fields: TFields,
  fieldKeys: readonly string[],
  onMutation?: () => void,
): void {
  // Phase 1: Validate all children without mutating any ownership state
  const childInternals: FormNodeInternal[] = [];
  for (let i = 0; i < fieldKeys.length; i++) {
    const key = fieldKeys[i]!;
    const child = fields[key] as unknown;
    childInternals.push(validateAdoptableChild(child, key));
  }

  // Phase 2: Commit all adoptions transactionally
  for (let i = 0; i < childInternals.length; i++) {
    commitChildAdoption(parentScope, childInternals[i]!, onMutation);
  }
}
