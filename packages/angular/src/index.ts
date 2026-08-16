import { DestroyRef, inject, signal, type Signal } from "@angular/core";
import type { ReadableState } from "@vii-labs/core";

export type ViiSelector<TState, TSelected> = (state: TState) => TSelected;
export type ViiEquality<T> = (previous: T, next: T) => boolean;

export interface ViiSignalOptions<TSelected> {
  equal?: ViiEquality<TSelected>;
  destroyRef?: DestroyRef;
}

export interface ViiSignalHandle<TSelected> {
  readonly signal: Signal<TSelected>;
  dispose(): void;
}

export function viiSignal<TState>(
  store: ReadableState<TState>,
  options?: ViiSignalOptions<TState>,
): Signal<TState>;
export function viiSignal<TState, TSelected>(
  store: ReadableState<TState>,
  selector: ViiSelector<TState, TSelected>,
  options?: ViiSignalOptions<TSelected>,
): Signal<TSelected>;
export function viiSignal<TState, TSelected>(
  store: ReadableState<TState>,
  selectorOrOptions?: ViiSelector<TState, TSelected> | ViiSignalOptions<TSelected>,
  options?: ViiSignalOptions<TSelected>,
): Signal<TSelected> {
  const resolved = normalizeArguments(selectorOrOptions, options);
  const destroyRef = resolved.options?.destroyRef ?? inject(DestroyRef);

  return createViiSignal(store, resolved.selector, {
    ...resolved.options,
    destroyRef,
  }).signal;
}

export function createViiSignal<TState>(
  store: ReadableState<TState>,
  options?: ViiSignalOptions<TState>,
): ViiSignalHandle<TState>;
export function createViiSignal<TState, TSelected>(
  store: ReadableState<TState>,
  selector: ViiSelector<TState, TSelected>,
  options?: ViiSignalOptions<TSelected>,
): ViiSignalHandle<TSelected>;
export function createViiSignal<TState, TSelected>(
  store: ReadableState<TState>,
  selectorOrOptions?: ViiSelector<TState, TSelected> | ViiSignalOptions<TSelected>,
  options?: ViiSignalOptions<TSelected>,
): ViiSignalHandle<TSelected> {
  const resolved = normalizeArguments(selectorOrOptions, options);
  const current = resolved.selector(store.get());
  const value = signal(current, { equal: resolved.options?.equal ?? Object.is });
  let disposed = false;
  let unregisterDestroy: (() => void) | undefined;
  let storeUnsubscribe: () => void = () => undefined;

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    const unregister = unregisterDestroy;
    unregisterDestroy = undefined;
    storeUnsubscribe();
    unregister?.();
  };

  storeUnsubscribe = store.subscribe(() => {
    if (!disposed) {
      value.set(resolved.selector(store.get()));
    }
  });

  if (resolved.options?.destroyRef !== undefined) {
    if (resolved.options.destroyRef.destroyed) {
      dispose();
    } else {
      unregisterDestroy = resolved.options.destroyRef.onDestroy(dispose);
    }
  }

  return { signal: value.asReadonly(), dispose };
}

function normalizeArguments<TState, TSelected>(
  selectorOrOptions: ViiSelector<TState, TSelected> | ViiSignalOptions<TSelected> | undefined,
  options: ViiSignalOptions<TSelected> | undefined,
): {
  selector: ViiSelector<TState, TSelected>;
  options: ViiSignalOptions<TSelected> | undefined;
} {
  if (typeof selectorOrOptions === "function") {
    return { selector: selectorOrOptions, options };
  }

  return {
    selector: identity as ViiSelector<TState, TSelected>,
    options: selectorOrOptions,
  };
}

function identity<T>(value: T): T {
  return value;
}
