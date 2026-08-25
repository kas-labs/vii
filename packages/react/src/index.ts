import { useMemo, useRef, useSyncExternalStore } from "react";
import type { ReadableState } from "@vii-labs/core";

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

  // Concurrency & Ref Synchronization Rationale (R4):
  // Inline selectors (e.g. `(s) => ({ count: s.count })`) produce a new function reference
  // on every render. If `selector` and `equality` were placed in the `useMemo` dependency array
  // of `bridge`, `bridge.subscribe` would change on every render, forcing `useSyncExternalStore`
  // to resubscribe to the store on every single render pass (breaking subscription stability).
  //
  // To avoid this while preventing stale selector closures, `selectorRef` and `equalityRef` are
  // synchronized during render. In concurrent React, if an async render pass is interrupted or
  // discarded, the subscription callback will evaluate against the latest selector provided.
  // When a render resumes or is retried, the hook re-executes and updates the refs with the
  // active render's selector. Snapshot memoization within `bridge` ensures `getSnapshot` returns
  // consistent, idempotent selected values without tearing across render and commit phases.
  const selectorRef = useRef(resolvedSelector);
  const equalityRef = useRef(resolvedEquality);
  selectorRef.current = resolvedSelector;
  equalityRef.current = resolvedEquality;

  const bridge = useMemo(() => {
    let hasMemo = false;
    let memoizedStoreSnapshot: TState;
    let memoizedSelector: ViiSelector<TState, TSelected> = resolvedSelector;
    let memoizedSelection: TSelected;

    const getSelection = (): TSelected => {
      const currentStoreSnapshot = store.get();
      const currentSelector = selectorRef.current;
      const currentEquality = equalityRef.current;

      if (!hasMemo) {
        hasMemo = true;
        memoizedStoreSnapshot = currentStoreSnapshot;
        memoizedSelector = currentSelector;
        memoizedSelection = currentSelector(currentStoreSnapshot);
        return memoizedSelection;
      }

      if (
        Object.is(memoizedStoreSnapshot, currentStoreSnapshot) &&
        memoizedSelector === currentSelector
      ) {
        return memoizedSelection;
      }

      const nextSelection = currentSelector(currentStoreSnapshot);
      if (currentEquality(memoizedSelection, nextSelection)) {
        memoizedStoreSnapshot = currentStoreSnapshot;
        memoizedSelector = currentSelector;
        return memoizedSelection;
      }

      memoizedStoreSnapshot = currentStoreSnapshot;
      memoizedSelector = currentSelector;
      memoizedSelection = nextSelection;
      return nextSelection;
    };

    const subscribeToStore = (listener: () => void): (() => void) => {
      return store.subscribe(() => {
        const currentStoreSnapshot = store.get();
        const currentSelector = selectorRef.current;
        const currentEquality = equalityRef.current;
        const nextSelection = currentSelector(currentStoreSnapshot);

        if (!hasMemo || !currentEquality(memoizedSelection, nextSelection)) {
          memoizedStoreSnapshot = currentStoreSnapshot;
          memoizedSelector = currentSelector;
          memoizedSelection = nextSelection;
          hasMemo = true;
          listener();
        }
      });
    };

    return {
      getSnapshot: getSelection,
      getServerSnapshot: getSelection,
      subscribe: subscribeToStore,
    };
  }, [store]);

  return useSyncExternalStore(bridge.subscribe, bridge.getSnapshot, bridge.getServerSnapshot);
}

function identity<T>(value: T): T {
  return value;
}
