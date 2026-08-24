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
