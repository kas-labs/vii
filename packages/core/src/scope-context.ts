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
    return work();
  } finally {
    activeScope = previousScope;
  }
}
