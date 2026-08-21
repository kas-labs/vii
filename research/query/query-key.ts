/**
 * @file QueryKey canonicalization, validation, hashing, and matching prototype.
 * Research only: not a public package API or production implementation.
 */

export type QueryKeyPrimitive = string | number | boolean | null;
export type QueryKeyArray = readonly QueryKey[];
export type QueryKeyObject = { readonly [key: string]: QueryKey };
export type QueryKey = QueryKeyPrimitive | QueryKeyArray | QueryKeyObject;

export interface QueryKeyLimits {
  readonly maxDepth?: number;
  readonly maxStringLength?: number;
  readonly maxNodes?: number;
}

const DEFAULT_MAX_DEPTH = 64;
const DEFAULT_MAX_STRING_LENGTH = 1_048_576; // 1 MB
const DEFAULT_MAX_NODES = 10_000;

export class QueryKeyValidationError extends TypeError {
  readonly code: string;

  constructor(message: string, code = "ERR_INVALID_QUERY_KEY") {
    super(message);
    this.name = "QueryKeyValidationError";
    this.code = code;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return false;
  }
  return Object.prototype.toString.call(value) === "[object Object]";
}

function serializePrimitive(value: QueryKeyPrimitive, maxStringLength: number): string {
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    if (Number.isNaN(value) || !Number.isFinite(value)) {
      throw new QueryKeyValidationError(
        `Invalid QueryKey number: received ${String(value)} (NaN and infinities are rejected)`,
      );
    }
    return Object.is(value, -0) ? "0" : JSON.stringify(value);
  }
  if (typeof value === "string") {
    if (value.length > maxStringLength) {
      throw new QueryKeyValidationError(
        `QueryKey string exceeds maximum length of ${maxStringLength} characters`,
        "ERR_QUERY_KEY_LIMIT_EXCEEDED",
      );
    }
    return JSON.stringify(value);
  }
  throw new QueryKeyValidationError(`Unsupported QueryKey primitive type: ${typeof value}`);
}

interface ValidationContext {
  readonly seen: Set<object>;
  readonly maxDepth: number;
  readonly maxStringLength: number;
  readonly maxNodes: number;
  nodeCount: number;
}

function canonicalizeObject(
  obj: Record<string, unknown>,
  depth: number,
  ctx: ValidationContext,
): string {
  const keys = Object.keys(obj);
  // Check for forbidden prototype-pollution keys
  for (const k of keys) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") {
      throw new QueryKeyValidationError(
        `QueryKey objects must not contain special property '${k}'`,
        "ERR_PROTOTYPE_POLLUTION_ATTEMPT",
      );
    }
  }

  keys.sort();
  const pairs: string[] = [];
  for (const k of keys) {
    const serializedVal = canonicalizeRecursive(obj[k], depth + 1, ctx);
    pairs.push(`${JSON.stringify(k)}:${serializedVal}`);
  }
  return `{${pairs.join(",")}}`;
}

function canonicalizeArray(arr: unknown[], depth: number, ctx: ValidationContext): string {
  const elements: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    elements.push(canonicalizeRecursive(arr[i], depth + 1, ctx));
  }
  return `[${elements.join(",")}]`;
}

function canonicalizeRecursive(value: unknown, depth: number, ctx: ValidationContext): string {
  ctx.nodeCount += 1;
  if (ctx.nodeCount > ctx.maxNodes) {
    throw new QueryKeyValidationError(
      `QueryKey exceeds maximum node count limit of ${ctx.maxNodes}`,
      "ERR_QUERY_KEY_LIMIT_EXCEEDED",
    );
  }

  if (depth > ctx.maxDepth) {
    throw new QueryKeyValidationError(
      `QueryKey exceeds maximum nesting depth of ${ctx.maxDepth}`,
      "ERR_QUERY_KEY_LIMIT_EXCEEDED",
    );
  }

  if (value === null || typeof value !== "object") {
    if (value === undefined) {
      throw new QueryKeyValidationError(
        "Invalid QueryKey: undefined is not permitted in query keys",
      );
    }
    if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
      throw new QueryKeyValidationError(
        `Invalid QueryKey: values of type '${typeof value}' are not permitted`,
      );
    }
    return serializePrimitive(value as QueryKeyPrimitive, ctx.maxStringLength);
  }

  if (ctx.seen.has(value)) {
    throw new QueryKeyValidationError(
      "Cyclic reference detected in QueryKey structure",
      "ERR_CYCLIC_QUERY_KEY",
    );
  }
  ctx.seen.add(value);

  try {
    if (Array.isArray(value)) {
      return canonicalizeArray(value, depth, ctx);
    }
    if (isPlainObject(value)) {
      return canonicalizeObject(value, depth, ctx);
    }
    const constructorName =
      (value as { constructor?: { name?: string } }).constructor?.name ?? "Object";
    throw new QueryKeyValidationError(
      `Unsupported QueryKey object instance of type '${constructorName}'. Only plain objects and arrays are permitted`,
    );
  } finally {
    ctx.seen.delete(value);
  }
}

/**
 * Validates and produces an unambiguous, deterministic canonical representation
 * of a QueryKey. Object property order does not affect the output.
 */
export function canonicalizeQueryKey(key: unknown, limits?: QueryKeyLimits): string {
  const ctx: ValidationContext = {
    seen: new Set<object>(),
    maxDepth: limits?.maxDepth ?? DEFAULT_MAX_DEPTH,
    maxStringLength: limits?.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH,
    maxNodes: limits?.maxNodes ?? DEFAULT_MAX_NODES,
    nodeCount: 0,
  };
  return canonicalizeRecursive(key, 0, ctx);
}

/**
 * Computes a fast 32-bit FNV-1a hash of a canonicalized key string for cache indexing.
 * Note: Hashing is an indexing optimization. Collision fallback must verify canonical keys.
 */
export function hashCanonicalKey(canonicalKey: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonicalKey.length; i++) {
    hash ^= canonicalKey.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/**
 * Checks exact equality between two QueryKeys by canonical representation.
 */
export function isExactMatch(a: unknown, b: unknown): boolean {
  try {
    const canonicalA = typeof a === "string" ? a : canonicalizeQueryKey(a);
    const canonicalB = typeof b === "string" ? b : canonicalizeQueryKey(b);
    return canonicalA === canonicalB;
  } catch {
    return false;
  }
}

/**
 * Performs structural prefix / family matching.
 * - Array keys match if candidate key starts with all target elements in order.
 * - Non-array keys match by exact canonical equality.
 * - Object elements participate by full canonical equality at their array position.
 */
export function matchQueryKeyFamily(prefix: unknown, candidate: unknown): boolean {
  if (Array.isArray(prefix) && Array.isArray(candidate)) {
    if (prefix.length > candidate.length) {
      return false;
    }
    for (let i = 0; i < prefix.length; i++) {
      const prefixCanonical = canonicalizeQueryKey(prefix[i]);
      const candidateCanonical = canonicalizeQueryKey(candidate[i]);
      if (prefixCanonical !== candidateCanonical) {
        return false;
      }
    }
    return true;
  }
  return isExactMatch(prefix, candidate);
}
