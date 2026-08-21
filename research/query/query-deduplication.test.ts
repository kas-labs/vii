import { describe, expect, it } from "vitest";
import { type QueryKey } from "./query-key.js";
import { type QuerySnapshot } from "./query-record.js";
import { ResearchQueryClient } from "./query-client-prototype.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("P5.2 QueryClient, Observer, Deduplication & Generation Prototype", () => {
  describe("One observer / one request lifecycle", () => {
    it("transitions through empty, fetching, and success states", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["todos", 1];
      const snapshots: QuerySnapshot<string>[] = [];

      const observer = client.observeQuery<string>(key, (snap) => {
        snapshots.push(snap);
      });

      expect(observer.getSnapshot().status).toBe("empty");
      expect(observer.getSnapshot().fetchStatus).toBe("idle");
      expect(observer.getSnapshot().observerCount).toBe(1);

      const promise = client.fetchQuery(key, async () => {
        await delay(10);
        return "Clean code";
      });

      expect(observer.getSnapshot().fetchStatus).toBe("fetching");

      const result = await promise;
      expect(result).toBe("Clean code");

      const finalSnap = observer.getSnapshot();
      expect(finalSnap.status).toBe("success");
      expect(finalSnap.fetchStatus).toBe("idle");
      expect(finalSnap.data).toBe("Clean code");
      expect(finalSnap.dataUpdatedAt).toBeGreaterThan(0);
      expect(snapshots.length).toBeGreaterThanOrEqual(2);

      observer.dispose();
    });
  });

  describe("Ten observers / one request deduplication", () => {
    it("deduplicates concurrent fetches for the same key to a single execution", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["shared", "resource"];
      let fetchCount = 0;

      const queryFn = async () => {
        fetchCount += 1;
        await delay(25);
        return { version: 1 };
      };

      const observers = Array.from({ length: 10 }, () =>
        client.observeQuery<{ version: number }>(key),
      );

      expect(observers[0]?.getSnapshot().observerCount).toBe(10);

      // Launch 10 concurrent fetches
      const results = await Promise.all(
        Array.from({ length: 10 }, () => client.fetchQuery(key, queryFn)),
      );

      expect(fetchCount).toBe(1);
      for (const res of results) {
        expect(res).toEqual({ version: 1 });
      }

      for (const obs of observers) {
        expect(obs.getSnapshot().data).toEqual({ version: 1 });
        expect(obs.getSnapshot().status).toBe("success");
        obs.dispose();
      }
    });
  });

  describe("Mid-flight observer join", () => {
    it("allows a late observer to join an in-flight fetch without re-triggering", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["dataset", "stream"];
      let fetchCount = 0;

      const fetchPromise1 = client.fetchQuery(key, async () => {
        fetchCount += 1;
        await delay(30);
        return "data-loaded";
      });

      await delay(10);

      // Observer 2 joins mid-flight
      const obs2 = client.observeQuery<string>(key);
      expect(obs2.getSnapshot().fetchStatus).toBe("fetching");

      const fetchPromise2 = client.fetchQuery(key, async () => {
        fetchCount += 1;
        return "redundant";
      });

      const [res1, res2] = await Promise.all([fetchPromise1, fetchPromise2]);

      expect(fetchCount).toBe(1);
      expect(res1).toBe("data-loaded");
      expect(res2).toBe("data-loaded");
      expect(obs2.getSnapshot().data).toBe("data-loaded");

      obs2.dispose();
    });
  });

  describe("Observer disposal isolation", () => {
    it("disposing an observer does not abort or corrupt remaining active observers", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["tasks", "list"];

      const obs1Events: string[] = [];
      const obs2Events: string[] = [];

      const obs1 = client.observeQuery<string>(key, (s) => {
        if (s.data) obs1Events.push(s.data);
      });
      const obs2 = client.observeQuery<string>(key, (s) => {
        if (s.data) obs2Events.push(s.data);
      });

      const fetchPromise = client.fetchQuery(key, async () => {
        await delay(20);
        return "tasks-v1";
      });

      // Dispose obs1 while fetch is in-flight
      obs1.dispose();
      expect(obs1.isDisposed).toBe(true);
      expect(obs2.isDisposed).toBe(false);

      await fetchPromise;

      expect(obs1Events).toEqual([]);
      expect(obs2Events).toEqual(["tasks-v1"]);
      expect(obs2.getSnapshot().data).toBe("tasks-v1");

      obs2.dispose();
    });
  });

  describe("Execution generations and stale completion rejection", () => {
    it("rejects late completions from superseded executions", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["feed", "latest"];
      const record = client.getRecord<string>(key);

      // Start slow request #1 (takes 60ms, returns "stale-v1")
      const slowPromise = record.fetch(async () => {
        await delay(60);
        return "stale-v1";
      });

      // Allow request #1 to initialize
      await delay(5);
      expect(record.getSnapshot().generation).toBe(1);

      // Start faster superseding request #2 (takes 10ms, returns "fresh-v2")
      const fastPromise = record.fetch(
        async () => {
          await delay(10);
          return "fresh-v2";
        },
        { supersede: true },
      );
      expect(record.getSnapshot().generation).toBe(2);

      // Fast request resolves first
      const fastResult = await fastPromise;
      expect(fastResult).toBe("fresh-v2");
      expect(record.getSnapshot().data).toBe("fresh-v2");
      expect(record.getSnapshot().generation).toBe(2);

      // Slow request completes later
      const slowResult = await slowPromise;
      expect(slowResult).toBe("stale-v1"); // caller receives its return value

      // Critical assertion: cache snapshot was NOT overwritten by stale v1
      expect(record.getSnapshot().data).toBe("fresh-v2");
      expect(record.getSnapshot().generation).toBe(2);
      expect(record.getSnapshot().status).toBe("success");
    });
  });

  describe("QueryClient isolation (SSR Request Scope safety)", () => {
    it("ensures separate QueryClients never share cache or deduplicate fetches", async () => {
      const clientA = new ResearchQueryClient();
      const clientB = new ResearchQueryClient();
      const key: QueryKey = ["user", 42];

      let clientAFetchCount = 0;
      let clientBFetchCount = 0;

      const [resA, resB] = await Promise.all([
        clientA.fetchQuery(key, async () => {
          clientAFetchCount += 1;
          await delay(15);
          return "User-A";
        }),
        clientB.fetchQuery(key, async () => {
          clientBFetchCount += 1;
          await delay(15);
          return "User-B";
        }),
      ]);

      expect(clientAFetchCount).toBe(1);
      expect(clientBFetchCount).toBe(1);
      expect(resA).toBe("User-A");
      expect(resB).toBe("User-B");

      expect(clientA.getQueryData(key)).toBe("User-A");
      expect(clientB.getQueryData(key)).toBe("User-B");

      clientA.dispose();
      expect(clientA.isDisposed).toBe(true);
      expect(clientB.isDisposed).toBe(false);
      expect(clientB.getQueryData(key)).toBe("User-B");

      clientB.dispose();
    });
  });

  describe("Observer lifecycle and memory leak prevention", () => {
    it("cleans up observer references upon disposal without leaking listeners", () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["probe", "lifecycle"];
      const record = client.getRecord(key);

      expect(record.observerCount).toBe(0);

      // Repeatedly subscribe and dispose 500 observers
      for (let i = 0; i < 500; i++) {
        const obs = client.observeQuery(key);
        expect(record.observerCount).toBe(1);
        obs.dispose();
        expect(record.observerCount).toBe(0);
      }

      expect(record.observerCount).toBe(0);
      expect(record.getSnapshot().observerCount).toBe(0);
    });
  });
});
