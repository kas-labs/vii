import { useMemo, useSyncExternalStore } from "react";
import type { ReadableState } from "@vii/core";

export type ViiSelector<TState, TSelected> = (state: TState) => TSelected;
export type ViiEquality<T> = (previous: T, next: T) => boolean;

export function useVii<TState>(store: ReadableState<TState>): TState;
export function useVii<TState, TSelected = TState>(
  store: ReadableState<TState>,
  selector: ViiSelector<TState, TSelected>,
  equality?: ViiEquality<TSelected>,
): TSelected;
export function useVii<TState, TSelected>(
  store: ReadableState<TState>,
  selector?: ViiSelector<TState, TSelected>,
  equality?: ViiEquality<TSelected>,
): TSelected {
  const resolvedSelector: ViiSelector<TState, TSelected> =
    selector ?? (identity as unknown as ViiSelector<TState, TSelected>);
  const resolvedEquality = equality ?? Object.is;

  const bridge = useMemo(
    () => createSnapshotBridge(store, resolvedSelector, resolvedEquality),
    [store, resolvedSelector, resolvedEquality],
  );

  return useSyncExternalStore(bridge.subscribe, bridge.getSnapshot, bridge.getServerSnapshot);
}

interface SnapshotBridge<TSelected> {
  getSnapshot(): TSelected;
  getServerSnapshot(): TSelected;
  subscribe(listener: () => void): () => void;
}

function createSnapshotBridge<TState, TSelected>(
  store: ReadableState<TState>,
  selector: ViiSelector<TState, TSelected>,
  equality: ViiEquality<TSelected>,
): SnapshotBridge<TSelected> {
  let snapshot = selector(store.get());

  const readSnapshot = (): TSelected => {
    const next = selector(store.get());
    if (!equality(snapshot, next)) {
      snapshot = next;
    }
    return snapshot;
  };

  return {
    getSnapshot: readSnapshot,
    getServerSnapshot: readSnapshot,
    subscribe: (listener) =>
      store.subscribe(() => {
        const next = selector(store.get());
        if (!equality(snapshot, next)) {
          snapshot = next;
          listener();
        }
      }),
  };
}

function identity<T>(value: T): T {
  return value;
}
