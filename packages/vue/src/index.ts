import { getCurrentScope, onScopeDispose, shallowReadonly, shallowRef, type ShallowRef } from "vue";
import type { ReadableState } from "@vii-labs/core";

export type ViiSelector<TState, TSelected> = (state: TState) => TSelected;
export type ViiEquality<T> = (previous: T, next: T) => boolean;
export type ViiRef<T> = Readonly<ShallowRef<T>>;

export interface ViiRefHandle<T> {
  readonly ref: ViiRef<T>;
  dispose(): void;
}

export function useVii<TState>(store: ReadableState<TState>): ViiRef<TState>;
export function useVii<TState, TSelected>(
  store: ReadableState<TState>,
  selector: ViiSelector<TState, TSelected>,
  equality?: ViiEquality<TSelected>,
): ViiRef<TSelected>;
export function useVii<TState, TSelected>(
  store: ReadableState<TState>,
  selector?: ViiSelector<TState, TSelected>,
  equality?: ViiEquality<TSelected>,
): ViiRef<TSelected> {
  const isProduction =
    (globalThis as unknown as { process?: { env?: { NODE_ENV?: string } } }).process?.env
      ?.NODE_ENV === "production";

  if (getCurrentScope() === undefined && !isProduction) {
    console.warn(
      "[@vii-labs/vue] useVii was called outside an active effect scope. " +
        "The underlying store subscription cannot be automatically disposed and will leak memory. " +
        "Use createViiRef() instead and retain the handle to call dispose() explicitly.",
    );
  }

  if (selector === undefined) {
    return createViiRef(store).ref as unknown as ViiRef<TSelected>;
  }

  return createViiRef(store, selector, equality).ref;
}

export function createViiRef<TState>(store: ReadableState<TState>): ViiRefHandle<TState>;
export function createViiRef<TState, TSelected>(
  store: ReadableState<TState>,
  selector: ViiSelector<TState, TSelected>,
  equality?: ViiEquality<TSelected>,
): ViiRefHandle<TSelected>;
export function createViiRef<TState, TSelected>(
  store: ReadableState<TState>,
  selector?: ViiSelector<TState, TSelected>,
  equality?: ViiEquality<TSelected>,
): ViiRefHandle<TSelected> {
  const resolvedSelector = selector ?? (identity as ViiSelector<TState, TSelected>);
  const resolvedEquality = equality ?? Object.is;
  let current = resolvedSelector(store.get());
  const value = shallowRef(current);
  let disposed = false;
  let unsubscribe: () => void = () => undefined;

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    const cleanup = unsubscribe;
    unsubscribe = () => undefined;
    cleanup();
  };

  unsubscribe = store.subscribe(() => {
    if (disposed) {
      return;
    }

    const next = resolvedSelector(store.get());
    if (!resolvedEquality(current, next)) {
      current = next;
      value.value = next;
    }
  });

  if (getCurrentScope() !== undefined) {
    onScopeDispose(dispose);
  }

  return { ref: shallowReadonly(value), dispose };
}

function identity<T>(value: T): T {
  return value;
}
