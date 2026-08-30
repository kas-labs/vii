/**
 * Internal external-store utilities for React useSyncExternalStore bridging.
 */

export interface SubscribableSignal {
  subscribe(callback: () => void): () => void;
}

/**
 * Creates a live snapshot evaluator that memoizes the returned snapshot object
 * by referential property equality (using Object.is on all keys).
 *
 * This ensures:
 * 1. getSnapshot() always reads live signal values (pre-subscription mutations are not lost).
 * 2. Unchanged snapshots retain exact object identity, preventing React re-render loops.
 */
function isPropertyEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

export function createMemoizedSnapshotReader<TSnapshot extends object>(
  readSnapshot: () => TSnapshot,
): () => TSnapshot {
  let cached: TSnapshot | undefined;

  return (): TSnapshot => {
    const next = readSnapshot();
    if (cached === undefined) {
      cached = next;
      return cached;
    }

    const nextObj = next as Record<string, unknown>;
    const cachedObj = cached as Record<string, unknown>;
    const nextKeys = Object.keys(nextObj);
    const cachedKeys = Object.keys(cachedObj);

    if (nextKeys.length !== cachedKeys.length) {
      cached = next;
      return cached;
    }

    for (let i = 0; i < nextKeys.length; i++) {
      const key = nextKeys[i]!;
      if (!isPropertyEqual(nextObj[key], cachedObj[key])) {
        cached = next;
        return cached;
      }
    }

    return cached;
  };
}

/**
 * Subscribes to multiple Vii signals and returns a unified unsubscribe function.
 * Ensures clean subscription cleanup on unmount and under React StrictMode.
 */
export function subscribeSignals(
  signals: readonly SubscribableSignal[],
  onStoreChange: () => void,
): () => void {
  const unsubs = signals.map((signal) => signal.subscribe(onStoreChange));
  return () => {
    for (let i = 0; i < unsubs.length; i++) {
      unsubs[i]!();
    }
  };
}
