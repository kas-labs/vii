import { createNotifier } from "./notifier.js";
import { getActiveDiagnostics, type DiagnosticsRuntime } from "./diagnostics.js";
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
  const diagnostics = getActiveDiagnostics();
  const selectorId = diagnostics?.mode === "off" ? undefined : diagnostics?.allocateId("computed");
  const notifier = createNotifier<T>({
    diagnostics,
    ownerId: selectorId,
    ownerType: "computed",
  });
  const dependencySubscriptions = new Map<Dependency, () => void>();
  let currentValue!: T;
  // The value subscribers last observed: updated on notify, on evaluations that
  // happen while nobody is subscribed, and when the first subscriber attaches.
  // The scheduled recompute compares against this baseline instead of the value
  // captured at job time, so a get() that recomputes between invalidation and
  // the job cannot swallow the pending notification.
  let lastNotifiedValue!: T;
  let hasValue = false;
  let dirty = true;
  let evaluating = false;
  let disposed = false;
  let recomputeScheduled = false;

  recordComputedEvent(diagnostics, "computed.created", selectorId, {});

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("Computed is disposed");
    }
  };

  const computedDependency: Dependency = {
    subscribe: (listener) => notifier.subscribe(() => listener(), { owned: false }),
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
    if (!notifier.hasSubscribers()) {
      lastNotifiedValue = nextValue;
    }
    recordComputedEvent(diagnostics, "computed.recomputed", selectorId, {
      dependencyCount: nextDependencies.size,
    });
    return nextValue;
  };

  const invalidate = (): void => {
    if (disposed) {
      return;
    }

    // No early return when already dirty: a recompute that threw leaves the
    // computed dirty with no job scheduled, and the next dependency change must
    // be able to schedule a fresh recompute instead of starving subscribers.
    dirty = true;

    if (notifier.hasSubscribers() && !recomputeScheduled) {
      recomputeScheduled = true;
      schedule(
        () => {
          recomputeScheduled = false;
          if (disposed || !notifier.hasSubscribers()) {
            return;
          }

          const nextValue = dirty ? evaluate() : currentValue;

          if (!Object.is(lastNotifiedValue, nextValue)) {
            lastNotifiedValue = nextValue;
            notifier.notify(nextValue);
          }
        },
        () => {
          recomputeScheduled = false;
        },
      );
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
      const hadSubscribers = notifier.hasSubscribers();
      const unsubscribe = notifier.subscribe(listener);

      try {
        if (!hasValue || dirty) {
          evaluate();
        }
      } catch (error) {
        unsubscribe();
        throw error;
      }

      if (!hadSubscribers) {
        lastNotifiedValue = currentValue;
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
      recordComputedEvent(diagnostics, "computed.disposed", selectorId, {});
    },
  };

  registerResource({ dispose: result.dispose });
  return result;
}

function recordComputedEvent(
  diagnostics: DiagnosticsRuntime | undefined,
  type: string,
  selectorId: string | undefined,
  payload: Readonly<Record<string, unknown>>,
): void {
  if (diagnostics === undefined || selectorId === undefined) {
    return;
  }

  diagnostics.record(type, { selectorId, ...payload });
}
