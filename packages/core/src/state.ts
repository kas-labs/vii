export type StateListener<T> = (value: T) => void;

export interface WritableState<T> {
  get(): T;
  set(value: T): void;
  update(updater: (current: T) => T): void;
  subscribe(listener: StateListener<T>): () => void;
}

export function state<T>(initialValue: T): WritableState<T> {
  let currentValue = initialValue;
  const subscriptions: Array<{
    active: boolean;
    listener: StateListener<T>;
  }> = [];
  const pendingValues: T[] = [];
  let isFlushing = false;

  const notify = (value: T): unknown[] => {
    const errors: unknown[] = [];

    for (const subscription of [...subscriptions]) {
      if (!subscription.active) {
        continue;
      }

      try {
        subscription.listener(value);
      } catch (error) {
        errors.push(error);
      }
    }

    return errors;
  };

  const flushNotifications = (value: T): void => {
    pendingValues.push(value);

    if (isFlushing) {
      return;
    }

    isFlushing = true;
    const errors: unknown[] = [];

    try {
      while (pendingValues.length > 0) {
        errors.push(...notify(pendingValues.shift()!));
      }
    } finally {
      pendingValues.length = 0;
      isFlushing = false;
    }

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, "State subscriber errors");
    }
  };

  const setValue = (nextValue: T): void => {
    if (!Object.is(currentValue, nextValue)) {
      currentValue = nextValue;
      flushNotifications(currentValue);
    }
  };

  return {
    get: () => currentValue,
    set: setValue,
    update: (updater) => setValue(updater(currentValue)),
    subscribe: (listener) => {
      const subscription = { active: true, listener };
      subscriptions.push(subscription);

      return () => {
        if (!subscription.active) {
          return;
        }

        subscription.active = false;
        const index = subscriptions.indexOf(subscription);
        if (index >= 0) {
          subscriptions.splice(index, 1);
        }
      };
    },
  };
}
