import { safeDefineProperty } from "./internal.js";

/**
 * Checks if a candidate object is a plain object or a null-prototype object.
 */
function isPlainOrNullProtoObject(val: object): boolean {
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

/**
 * Creates an immutable deep clone snapshot of a structured data value at submission start.
 *
 * Supports primitives, arrays, plain objects, null-prototype records, Map, Set, Date,
 * RegExp, cyclic and shared references, and safely preserves own "__proto__" data properties.
 *
 * Preserves functions, Symbols, and Promises by reference.
 * Unsupported class instances, WeakMap, WeakSet, and DOM/platform handles throw a TypeError.
 */
export function deepCloneSnapshot<T>(val: T, seen: Map<unknown, unknown> = new Map()): T {
  if (val === null || typeof val !== "object") {
    return val;
  }

  // Preserve Promises by reference
  if (typeof (val as { then?: unknown }).then === "function") {
    return val;
  }

  // Shared references and cyclic structures
  const existing = seen.get(val);
  if (existing !== undefined) {
    return existing as T;
  }

  if (val instanceof Date) {
    return new Date(val.getTime()) as unknown as T;
  }

  if (val instanceof RegExp) {
    return new RegExp(val.source, val.flags) as unknown as T;
  }

  if (val instanceof Map) {
    const copy = new Map<unknown, unknown>();
    seen.set(val, copy);
    for (const [k, v] of val) {
      copy.set(deepCloneSnapshot(k, seen), deepCloneSnapshot(v, seen));
    }
    return Object.freeze(copy) as unknown as T;
  }

  if (val instanceof Set) {
    const copy = new Set<unknown>();
    seen.set(val, copy);
    for (const item of val) {
      copy.add(deepCloneSnapshot(item, seen));
    }
    return Object.freeze(copy) as unknown as T;
  }

  if (Array.isArray(val)) {
    const copy: unknown[] = new Array(val.length);
    seen.set(val, copy);
    for (let i = 0; i < val.length; i++) {
      copy[i] = deepCloneSnapshot(val[i], seen);
    }
    return Object.freeze(copy) as unknown as T;
  }

  if (typeof WeakMap !== "undefined" && val instanceof WeakMap) {
    throw new TypeError("WeakMap is not supported in submission snapshot");
  }

  if (typeof WeakSet !== "undefined" && val instanceof WeakSet) {
    throw new TypeError("WeakSet is not supported in submission snapshot");
  }

  if (!isPlainOrNullProtoObject(val)) {
    throw new TypeError(
      `Unsupported object type in submission snapshot: ${(val as { constructor?: { name?: string } }).constructor?.name ?? "unknown class"}`,
    );
  }

  const isNullProto = Object.getPrototypeOf(val) === null;
  const copy: Record<string, unknown> = isNullProto ? Object.create(null) : {};
  seen.set(val, copy);

  const keys = Object.keys(val);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    const clonedChild = deepCloneSnapshot((val as Record<string, unknown>)[key], seen);
    if (key === "__proto__") {
      safeDefineProperty(copy, key, clonedChild);
    } else {
      copy[key] = clonedChild;
    }
  }

  return Object.freeze(copy) as unknown as T;
}
