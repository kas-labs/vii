import type { Scope } from "@vii-labs/core";
import type { FormFieldsRecord, FormNode } from "./types.js";

/**
 * Unique symbol used to attach and retrieve internal node lifecycle metadata.
 * Kept strictly unexported from the public package root.
 */
export const FORM_NODE_INTERNAL = Symbol.for("vii.form.node.internal");

/**
 * Internal interface implemented by all form tree nodes (fields, groups, and root form).
 */
export interface FormNodeInternal<T = unknown> {
  readonly kind: "field" | "group" | "form";
  readonly scope: Scope;
  isAdopted: boolean;
  assertActive(): void;
  reinitialize(nextBaseline: T): void;
  getDirectChildNodes(): readonly FormNode[];
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
 * Validates and attaches child nodes to a parent scope, preventing duplicate ownership.
 */
export function adoptChildNodes<TFields extends FormFieldsRecord>(
  parentScope: Scope,
  fields: TFields,
  fieldKeys: readonly string[],
): void {
  for (let i = 0; i < fieldKeys.length; i++) {
    const key = fieldKeys[i]!;
    const child = fields[key];

    if (
      child === null ||
      typeof child !== "object" ||
      (child.kind !== "field" && child.kind !== "group")
    ) {
      throw new TypeError(`Invalid form node at "${key}": expected a FieldState or FieldGroup`);
    }

    const childInternal = getInternalNode(child);
    if (!childInternal) {
      throw new TypeError(`Invalid form node at "${key}": missing internal lifecycle metadata`);
    }

    if (childInternal.isAdopted) {
      throw new Error(
        `Cannot adopt node at "${key}": node is already part of another form or group`,
      );
    }

    childInternal.isAdopted = true;
    parentScope.use(() => {
      child.dispose();
    });
  }
}
