import { getActiveDiagnostics, withDiagnostics, type DiagnosticsRuntime } from "./diagnostics.js";
import { withScope, type ScopeContext } from "./scope-context.js";

export interface ViiResource {
  dispose(): void;
}

export interface ScopeOptions {
  name?: string;
}

export interface Scope extends ScopeContext, ViiResource {
  readonly name: string | undefined;
  run<T>(work: () => T): T;
  use(resource: ViiResource | (() => void)): void;
  createChild(options?: ScopeOptions): Scope;
}

export class ScopeDisposalError extends AggregateError {
  constructor(errors: readonly unknown[]) {
    super(errors, "Scope disposal errors");
    this.name = "ScopeDisposalError";
  }
}

interface OwnedResource {
  resource: ViiResource;
  resourceId: string | undefined;
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
  const resources: OwnedResource[] = [];
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

  const use = (resource: ViiResource | (() => void)): void => {
    assertActive();
    const ownedResource = typeof resource === "function" ? { dispose: resource } : resource;
    const resourceId =
      diagnostics?.mode === "off" ? undefined : diagnostics?.allocateId("resource");
    resources.push({ resource: ownedResource, resourceId });
    recordScopeEvent(diagnostics, "resource.attached", scopeId, {
      ...(resourceId === undefined ? {} : { resourceId }),
    });
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    const errors: unknown[] = [];
    const resourceCount = resources.length;

    recordScopeEvent(diagnostics, "scope.disposing", scopeId, { resourceCount });

    while (resources.length > 0) {
      const ownedResource = resources.pop()!;
      let succeeded = true;

      try {
        ownedResource.resource.dispose();
      } catch (error) {
        succeeded = false;
        errors.push(error);
      } finally {
        recordScopeEvent(diagnostics, "resource.disposed", scopeId, {
          ...(ownedResource.resourceId === undefined
            ? {}
            : { resourceId: ownedResource.resourceId }),
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
      use(child);
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
