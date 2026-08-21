import { describe, expect, test } from "vitest";
import { flushMicrotasks } from "./test-support.js";

type CleanupBoundary = "async-iterable.return" | "readable-stream.cancel";

interface CancellationCleanupEvent {
  readonly boundary: CleanupBoundary;
  readonly category: "cancellation-cleanup-rejection";
}

interface ObservedDisposal {
  readonly closed: boolean;
  dispose(): void;
}

function observeDisposalCleanup(
  boundary: CleanupBoundary,
  cleanup: () => void | PromiseLike<unknown>,
  report: (event: CancellationCleanupEvent) => void,
  timeline: string[],
): ObservedDisposal {
  let closed = false;

  return {
    get closed() {
      return closed;
    },
    dispose: () => {
      if (closed) {
        return;
      }
      closed = true;
      timeline.push("cleanup.started");
      try {
        void Promise.resolve(cleanup()).catch(() => {
          report({ boundary, category: "cancellation-cleanup-rejection" });
        });
      } catch {
        queueMicrotask(() => report({ boundary, category: "cancellation-cleanup-rejection" }));
      }
    },
  };
}

describe("Flow cancellation rejection surfacing research", () => {
  test("AsyncIterable return rejection is structurally observable after synchronous disposal", async () => {
    let returnCalls = 0;
    const timeline: string[] = [];
    const events: CancellationCleanupEvent[] = [];
    const iterator: AsyncIterator<number> = {
      next: () => Promise.resolve({ done: true, value: undefined }),
      return: () => {
        returnCalls += 1;
        return Promise.reject(new Error("cleanup failed"));
      },
    };
    const subscription = observeDisposalCleanup(
      "async-iterable.return",
      () => iterator.return!(),
      (event) => {
        events.push(event);
        timeline.push("cleanup.rejected");
      },
      timeline,
    );

    const disposalResult = subscription.dispose();
    timeline.push("dispose.returned");

    expect(disposalResult).toBeUndefined();
    expect(subscription.closed).toBe(true);
    expect(returnCalls).toBe(1);
    expect(events).toEqual([]);
    expect(timeline).toEqual(["cleanup.started", "dispose.returned"]);

    await flushMicrotasks();

    expect(events).toEqual([
      { boundary: "async-iterable.return", category: "cancellation-cleanup-rejection" },
    ]);
    expect(timeline).toEqual(["cleanup.started", "dispose.returned", "cleanup.rejected"]);
  });

  test("ReadableStream cancel rejection uses the same structural category", async () => {
    let cancelCalls = 0;
    const timeline: string[] = [];
    const events: CancellationCleanupEvent[] = [];
    const stream = new ReadableStream<number>({
      cancel: () => {
        cancelCalls += 1;
        return Promise.reject(new Error("stream cleanup failed"));
      },
    });
    const reader = stream.getReader();
    const subscription = observeDisposalCleanup(
      "readable-stream.cancel",
      () => reader.cancel(),
      (event) => {
        events.push(event);
        timeline.push("cleanup.rejected");
      },
      timeline,
    );

    subscription.dispose();
    timeline.push("dispose.returned");
    subscription.dispose();
    await flushMicrotasks();
    await flushMicrotasks();

    expect(subscription.closed).toBe(true);
    expect(cancelCalls).toBe(1);
    expect(events).toEqual([
      { boundary: "readable-stream.cancel", category: "cancellation-cleanup-rejection" },
    ]);
    expect(timeline).toEqual(["cleanup.started", "dispose.returned", "cleanup.rejected"]);
  });

  test("synchronous cleanup throw is observed without becoming a source error", async () => {
    const events: CancellationCleanupEvent[] = [];
    const timeline: string[] = [];
    const subscription = observeDisposalCleanup(
      "async-iterable.return",
      () => {
        throw new Error("synchronous cleanup failure");
      },
      (event) => {
        events.push(event);
        timeline.push("cleanup.rejected");
      },
      timeline,
    );

    expect(() => subscription.dispose()).not.toThrow();
    timeline.push("dispose.returned");
    await flushMicrotasks();

    expect(events).toEqual([
      { boundary: "async-iterable.return", category: "cancellation-cleanup-rejection" },
    ]);
    expect(timeline).toEqual(["cleanup.started", "dispose.returned", "cleanup.rejected"]);
  });
});
