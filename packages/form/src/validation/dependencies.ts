import { getInternalNode } from "../core/internal.js";
import type { FieldState } from "../core/types.js";

/**
 * Manages symmetric dependency graph edges, immutable snapshots, and lifetime lifecycle.
 */
export interface DependencyManager {
  readonly dependencies: Set<FieldState<unknown, unknown>>;
  readonly declaredDeps: WeakSet<FieldState<unknown, unknown>>;
  getDependencies(): readonly FieldState<unknown, unknown>[];
  getSnapshot(): ReadonlyMap<FieldState<unknown, unknown>, unknown>;
  resolveOnce(self: FieldState<unknown, unknown>): readonly FieldState<unknown, unknown>[];
  resolveWith(
    self: FieldState<unknown, unknown>,
    raw: readonly FieldState<unknown, unknown>[],
  ): readonly FieldState<unknown, unknown>[];
  detachAll(self: FieldState<unknown, unknown>): void;
}

/**
 * Validates dependencies array for a new field:
 * - Rejects null/undefined or non-field objects
 * - Rejects disposed dependency nodes
 * - Rejects self-dependencies
 * - Rejects cycles (direct or transitive)
 * - Deduplicates input references
 */
export function validateAndDeduplicateDependencies(
  candidateField: unknown,
  dependencies: readonly FieldState<unknown, unknown>[] | undefined,
): readonly FieldState<unknown, unknown>[] {
  if (!dependencies || dependencies.length === 0) {
    return [];
  }

  const deduplicated: FieldState<unknown, unknown>[] = [];
  const seen = new Set<FieldState<unknown, unknown>>();

  for (let i = 0; i < dependencies.length; i++) {
    const dep = dependencies[i];
    if (!dep || typeof dep !== "object" || (dep as { kind?: string }).kind !== "field") {
      throw new TypeError("Invalid dependency: expected a FieldState node");
    }

    if (candidateField !== undefined && dep === candidateField) {
      throw new Error("Validation self-dependency is not allowed");
    }

    const internal = getInternalNode(dep);
    if (!internal || internal.ownership === "disposed") {
      throw new Error("Cannot depend on a disposed field");
    }

    if (!seen.has(dep)) {
      seen.add(dep);
      deduplicated.push(dep);
    }
  }

  // Detect cycles if candidateField is known or reachable
  if (candidateField !== undefined) {
    for (let i = 0; i < deduplicated.length; i++) {
      if (
        isReachable(deduplicated[i]!, candidateField as FieldState<unknown, unknown>, new Set())
      ) {
        throw new Error("Validation dependency cycle detected");
      }
    }
  }

  return Object.freeze(deduplicated);
}

function isReachable(
  from: FieldState<unknown, unknown>,
  target: FieldState<unknown, unknown>,
  visited: Set<FieldState<unknown, unknown>>,
): boolean {
  if (from === target) return true;
  if (visited.has(from)) return false;
  visited.add(from);

  const internal = getInternalNode(from);
  if (!internal || !internal.dependencies) return false;

  for (const dep of internal.dependencies) {
    if (isReachable(dep, target, visited)) {
      return true;
    }
  }
  return false;
}

/**
 * Creates a shared dependency manager for a field node with deterministic lifecycle.
 */
export function createDependencyManager(
  declared:
    | readonly FieldState<unknown, unknown>[]
    | ((self: FieldState<unknown, unknown>) => readonly FieldState<unknown, unknown>[])
    | undefined,
): DependencyManager {
  const dependencies = new Set<FieldState<unknown, unknown>>();
  const declaredDeps = new WeakSet<FieldState<unknown, unknown>>();
  let resolved = false;

  const registerValidated = (
    self: FieldState<unknown, unknown>,
    list: readonly FieldState<unknown, unknown>[],
  ): void => {
    for (let i = 0; i < list.length; i++) {
      const dep = list[i]!;
      declaredDeps.add(dep);
      dependencies.add(dep);
      const depInternal = getInternalNode(dep);
      if (depInternal) {
        if (!depInternal.dependents) {
          depInternal.dependents = new Set();
        }
        depInternal.dependents.add(self);
      }
    }
  };

  const resolveWith = (
    self: FieldState<unknown, unknown>,
    raw: readonly FieldState<unknown, unknown>[],
  ): readonly FieldState<unknown, unknown>[] => {
    if (resolved) return Array.from(dependencies);
    const validated = validateAndDeduplicateDependencies(self, raw);
    registerValidated(self, validated);
    resolved = true;
    return validated;
  };

  const resolveOnce = (
    self: FieldState<unknown, unknown>,
  ): readonly FieldState<unknown, unknown>[] => {
    if (resolved) return Array.from(dependencies);
    const raw = typeof declared === "function" ? declared(self) : declared;
    return resolveWith(self, raw ?? []);
  };

  const detachAll = (self: FieldState<unknown, unknown>): void => {
    for (const dep of dependencies) {
      const depInternal = getInternalNode(dep);
      depInternal?.dependents?.delete(self);
    }
    dependencies.clear();

    const selfInternal = getInternalNode(self);
    if (selfInternal?.dependents) {
      for (const dependent of selfInternal.dependents) {
        const dependentInternal = getInternalNode(dependent);
        dependentInternal?.dependencies?.delete(self);
        dependentInternal?.cancelActiveValidation?.();
      }
      selfInternal.dependents.clear();
    }
  };

  const getSnapshot = (): ReadonlyMap<FieldState<unknown, unknown>, unknown> => {
    return captureDependencySnapshot(dependencies);
  };

  return {
    dependencies,
    declaredDeps,
    getDependencies: () => Array.from(dependencies),
    getSnapshot,
    resolveOnce,
    resolveWith,
    detachAll,
  };
}

/**
 * Captures an immutable snapshot of all declared dependencies at the moment a validation run starts.
 * Returns undefined for dependencies that have been disposed or unregistered.
 */
export function captureDependencySnapshot(
  dependencies: Iterable<FieldState<unknown, unknown>>,
): ReadonlyMap<FieldState<unknown, unknown>, unknown> {
  const map = new Map<FieldState<unknown, unknown>, unknown>();
  for (const dep of dependencies) {
    const internal = getInternalNode(dep);
    if (internal && internal.ownership !== "disposed") {
      try {
        map.set(dep, dep.getValue());
      } catch {
        map.set(dep, undefined);
      }
    } else {
      map.set(dep, undefined);
    }
  }
  return map;
}

/**
 * Computes a topological validation wave of downstream dependents originating from a mutated field.
 * Guarantees each reachable dependent is included at most once and ordered dependencies-first.
 */
export function collectValidationWave(
  source: FieldState<unknown, unknown>,
): readonly FieldState<unknown, unknown>[] {
  const sourceInternal = getInternalNode(source);
  if (!sourceInternal || !sourceInternal.dependents || sourceInternal.dependents.size === 0) {
    return [];
  }

  // 1. Discover all reachable downstream dependents
  const allNodes = new Set<FieldState<unknown, unknown>>();
  const queue: FieldState<unknown, unknown>[] = [];

  for (const dep of sourceInternal.dependents) {
    allNodes.add(dep);
    queue.push(dep);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const curInternal = getInternalNode(current);
    if (curInternal?.dependents) {
      for (const next of curInternal.dependents) {
        if (!allNodes.has(next)) {
          allNodes.add(next);
          queue.push(next);
        }
      }
    }
  }

  if (allNodes.size <= 1) {
    return Array.from(allNodes);
  }

  // 2. Topological sort using Kahn's algorithm
  const inDegree = new Map<FieldState<unknown, unknown>, number>();
  const zeroInDegree: FieldState<unknown, unknown>[] = [];

  for (const node of allNodes) {
    const internal = getInternalNode(node);
    let deg = 0;
    if (internal?.dependencies) {
      for (const d of internal.dependencies) {
        if (allNodes.has(d)) {
          deg++;
        }
      }
    }
    inDegree.set(node, deg);
    if (deg === 0) {
      zeroInDegree.push(node);
    }
  }

  const wave: FieldState<unknown, unknown>[] = [];
  while (zeroInDegree.length > 0) {
    const node = zeroInDegree.shift()!;
    wave.push(node);
    const internal = getInternalNode(node);
    if (internal?.dependents) {
      for (const next of internal.dependents) {
        if (allNodes.has(next)) {
          const rem = (inDegree.get(next) ?? 1) - 1;
          inDegree.set(next, rem);
          if (rem === 0) {
            zeroInDegree.push(next);
          }
        }
      }
    }
  }

  return wave;
}

/**
 * Triggers revalidation for all nodes in the validation wave resulting from a mutation.
 */
export function executeDependencyWave(source: FieldState<unknown, unknown>): void {
  const wave = collectValidationWave(source);
  for (let i = 0; i < wave.length; i++) {
    const node = wave[i]!;
    const internal = getInternalNode(node);
    if (internal && internal.ownership !== "disposed") {
      internal.scheduleDependentValidation?.("change");
    }
  }
}
