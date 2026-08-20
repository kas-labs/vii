/* THROWAWAY RESEARCH BASELINE — direct Promise + AbortController implementation. */

import type { TimerScheduler } from "./flow-prototype.js";

export interface DirectTypeahead {
  query(value: string): void;
  dispose(): void;
}

export function createDirectTypeahead(
  scheduler: TimerScheduler,
  search: (query: string, signal: AbortSignal) => Promise<readonly string[]>,
  onResult: (result: readonly string[]) => void,
  onError: (error: unknown) => void,
): DirectTypeahead {
  let active = true;
  let timerId: number | undefined;
  let controller: AbortController | undefined;

  const startSearch = (query: string): void => {
    controller?.abort();
    const nextController = new AbortController();
    controller = nextController;
    void search(query, nextController.signal).then(
      (result) => {
        if (active && !nextController.signal.aborted) {
          onResult(result);
        }
      },
      (error: unknown) => {
        if (active && !nextController.signal.aborted) {
          onError(error);
        }
      },
    );
  };

  return {
    query: (value) => {
      if (!active) {
        return;
      }
      if (timerId !== undefined) {
        scheduler.clear(timerId);
      }
      timerId = scheduler.set(10, () => {
        timerId = undefined;
        startSearch(value);
      });
    },
    dispose: () => {
      if (!active) {
        return;
      }
      active = false;
      if (timerId !== undefined) {
        scheduler.clear(timerId);
      }
      controller?.abort();
    },
  };
}
