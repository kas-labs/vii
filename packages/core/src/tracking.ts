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
    return read();
  } finally {
    activeTracker = previousTracker;
  }
}
