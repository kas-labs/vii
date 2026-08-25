import { getActiveDiagnostics, withDiagnostics, type DiagnosticsRuntime } from "./diagnostics.js";
import { withScope, type ScopeContext } from "./scope-context.js";

/**
 * Disposable resource interface managed by a Scope.
 * Implementations must ensure `dispose()` is idempotent.
 */
export interface ViiResource {
  dispose(): void;
}

export interface ScopeOptions {
  name?: string;
}

export interface Scope extends ScopeContext, ViiResource {
  readonly name: string | undefined;
  /**
   * Runs the provided work function synchronously within this scope.
   * Asynchronous functions returning thenables or Promises are rejected.
   */
  run<T>(work: () => T): T;
  /**
   * Attaches a disposable resource or cleanup function to this scope.
   * Returns a detach handle that immediately removes the resource from the scope.
   */
  use(resource: ViiResource | (() => void)): () => void;
  createChild(options?: ScopeOptions): Scope;
}

export class ScopeDisposalError extends AggregateError {
  constructor(errors: readonly unknown[]) {
    super(errors, "Scope disposal errors");
    this.name = "ScopeDisposalError";
  }
}

interface ResourceNode {
  resource: ViiResource;
  resourceId: string | undefined;
  prev: ResourceNode | null;
  next: ResourceNode | null;
  detached: boolean;
}

export function createScope(
  options: ScopeOptions = {},
  inheritedDiagnostics?: DiagnosticsRuntime,
): Scope {
  return createScopeInternal(options, inheritedDiagnostics, undefined);
}

function createScopeInternal(
  options: ScopeOptions,
  inheritedDiagnostics: DiagnosticsRuntime | undefined,
  parentScopeId: string | undefined,
): Scope {
  const diagnostics = inheritedDiagnostics ?? getActiveDiagnostics();
  const scopeId = diagnostics?.mode === "off" ? undefined : diagnostics?.allocateId("scope");
  let tail: ResourceNode | null = null;
  let activeResourceCount = 0;
  let disposed = false;

  recordScopeEvent(diagnostics, "scope.created", scopeId, {
    ...(options.name === undefined ? {} : { name: options.name }),
    ...(parentScopeId === undefined ? {} : { parentScopeId }),
  });

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("Scope is disposed");
    }
  };

  const use = (resource: ViiResource | (() => void)): (() => void) => {
    assertActive();
    const ownedResource = typeof resource === "function" ? { dispose: resource } : resource;
    const resourceId =
      diagnostics?.mode === "off" ? undefined : diagnostics?.allocateId("resource");
    const node: ResourceNode = {
      resource: ownedResource,
      resourceId,
      prev: tail,
      next: null,
      detached: false,
    };

    if (tail !== null) {
      tail.next = node;
      tail = node;
    } else {
      tail = node;
    }
    activeResourceCount += 1;

    recordScopeEvent(diagnostics, "resource.attached", scopeId, {
      ...(resourceId === undefined ? {} : { resourceId }),
    });

    return (): void => {
      if (node.detached || disposed) {
        return;
      }
      node.detached = true;
      activeResourceCount -= 1;

      if (node.prev !== null) {
        node.prev.next = node.next;
      }

      if (node.next !== null) {
        node.next.prev = node.prev;
      } else {
        tail = node.prev;
      }

      node.prev = null;
      node.next = null;
    };
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    const errors: unknown[] = [];
    const resourceCount = activeResourceCount;

    recordScopeEvent(diagnostics, "scope.disposing", scopeId, { resourceCount });

    while (tail !== null) {
      const current = tail;
      tail = current.prev;
      if (tail !== null) {
        tail.next = null;
      }
      current.prev = null;
      current.next = null;
      current.detached = true;
      activeResourceCount -= 1;

      let succeeded = true;

      try {
        current.resource.dispose();
      } catch (error) {
        succeeded = false;
        errors.push(error);
      } finally {
        recordScopeEvent(diagnostics, "resource.disposed", scopeId, {
          ...(current.resourceId === undefined ? {} : { resourceId: current.resourceId }),
          succeeded,
        });
      }
    }

    recordScopeEvent(diagnostics, "scope.disposed", scopeId, {
      resourceCount,
      errorCount: errors.length,
    });

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new ScopeDisposalError(errors);
    }
  };

  const scope: Scope = {
    name: options.name,
    run: <T>(work: () => T): T => {
      assertActive();
      const runInScope = (): T => withScope(scope, work);
      return diagnostics === undefined || diagnostics.mode === "off"
        ? runInScope()
        : withDiagnostics(diagnostics, runInScope);
    },
    use,
    createChild: (childOptions = {}): Scope => {
      assertActive();
      const child = createScopeInternal(childOptions, diagnostics, scopeId);
      const detach = use(child);
      child.use(() => {
        detach();
      });
      return child;
    },
    dispose,
  };

  return scope;
}

function recordScopeEvent(
  diagnostics: DiagnosticsRuntime | undefined,
  type: string,
  scopeId: string | undefined,
  payload: Readonly<Record<string, unknown>>,
): void {
  if (diagnostics === undefined || scopeId === undefined) {
    return;
  }

  diagnostics.record(type, { scopeId, ...payload });
}
