import { describe, expect, it, vi } from "vitest";
import { createScope } from "../../packages/core/src/index.js";
import { type QueryKey } from "./query-key.js";
import { ResearchQueryClient } from "./query-client-prototype.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("P5.3 Cancellation, Freshness, Invalidation & GC Prototype", () => {
  describe("AbortSignal-native cancellation (abort != error)", () => {
    it("preserves valid cached data when an in-flight background refetch is aborted", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["profile", 101];

      // Initial successful fetch
      await client.fetchQuery(key, async () => {
        return { name: "Alice", role: "Engineer" };
      });

      const initialSnap = client.getQueryState(key);
      expect(initialSnap?.status).toBe("success");
      expect(initialSnap?.data).toEqual({ name: "Alice", role: "Engineer" });

      // Start background refetch
      let aborted = false;
      const refetchPromise = client.fetchQuery(
        key,
        async ({ signal }) => {
          signal.addEventListener("abort", () => {
            aborted = true;
          });
          await delay(50);
          return { name: "Alice", role: "Senior Engineer" };
        },
        { supersede: true },
      );

      expect(client.getQueryState(key)?.fetchStatus).toBe("fetching");

      // Cancel the in-flight refetch
      client.cancelQueries({ key });

      try {
        await refetchPromise;
      } catch {
        // Expected cancellation
      }

      expect(aborted).toBe(true);

      const afterCancelSnap = client.getQueryState(key);
      expect(afterCancelSnap?.status).toBe("success");
      expect(afterCancelSnap?.fetchStatus).toBe("idle");
      expect(afterCancelSnap?.data).toEqual({ name: "Alice", role: "Engineer" });
      expect(afterCancelSnap?.error).toBeUndefined();
    });

    it("triggers abort signal when a request is superseded", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["search", "query"];
      const record = client.getRecord(key);

      let firstAborted = false;
      record.fetch(async ({ signal }) => {
        signal.addEventListener("abort", () => {
          firstAborted = true;
        });
        await delay(50);
        return "first";
      });

      await delay(5);
      expect(firstAborted).toBe(false);

      // Start superseding fetch
      record.fetch(
        async () => {
          return "second";
        },
        { supersede: true },
      );

      expect(firstAborted).toBe(true);
    });
  });

  describe("Freshness, staleTime, and Invalidation", () => {
    it("calculates freshness based on staleTime and marks stale upon invalidation", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["config", "flags"];

      await client.fetchQuery(key, async () => ({ featureX: true }));

      // Fresh with large staleTime
      expect(client.isStale(key, 60_000)).toBe(false);

      // Stale with 0 staleTime
      expect(client.isStale(key, 0)).toBe(true);

      // Invalidation marks stale without deleting data
      client.invalidateQueries({ key });
      expect(client.isStale(key, 60_000)).toBe(true);

      // Data is still present in cache (invalidate != remove)
      expect(client.getQueryData(key)).toEqual({ featureX: true });
    });

    it("invalidates key families structurally without touching unrelated keys", async () => {
      const client = new ResearchQueryClient();

      await client.fetchQuery(["todos"], async () => ["all"]);
      await client.fetchQuery(["todos", 1], async () => ({ id: 1 }));
      await client.fetchQuery(["todos", 2], async () => ({ id: 2 }));
      await client.fetchQuery(["users", 1], async () => ({ id: 1 }));

      // Invalidate the 'todos' family
      client.invalidateQueries({ key: ["todos"] });

      expect(client.isStale(["todos"], 60_000)).toBe(true);
      expect(client.isStale(["todos", 1], 60_000)).toBe(true);
      expect(client.isStale(["todos", 2], 60_000)).toBe(true);

      // Unrelated user key remains fresh
      expect(client.isStale(["users", 1], 60_000)).toBe(false);
    });
  });

  describe("Inactive Retention and Garbage Collection (gcTime)", () => {
    it("never collects active queries with active observers", async () => {
      vi.useFakeTimers();
      try {
        const client = new ResearchQueryClient({ defaultGcTime: 100 });
        const key: QueryKey = ["active", "dataset"];

        const observer = client.observeQuery(key);
        client.setQueryData(key, "data");

        expect(client.hasRecord(key)).toBe(true);

        // Advance past gcTime
        vi.advanceTimersByTime(500);

        // Query remains active and present
        expect(client.hasRecord(key)).toBe(true);
        expect(client.getQueryData(key)).toBe("data");

        observer.dispose();
      } finally {
        vi.useRealTimers();
      }
    });

    it("evicts inactive queries from cache after gcTime expires", async () => {
      vi.useFakeTimers();
      try {
        const client = new ResearchQueryClient({ defaultGcTime: 100 });
        const key: QueryKey = ["temp", "item"];

        const observer = client.observeQuery(key);
        client.setQueryData(key, "temp-val");

        expect(client.hasRecord(key)).toBe(true);

        // Observer disposes -> query becomes inactive
        observer.dispose();
        expect(client.getRecord(key).hasPendingGc).toBe(true);

        // Advance past gcTime
        vi.advanceTimersByTime(150);

        // Query is evicted
        expect(client.hasRecord(key)).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it("cancels pending GC when a new observer attaches before gcTime expires", async () => {
      vi.useFakeTimers();
      try {
        const client = new ResearchQueryClient({ defaultGcTime: 100 });
        const key: QueryKey = ["shared", "cached"];

        const obs1 = client.observeQuery(key);
        client.setQueryData(key, "cached-val");

        obs1.dispose();
        expect(client.getRecord(key).hasPendingGc).toBe(true);

        // Advance halfway through GC window
        vi.advanceTimersByTime(50);

        // New observer joins
        const obs2 = client.observeQuery(key);
        expect(client.getRecord(key).hasPendingGc).toBe(false);

        // Advance past original GC window
        vi.advanceTimersByTime(100);

        // Query was NOT evicted
        expect(client.hasRecord(key)).toBe(true);
        expect(client.getQueryData(key)).toBe("cached-val");

        obs2.dispose();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("Vii Core Scope Lifecycle Integration", () => {
    it("disposes query observers when owning Scope is disposed", () => {
      const client = new ResearchQueryClient({ defaultGcTime: 200 });
      const key: QueryKey = ["scoped", "query"];
      const scope = createScope();

      const observer = client.observeQuery(key);
      scope.use(observer);

      expect(observer.isDisposed).toBe(false);
      expect(client.getRecord(key).observerCount).toBe(1);

      // Disposing scope disposes all attached resources
      scope.dispose();

      expect(observer.isDisposed).toBe(true);
      expect(client.getRecord(key).observerCount).toBe(0);
      expect(client.getRecord(key).hasPendingGc).toBe(true);

      client.clear();
    });
  });

  describe("Rapid Key Switching and Cancellation", () => {
    it("aborts prior fetches on rapid key switching and populates only final key", async () => {
      const client = new ResearchQueryClient();
      const abortedKeys: string[] = [];

      const fetchTab = (tabId: string) => {
        return client.fetchQuery(
          ["tab", tabId],
          async ({ signal }) => {
            signal.addEventListener("abort", () => {
              abortedKeys.push(tabId);
            });
            await delay(30);
            return `Content for ${tabId}`;
          },
          { supersede: true },
        );
      };

      const p1 = fetchTab("A");
      client.cancelQueries({ key: ["tab", "A"] });

      const p2 = fetchTab("B");
      client.cancelQueries({ key: ["tab", "B"] });

      const p3 = fetchTab("C");

      await Promise.allSettled([p1, p2, p3]);

      expect(abortedKeys).toContain("A");
      expect(abortedKeys).toContain("B");
      expect(client.getQueryData(["tab", "C"])).toBe("Content for C");
    });
  });
});
