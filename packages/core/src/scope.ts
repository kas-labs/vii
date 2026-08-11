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

export function createScope(options: ScopeOptions = {}): Scope {
  const resources: ViiResource[] = [];
  let disposed = false;

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("Scope is disposed");
    }
  };

  const use = (resource: ViiResource | (() => void)): void => {
    assertActive();
    resources.push(typeof resource === "function" ? { dispose: resource } : resource);
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    const errors: unknown[] = [];

    while (resources.length > 0) {
      const resource = resources.pop()!;

      try {
        resource.dispose();
      } catch (error) {
        errors.push(error);
      }
    }

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
      return withScope(scope, work);
    },
    use,
    createChild: (childOptions = {}): Scope => {
      assertActive();
      const child = createScope(childOptions);
      use(child);
      return child;
    },
    dispose,
  };

  return scope;
}
