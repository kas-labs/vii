import { createNotifier } from "./notifier.js";
import { trackDependency, type Dependency } from "./tracking.js";

export type StateListener<T> = (value: T) => void;

export interface WritableState<T> {
  get(): T;
  set(value: T): void;
  update(updater: (current: T) => T): void;
  subscribe(listener: StateListener<T>): () => void;
}

export function state<T>(initialValue: T): WritableState<T> {
  let currentValue = initialValue;
  const notifier = createNotifier<T>();
  const dependency: Dependency = {
    subscribe: (listener) => notifier.subscribe(() => listener()),
  };

  const setValue = (nextValue: T): void => {
    if (!Object.is(currentValue, nextValue)) {
      currentValue = nextValue;
      notifier.notify(currentValue);
    }
  };

  return {
    get: () => {
      trackDependency(dependency);
      return currentValue;
    },
    set: setValue,
    update: (updater) => setValue(updater(currentValue)),
    subscribe: (listener) => notifier.subscribe(listener),
  };
}
