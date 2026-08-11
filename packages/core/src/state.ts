export interface WritableState<T> {
  get(): T;
  set(value: T): void;
  update(updater: (current: T) => T): void;
}

export function state<T>(initialValue: T): WritableState<T> {
  let currentValue = initialValue;

  return {
    get: () => currentValue,
    set: (nextValue) => {
      if (!Object.is(currentValue, nextValue)) {
        currentValue = nextValue;
      }
    },
    update: (updater) => {
      const nextValue = updater(currentValue);

      if (!Object.is(currentValue, nextValue)) {
        currentValue = nextValue;
      }
    },
  };
}
