/* THROWAWAY RESEARCH SUPPORT — deterministic clocks and abortable fake search. */

import type { TimerScheduler } from "./flow-prototype.js";

interface Timer {
  id: number;
  due: number;
  callback: () => void;
  active: boolean;
}

export class FakeClock implements TimerScheduler {
  private currentTime = 0;
  private nextId = 1;
  private readonly timers: Timer[] = [];

  set(delay: number, callback: () => void): number {
    const timer = { id: this.nextId++, due: this.currentTime + delay, callback, active: true };
    this.timers.push(timer);
    return timer.id;
  }

  clear(timerId: number): void {
    const timer = this.timers.find((candidate) => candidate.id === timerId);
    if (timer !== undefined) {
      timer.active = false;
    }
  }

  get pendingCount(): number {
    return this.timers.filter((timer) => timer.active).length;
  }

  advanceBy(duration: number): void {
    const target = this.currentTime + duration;
    while (true) {
      const next = this.timers
        .filter((timer) => timer.active && timer.due <= target)
        .sort((left, right) => left.due - right.due || left.id - right.id)[0];
      if (next === undefined) {
        break;
      }
      next.active = false;
      this.currentTime = next.due;
      next.callback();
    }
    this.currentTime = target;
  }
}

export interface PendingSearch {
  readonly search: (query: string, signal: AbortSignal) => Promise<readonly string[]>;
  readonly abortedQueries: string[];
  resolve(query: string, result: readonly string[]): void;
}

export function createPendingSearch(): PendingSearch {
  const resolvers = new Map<string, Array<(result: readonly string[]) => void>>();
  const abortedQueries: string[] = [];

  return {
    search: (query, signal) =>
      new Promise((resolve) => {
        const queryResolvers = resolvers.get(query) ?? [];
        queryResolvers.push(resolve);
        resolvers.set(query, queryResolvers);
        signal.addEventListener(
          "abort",
          () => {
            abortedQueries.push(query);
          },
          { once: true },
        );
      }),
    abortedQueries,
    resolve: (query, result) => {
      for (const resolve of resolvers.get(query) ?? []) {
        resolve(result);
      }
      resolvers.delete(query);
    },
  };
}

export function flushMicrotasks(): Promise<void> {
  return Promise.resolve().then(() => undefined);
}
