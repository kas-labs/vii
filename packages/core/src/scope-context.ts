import type { ViiResource } from "./scope.js";

export interface ScopeContext {
  use(resource: ViiResource): () => void;
}

let activeScope: ScopeContext | undefined;

export function registerResource(resource: ViiResource): (() => void) | undefined {
  return activeScope?.use(resource);
}

export function withScope<T>(scope: ScopeContext, work: () => T): T {
  const previousScope = activeScope;
  activeScope = scope;

  try {
    const result = work();
    if (
      result !== null &&
      (typeof result === "object" || typeof result === "function") &&
      typeof (result as { then?: unknown }).then === "function"
    ) {
      throw new TypeError(
        "Scope.run does not support asynchronous execution. Scope context cannot be preserved across await.",
      );
    }
    return result;
  } finally {
    activeScope = previousScope;
  }
}
