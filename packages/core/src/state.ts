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

  const notify = (value: T): void => {
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

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, "State subscriber errors");
    }
  };

  return {
    get: () => currentValue,
    set: (nextValue) => {
      if (!Object.is(currentValue, nextValue)) {
        currentValue = nextValue;
        notify(currentValue);
      }
    },
    update: (updater) => {
      const nextValue = updater(currentValue);

      if (!Object.is(currentValue, nextValue)) {
        currentValue = nextValue;
        notify(currentValue);
      }
    },
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
