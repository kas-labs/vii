import { isBatching, schedule } from "./scheduler.js";

interface Subscription<T> {
  active: boolean;
  listener: (value: T) => void;
}

export interface Notifier<T> {
  subscribe(listener: (value: T) => void): () => void;
  notify(value: T): void;
  hasSubscribers(): boolean;
  clear(): void;
}

export function createNotifier<T>(): Notifier<T> {
  const subscriptions: Array<Subscription<T>> = [];
  const pendingValues: T[] = [];
  let flushScheduled = false;

  const notifyListeners = (value: T): unknown[] => {
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

  const flush = (): void => {
    flushScheduled = false;
    const errors: unknown[] = [];

    while (pendingValues.length > 0) {
      errors.push(...notifyListeners(pendingValues.shift()!));
    }

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, "State subscriber errors");
    }
  };

  const notify = (value: T): void => {
    if (isBatching()) {
      pendingValues.length = 0;
    }
    pendingValues.push(value);

    if (!flushScheduled) {
      flushScheduled = true;
      schedule(flush);
    }
  };

  const subscribe = (listener: (value: T) => void): (() => void) => {
    const subscription: Subscription<T> = { active: true, listener };
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
  };

  return {
    subscribe,
    notify,
    hasSubscribers: () => subscriptions.length > 0,
    clear: () => {
      for (const subscription of subscriptions) {
        subscription.active = false;
      }
      subscriptions.length = 0;
    },
  };
}
