import { isBatching, MAX_FLUSH_ITERATIONS, schedule } from "./scheduler.js";
import type { DiagnosticsRuntime } from "./diagnostics.js";
import { registerResource } from "./scope-context.js";

interface Subscription<T> {
  active: boolean;
  id: string;
  listener: (value: T) => void;
}

export interface SubscribeOptions {
  owned?: boolean;
}

export interface Notifier<T> {
  subscribe(listener: (value: T) => void, options?: SubscribeOptions): () => void;
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
  const subscriptions = new Set<Subscription<T>>();
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

    for (const subscription of Array.from(subscriptions)) {
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
    let iterations = 0;

    while (pendingValues.length > 0) {
      if (++iterations > MAX_FLUSH_ITERATIONS) {
        pendingValues.length = 0;
        errors.push(
          new Error(
            `Runaway notification cycle detected: exceeded ${MAX_FLUSH_ITERATIONS} notifications in a single flush`,
          ),
        );
        break;
      }
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

  const subscribe = (
    listener: (value: T) => void,
    options: SubscribeOptions = {},
  ): (() => void) => {
    const subscription: Subscription<T> = {
      active: true,
      id: diagnostics?.mode === "off" ? "" : (diagnostics?.allocateId("subscription") ?? ""),
      listener,
    };
    subscriptions.add(subscription);
    record("subscription.created", { subscriptionId: subscription.id });

    let detach: (() => void) | undefined;

    const unsubscribe = (): void => {
      if (!subscription.active) {
        return;
      }

      subscription.active = false;
      subscriptions.delete(subscription);
      record("subscription.disposed", { subscriptionId: subscription.id });
      detach?.();
      detach = undefined;
    };

    if (options.owned !== false) {
      detach = registerResource({ dispose: unsubscribe });
    }
    return unsubscribe;
  };

  return {
    subscribe,
    notify,
    hasSubscribers: () => subscriptions.size > 0,
    size: () => subscriptions.size,
    clear: () => {
      for (const subscription of subscriptions) {
        subscription.active = false;
        record("subscription.disposed", { subscriptionId: subscription.id });
      }
      subscriptions.clear();
    },
  };
}
