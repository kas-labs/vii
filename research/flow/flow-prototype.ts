/*
 * THROWAWAY RESEARCH PROTOTYPE — do not import from production packages.
 * It exists to compare Flow semantics against direct platform code and RxJS.
 */

import type { Scope } from "../../packages/core/src/index.js";

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
  next(value: T): void;
  error(error: unknown): void;
  complete(): void;
  stop(): void;
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
  const queue: Array<() => void> = [];
  let stopped = false;
  let draining = false;

  const drain = (): void => {
    if (draining) {
      return;
    }

    draining = true;
    try {
      while (!stopped && queue.length > 0) {
        queue.shift()!();
      }
    } finally {
      draining = false;
    }
  };

  const enqueue = (action: () => void): void => {
    if (stopped) {
      return;
    }

    queue.push(action);
    drain();
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
        queuedObserver.complete();
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
        for (const observer of [...observers]) {
          observer.next(value);
        }
      }
    },
    fail: (error) => {
      if (!closed) {
        closed = true;
        for (const observer of [...observers]) {
          observer.error(error);
        }
        observers.clear();
      }
    },
    complete: () => {
      if (!closed) {
        closed = true;
        for (const observer of [...observers]) {
          observer.complete();
        }
        observers.clear();
      }
    },
  };
}

export function map<T, U>(project: (value: T) => U): FlowOperator<T, U> {
  return (source) => ({
    subscribe: (observer) =>
      source.subscribe({
        next: (value) => observer.next(project(value)),
        error: (error) => observer.error(error),
        complete: () => observer.complete(),
      }),
  });
}

export function filter<T>(predicate: (value: T) => boolean): FlowOperator<T, T> {
  return (source) => ({
    subscribe: (observer) =>
      source.subscribe({
        next: (value) => {
          if (predicate(value)) {
            observer.next(value);
          }
        },
        error: (error) => observer.error(error),
        complete: () => observer.complete(),
      }),
  });
}

export function distinct<T>(): FlowOperator<T, T>;
export function distinct<T>(same: (left: T, right: T) => boolean): FlowOperator<T, T>;
export function distinct<T>(same: (left: T, right: T) => boolean = Object.is): FlowOperator<T, T> {
  return (source) => ({
    subscribe: (observer) => {
      let hasPrevious = false;
      let previous!: T;
      return source.subscribe({
        next: (value) => {
          if (!hasPrevious || !same(previous, value)) {
            hasPrevious = true;
            previous = value;
            observer.next(value);
          }
        },
        error: (error) => observer.error(error),
        complete: () => observer.complete(),
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
          observer.next(latest);
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
            observer.next(value);
            observer.complete();
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
      const terminate = (error: unknown): void => {
        if (!active) {
          return;
        }
        active = false;
        outer?.unsubscribe();
        current?.unsubscribe();
        observer.error(error);
      };
      const maybeComplete = (): void => {
        if (active && outerCompleted && (current === undefined || current.closed)) {
          active = false;
          observer.complete();
        }
      };
      outer = source.subscribe({
        next: (value) => {
          if (!active) {
            return;
          }
          current?.unsubscribe();
          current = project(value).subscribe({
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
          recovery = recover(error).subscribe(observer);
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
