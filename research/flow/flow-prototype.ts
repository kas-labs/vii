/*
 * THROWAWAY RESEARCH PROTOTYPE — do not import from production packages.
 * It exists to compare Flow semantics against direct platform code and RxJS.
 */

import type { Scope } from "../../packages/core/src/index.js";

type NotificationErrors = readonly unknown[];
type NotificationResult = void | NotificationErrors;

export interface FlowObserver<T> {
  next(value: T): void;
  error(error: unknown): void;
  complete(): void;
}

export interface FlowSubscription {
  readonly closed: boolean;
  unsubscribe(): void;
  dispose(): void;
}

export interface FlowSource<T> {
  subscribe(observer: FlowObserver<T>): FlowSubscription;
}

export interface TimerScheduler {
  set(delay: number, callback: () => void): number;
  clear(timerId: number): void;
}

export type FlowOperator<T, U> = (source: FlowSource<T>) => FlowSource<U>;

interface QueuedObserver<T> {
  next(value: T): NotificationErrors;
  error(error: unknown): NotificationErrors;
  complete(): NotificationErrors;
  stop(): void;
}

function notificationErrors(result: unknown): NotificationErrors {
  return Array.isArray(result) ? result : [];
}

function raiseNotificationErrors(errors: readonly unknown[]): void {
  if (errors.length === 1) {
    throw errors[0];
  }
  if (errors.length > 1) {
    throw new AggregateError(errors, "Flow subscriber callbacks failed");
  }
}

function createSubscription(teardown: () => void): FlowSubscription {
  let closed = false;
  const unsubscribe = (): void => {
    if (closed) {
      return;
    }

    closed = true;
    teardown();
  };

  return {
    get closed() {
      return closed;
    },
    unsubscribe,
    dispose: unsubscribe,
  };
}

function createQueuedObserver<T>(observer: FlowObserver<T>): QueuedObserver<T> {
  const queue: Array<() => unknown> = [];
  let stopped = false;
  let draining = false;

  const drain = (): NotificationErrors => {
    if (draining) {
      return [];
    }

    const errors: unknown[] = [];
    draining = true;
    try {
      while (!stopped && queue.length > 0) {
        try {
          errors.push(...notificationErrors(queue.shift()!()));
        } catch (error) {
          errors.push(error);
        }
      }
    } finally {
      draining = false;
    }
    return errors;
  };

  const enqueue = (action: () => unknown): NotificationErrors => {
    if (stopped) {
      return [];
    }

    queue.push(action);
    return drain();
  };

  return {
    next: (value) => enqueue(() => observer.next(value)),
    error: (error) =>
      enqueue(() => {
        stopped = true;
        observer.error(error);
      }),
    complete: () =>
      enqueue(() => {
        stopped = true;
        observer.complete();
      }),
    stop: () => {
      stopped = true;
      queue.length = 0;
    },
  };
}

export interface ManualSource<T> {
  readonly source: FlowSource<T>;
  emit(value: T): void;
  fail(error: unknown): void;
  complete(): void;
}

export function createManualSource<T>(): ManualSource<T> {
  const observers = new Set<QueuedObserver<T>>();
  let closed = false;

  const source: FlowSource<T> = {
    subscribe: (observer) => {
      const queuedObserver = createQueuedObserver(observer);
      if (closed) {
        raiseNotificationErrors(queuedObserver.complete());
        return createSubscription(() => queuedObserver.stop());
      }

      observers.add(queuedObserver);
      return createSubscription(() => {
        queuedObserver.stop();
        observers.delete(queuedObserver);
      });
    },
  };

  return {
    source,
    emit: (value) => {
      if (!closed) {
        const errors: unknown[] = [];
        for (const observer of [...observers]) {
          errors.push(...observer.next(value));
        }
        raiseNotificationErrors(errors);
      }
    },
    fail: (error) => {
      if (!closed) {
        closed = true;
        const errors: unknown[] = [];
        for (const observer of [...observers]) {
          errors.push(...observer.error(error));
        }
        observers.clear();
        raiseNotificationErrors(errors);
      }
    },
    complete: () => {
      if (!closed) {
        closed = true;
        const errors: unknown[] = [];
        for (const observer of [...observers]) {
          errors.push(...observer.complete());
        }
        observers.clear();
        raiseNotificationErrors(errors);
      }
    },
  };
}

export function map<T, U>(project: (value: T) => U): FlowOperator<T, U> {
  return (source) => ({
    subscribe: (observer) => {
      let active = true;
      let upstream: FlowSubscription | undefined;
      const terminate = (error: unknown): void => {
        if (!active) {
          return;
        }
        active = false;
        upstream?.unsubscribe();
        observer.error(error);
      };
      upstream = source.subscribe({
        next: (value) => {
          if (!active) {
            return;
          }
          let projected: U;
          try {
            projected = project(value);
          } catch (error) {
            terminate(error);
            return;
          }
          observer.next(projected);
        },
        error: terminate,
        complete: () => {
          if (active) {
            active = false;
            observer.complete();
          }
        },
      });
      return createSubscription(() => {
        active = false;
        upstream?.unsubscribe();
      });
    },
  });
}

export function filter<T>(predicate: (value: T) => boolean): FlowOperator<T, T> {
  return (source) => ({
    subscribe: (observer) => {
      let active = true;
      let upstream: FlowSubscription | undefined;
      const terminate = (error: unknown): void => {
        if (!active) {
          return;
        }
        active = false;
        upstream?.unsubscribe();
        observer.error(error);
      };
      upstream = source.subscribe({
        next: (value) => {
          if (!active) {
            return;
          }
          let accepted: boolean;
          try {
            accepted = predicate(value);
          } catch (error) {
            terminate(error);
            return;
          }
          if (accepted) {
            observer.next(value);
          }
        },
        error: terminate,
        complete: () => {
          if (active) {
            active = false;
            observer.complete();
          }
        },
      });
      return createSubscription(() => {
        active = false;
        upstream?.unsubscribe();
      });
    },
  });
}

export function distinct<T>(): FlowOperator<T, T>;
export function distinct<T>(same: (left: T, right: T) => boolean): FlowOperator<T, T>;
export function distinct<T>(same: (left: T, right: T) => boolean = Object.is): FlowOperator<T, T> {
  return (source) => ({
    subscribe: (observer) => {
      let hasPrevious = false;
      let previous!: T;
      let active = true;
      let upstream: FlowSubscription | undefined;
      const terminate = (error: unknown): void => {
        if (!active) {
          return;
        }
        active = false;
        upstream?.unsubscribe();
        observer.error(error);
      };
      upstream = source.subscribe({
        next: (value) => {
          if (!active) {
            return;
          }
          let changed = true;
          if (hasPrevious) {
            try {
              changed = !same(previous, value);
            } catch (error) {
              terminate(error);
              return;
            }
          }
          if (changed) {
            hasPrevious = true;
            previous = value;
          }
          if (changed) {
            observer.next(value);
          }
        },
        error: terminate,
        complete: () => {
          if (active) {
            active = false;
            observer.complete();
          }
        },
      });
      return createSubscription(() => {
        active = false;
        upstream?.unsubscribe();
      });
    },
  });
}

export function debounce<T>(delay: number, scheduler: TimerScheduler): FlowOperator<T, T> {
  return (source) => ({
    subscribe: (observer) => {
      let timerId: number | undefined;
      let latest!: T;
      let hasLatest = false;
      let closed = false;
      let upstream: FlowSubscription | undefined;
      const flush = (): void => {
        timerId = undefined;
        if (!closed && hasLatest) {
          hasLatest = false;
          void observer.next(latest);
        }
      };
      upstream = source.subscribe({
        next: (value) => {
          if (closed) {
            return;
          }
          latest = value;
          hasLatest = true;
          if (timerId !== undefined) {
            scheduler.clear(timerId);
          }
          timerId = scheduler.set(delay, flush);
        },
        error: (error) => {
          closed = true;
          if (timerId !== undefined) {
            scheduler.clear(timerId);
            timerId = undefined;
          }
          upstream?.unsubscribe();
          observer.error(error);
        },
        complete: () => {
          if (closed) {
            return;
          }
          if (timerId !== undefined) {
            scheduler.clear(timerId);
            timerId = undefined;
          }
          if (hasLatest) {
            hasLatest = false;
            observer.next(latest);
          }
          closed = true;
          observer.complete();
        },
      });

      return createSubscription(() => {
        closed = true;
        if (timerId !== undefined) {
          scheduler.clear(timerId);
        }
        upstream?.unsubscribe();
      });
    },
  });
}

export function fromAbortablePromise<T>(start: (signal: AbortSignal) => Promise<T>): FlowSource<T> {
  return {
    subscribe: (observer) => {
      const controller = new AbortController();
      let active = true;
      void start(controller.signal).then(
        (value) => {
          if (active && !controller.signal.aborted) {
            void observer.next(value);
            void observer.complete();
          }
        },
        (error: unknown) => {
          if (active && !controller.signal.aborted) {
            observer.error(error);
          }
        },
      );

      return createSubscription(() => {
        active = false;
        controller.abort();
      });
    },
  };
}

export function switchLatest<T, U>(project: (value: T) => FlowSource<U>): FlowOperator<T, U> {
  return (source) => ({
    subscribe: (observer) => {
      let current: FlowSubscription | undefined;
      let outerCompleted = false;
      let active = true;
      let outer: FlowSubscription | undefined;
      const terminate = (error: unknown): NotificationResult => {
        if (!active) {
          return [];
        }
        active = false;
        outer?.unsubscribe();
        current?.unsubscribe();
        return observer.error(error);
      };
      const maybeComplete = (): NotificationResult => {
        if (active && outerCompleted && (current === undefined || current.closed)) {
          active = false;
          return observer.complete();
        }
        return [];
      };
      outer = source.subscribe({
        next: (value) => {
          if (!active) {
            return;
          }
          current?.unsubscribe();
          let nextSource: FlowSource<U>;
          try {
            nextSource = project(value);
          } catch (error) {
            return terminate(error);
          }
          current = nextSource.subscribe({
            next: (result) => observer.next(result),
            error: terminate,
            complete: () => {
              current = undefined;
              maybeComplete();
            },
          });
        },
        error: terminate,
        complete: () => {
          outerCompleted = true;
          maybeComplete();
        },
      });

      return createSubscription(() => {
        active = false;
        current?.unsubscribe();
        outer.unsubscribe();
      });
    },
  });
}

export function catchError<T>(recover: (error: unknown) => FlowSource<T>): FlowOperator<T, T> {
  return (source) => ({
    subscribe: (observer) => {
      let recovery: FlowSubscription | undefined;
      const upstream = source.subscribe({
        next: (value) => observer.next(value),
        error: (error) => {
          try {
            recovery = recover(error).subscribe(observer);
          } catch (recoveryError) {
            return observer.error(recoveryError);
          }
          return [];
        },
        complete: () => observer.complete(),
      });

      return createSubscription(() => {
        upstream.unsubscribe();
        recovery?.unsubscribe();
      });
    },
  });
}

export function fromAsyncIterable<T>(iterable: AsyncIterable<T>): FlowSource<T> {
  return {
    subscribe: (observer) => {
      const iterator = iterable[Symbol.asyncIterator]();
      let active = true;
      const pump = async (): Promise<void> => {
        try {
          while (active) {
            const result = await iterator.next();
            if (!active) {
              return;
            }
            if (result.done) {
              observer.complete();
              return;
            }
            observer.next(result.value);
          }
        } catch (error) {
          if (active) {
            observer.error(error);
          }
        }
      };
      void pump();

      return createSubscription(() => {
        active = false;
        const returnMethod = iterator.return;
        if (returnMethod !== undefined) {
          void Promise.resolve(returnMethod.call(iterator)).catch(() => undefined);
        }
      });
    },
  };
}

export function fromReadableStream<T>(stream: ReadableStream<T>): FlowSource<T> {
  return {
    subscribe: (observer) => {
      const reader = stream.getReader();
      let active = true;
      const pump = async (): Promise<void> => {
        try {
          while (active) {
            const result = await reader.read();
            if (!active) {
              return;
            }
            if (result.done) {
              observer.complete();
              return;
            }
            observer.next(result.value);
          }
        } catch (error) {
          if (active) {
            observer.error(error);
          }
        }
      };
      void pump();

      return createSubscription(() => {
        active = false;
        void reader.cancel().catch(() => undefined);
      });
    },
  };
}

export function subscribeInScope<T>(
  scope: Pick<Scope, "use">,
  source: FlowSource<T>,
  observer: FlowObserver<T>,
): FlowSubscription {
  const subscription = source.subscribe(observer);
  scope.use(subscription);
  return subscription;
}

export function flow<T>(source: FlowSource<T>): FlowBuilder<T> {
  return new FlowBuilder(source);
}

export class FlowBuilder<T> {
  constructor(readonly source: FlowSource<T>) {}

  map<U>(project: (value: T) => U): FlowBuilder<U> {
    return new FlowBuilder(map(project)(this.source));
  }

  filter(predicate: (value: T) => boolean): FlowBuilder<T> {
    return new FlowBuilder(filter(predicate)(this.source));
  }

  distinct(same?: (left: T, right: T) => boolean): FlowBuilder<T> {
    const operator = same === undefined ? distinct<T>() : distinct(same);
    return new FlowBuilder(operator(this.source));
  }

  debounce(delay: number, scheduler: TimerScheduler): FlowBuilder<T> {
    return new FlowBuilder(debounce<T>(delay, scheduler)(this.source));
  }

  switchLatest<U>(project: (value: T) => FlowSource<U>): FlowBuilder<U> {
    return new FlowBuilder(switchLatest(project)(this.source));
  }

  catchError(recover: (error: unknown) => FlowSource<T>): FlowBuilder<T> {
    return new FlowBuilder(catchError(recover)(this.source));
  }

  subscribe(observer: FlowObserver<T>): FlowSubscription {
    return this.source.subscribe(observer);
  }
}
