import { createNotifier } from "./notifier.js";
import { schedule } from "./scheduler.js";
import { registerResource } from "./scope-context.js";
import type { StateListener } from "./state.js";
import { trackDependency, withTracker, type Dependency } from "./tracking.js";

export interface ReadableState<T> {
  get(): T;
  subscribe(listener: StateListener<T>): () => void;
}

export interface Computed<T> extends ReadableState<T> {
  dispose(): void;
}

export function computed<T>(read: () => T): Computed<T> {
  const notifier = createNotifier<T>();
  const dependencySubscriptions = new Map<Dependency, () => void>();
  let currentValue!: T;
  let hasValue = false;
  let dirty = true;
  let evaluating = false;
  let disposed = false;
  let recomputeScheduled = false;

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("Computed is disposed");
    }
  };

  const computedDependency: Dependency = {
    subscribe: (listener) => notifier.subscribe(() => listener()),
  };

  const evaluate = (): T => {
    assertActive();

    if (evaluating) {
      throw new Error("Computed cycle detected");
    }

    const nextDependencies = new Set<Dependency>();
    evaluating = true;
    let nextValue: T;

    try {
      nextValue = withTracker(
        {
          depend: (dependency) => nextDependencies.add(dependency),
        },
        read,
      );
    } finally {
      evaluating = false;
    }

    for (const [dependency, unsubscribe] of dependencySubscriptions) {
      if (!nextDependencies.has(dependency)) {
        unsubscribe();
        dependencySubscriptions.delete(dependency);
      }
    }

    for (const dependency of nextDependencies) {
      if (!dependencySubscriptions.has(dependency)) {
        dependencySubscriptions.set(dependency, dependency.subscribe(invalidate));
      }
    }

    currentValue = nextValue;
    hasValue = true;
    dirty = false;
    return nextValue;
  };

  const invalidate = (): void => {
    if (disposed || dirty) {
      return;
    }

    dirty = true;

    if (notifier.hasSubscribers() && !recomputeScheduled) {
      recomputeScheduled = true;
      schedule(() => {
        recomputeScheduled = false;
        if (disposed || !dirty || !notifier.hasSubscribers()) {
          return;
        }

        const previousValue = currentValue;
        const nextValue = evaluate();

        if (!Object.is(previousValue, nextValue)) {
          notifier.notify(nextValue);
        }
      });
    }
  };

  const result: Computed<T> = {
    get: () => {
      assertActive();
      trackDependency(computedDependency);
      return dirty ? evaluate() : currentValue;
    },
    subscribe: (listener) => {
      assertActive();
      const unsubscribe = notifier.subscribe(listener);

      try {
        if (!hasValue || dirty) {
          evaluate();
        }
      } catch (error) {
        unsubscribe();
        throw error;
      }

      return unsubscribe;
    },
    dispose: () => {
      if (disposed) {
        return;
      }

      disposed = true;
      for (const unsubscribe of dependencySubscriptions.values()) {
        unsubscribe();
      }
      dependencySubscriptions.clear();
      notifier.clear();
      dirty = true;
    },
  };

  registerResource({ dispose: result.dispose });
  return result;
}
