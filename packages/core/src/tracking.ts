export interface Dependency {
  subscribe(listener: () => void): () => void;
}

export interface DependencyTracker {
  depend(dependency: Dependency): void;
}

let activeTracker: DependencyTracker | undefined;

export function trackDependency(dependency: Dependency): void {
  activeTracker?.depend(dependency);
}

export function withTracker<T>(tracker: DependencyTracker, read: () => T): T {
  const previousTracker = activeTracker;
  activeTracker = tracker;

  try {
    const result = read();
    if (
      result !== null &&
      (typeof result === "object" || typeof result === "function") &&
      typeof (result as { then?: unknown }).then === "function"
    ) {
      throw new TypeError(
        "Dependency tracking does not support asynchronous execution. Read functions must be synchronous.",
      );
    }
    return result;
  } finally {
    activeTracker = previousTracker;
  }
}
