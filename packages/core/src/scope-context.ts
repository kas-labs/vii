import type { ViiResource } from "./scope.js";
import { isThenable, suppressUnhandledRejection } from "./async-guard.js";

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
    if (isThenable(result)) {
      suppressUnhandledRejection(result);
      throw new TypeError(
        "Scope.run does not support asynchronous execution. Scope context cannot be preserved across await.",
      );
    }
    return result;
  } finally {
    activeScope = previousScope;
  }
}
