import { isBatching, schedule } from "./scheduler.js";
import type { DiagnosticsRuntime } from "./diagnostics.js";
import { registerResource } from "./scope-context.js";

interface Subscription<T> {
  active: boolean;
  id: string;
  listener: (value: T) => void;
}

export interface Notifier<T> {
  subscribe(listener: (value: T) => void): () => void;
  notify(value: T): void;
  hasSubscribers(): boolean;
  size(): number;
  clear(): void;
}

export interface NotifierOptions {
  diagnostics?: DiagnosticsRuntime | undefined;
  ownerId?: string | undefined;
  ownerType?: string | undefined;
}

export function createNotifier<T>(options: NotifierOptions = {}): Notifier<T> {
  const subscriptions: Array<Subscription<T>> = [];
  const pendingValues: T[] = [];
  let flushScheduled = false;
  const diagnostics = options.diagnostics;

  const record = (type: string, payload: Readonly<Record<string, unknown>>): void => {
    if (diagnostics === undefined || diagnostics.mode === "off") {
      return;
    }

    diagnostics.record(type, {
      ...(options.ownerId === undefined ? {} : { ownerId: options.ownerId }),
      ...(options.ownerType === undefined ? {} : { ownerType: options.ownerType }),
      ...payload,
    });
  };

  const notifyListeners = (value: T): unknown[] => {
    const errors: unknown[] = [];

    for (const subscription of [...subscriptions]) {
      if (!subscription.active) {
        continue;
      }

      record("subscription.notified", { subscriptionId: subscription.id });

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
    const subscription: Subscription<T> = {
      active: true,
      id: diagnostics?.mode === "off" ? "" : (diagnostics?.allocateId("subscription") ?? ""),
      listener,
    };
    subscriptions.push(subscription);
    record("subscription.created", { subscriptionId: subscription.id });

    const unsubscribe = (): void => {
      if (!subscription.active) {
        return;
      }

      subscription.active = false;
      const index = subscriptions.indexOf(subscription);
      if (index >= 0) {
        subscriptions.splice(index, 1);
      }
      record("subscription.disposed", { subscriptionId: subscription.id });
    };

    registerResource({ dispose: unsubscribe });
    return unsubscribe;
  };

  return {
    subscribe,
    notify,
    hasSubscribers: () => subscriptions.length > 0,
    size: () => subscriptions.length,
    clear: () => {
      for (const subscription of [...subscriptions]) {
        subscription.active = false;
        const index = subscriptions.indexOf(subscription);
        if (index >= 0) {
          subscriptions.splice(index, 1);
        }
        record("subscription.disposed", { subscriptionId: subscription.id });
      }
    },
  };
}
