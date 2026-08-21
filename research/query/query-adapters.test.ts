import { describe, expect, it, vi } from "vitest";
import { type QueryKey } from "./query-key.js";
import { ResearchQueryClient } from "./query-client-prototype.js";
import { type QuerySnapshot } from "./query-record.js";
import {
  createReactQueryStore,
  createReactMutationStore,
  createAngularQuerySignal,
  createAngularMutationSignal,
  createVueQueryRef,
  createVueMutationRef,
} from "./query-adapters.js";

interface FrameworkQueryFixture<T> {
  readonly name: string;
  create(
    client: ResearchQueryClient,
    key: QueryKey,
  ): {
    read(): QuerySnapshot<T>;
    dispose(): void;
  };
}

describe("P5.7 Framework Integration Fixtures Prototype", () => {
  const frameworks: FrameworkQueryFixture<unknown>[] = [
    {
      name: "React (useSyncExternalStore)",
      create: (client, key) => {
        const store = createReactQueryStore(client, key);
        return {
          read: () => store.getSnapshot(),
          dispose: () => store.dispose(),
        };
      },
    },
    {
      name: "Angular (Signal)",
      create: (client, key) => {
        const handle = createAngularQuerySignal(client, key);
        return {
          read: () => handle.signal(),
          dispose: () => handle.dispose(),
        };
      },
    },
    {
      name: "Vue (ShallowRef)",
      create: (client, key) => {
        const handle = createVueQueryRef(client, key);
        return {
          read: () => handle.ref.value,
          dispose: () => handle.dispose(),
        };
      },
    },
  ];

  describe.each(frameworks)("Shared Query Compliance: $name", ({ create }) => {
    it("reads initial empty state correctly", () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["items", 1];
      const fixture = create(client, key);

      const snap = fixture.read();
      expect(snap.status).toBe("empty");
      expect(snap.fetchStatus).toBe("idle");
      expect(snap.data).toBeUndefined();

      fixture.dispose();
      client.dispose();
    });

    it("reactively updates state upon successful query fetch", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["items", 2];
      const fixture = create(client, key);

      expect(fixture.read().status).toBe("empty");

      await client.fetchQuery(key, async () => ({ id: 2, title: "Item 2" }));

      const snap = fixture.read();
      expect(snap.status).toBe("success");
      expect(snap.fetchStatus).toBe("idle");
      expect(snap.data).toEqual({ id: 2, title: "Item 2" });
      expect(snap.dataUpdatedAt).toBeGreaterThan(0);

      fixture.dispose();
      client.dispose();
    });

    it("reactively updates state on query invalidation", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["items", 3];
      const fixture = create(client, key);

      await client.fetchQuery(key, async () => "initial");
      expect(fixture.read().isInvalidated).toBe(false);

      client.invalidateQueries({ key });

      expect(fixture.read().isInvalidated).toBe(true);

      fixture.dispose();
      client.dispose();
    });

    it("reactively reflects cancellation without destroying valid cached data", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["items", 4];
      const fixture = create(client, key);

      await client.fetchQuery(key, async () => "cached-value");

      const backgroundFetch = client.fetchQuery(
        key,
        async ({ signal }) => {
          await new Promise<void>((_, reject) => {
            signal.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          });
          return "new-value";
        },
        { supersede: true },
      );

      client.cancelQueries({ key });
      await expect(backgroundFetch).rejects.toThrow();

      const snap = fixture.read();
      expect(snap.status).toBe("success");
      expect(snap.fetchStatus).toBe("idle");
      expect(snap.data).toBe("cached-value");

      fixture.dispose();
      client.dispose();
    });

    it("schedules GC upon adapter unmount / disposal while preserving active queries", () => {
      vi.useFakeTimers();
      try {
        const client = new ResearchQueryClient({ defaultGcTime: 100 });
        const key: QueryKey = ["items", 5];
        const fixture = create(client, key);

        client.setQueryData(key, "keep-alive");
        expect(client.size).toBe(1);

        // Active observer prevents GC
        vi.advanceTimersByTime(200);
        expect(client.hasRecord(key)).toBe(true);

        // Adapter unmount / dispose triggers GC timer
        fixture.dispose();
        expect(client.hasRecord(key)).toBe(true);

        // Advancing time past gcTime evicts the inactive query
        vi.advanceTimersByTime(150);
        expect(client.hasRecord(key)).toBe(false);

        client.dispose();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("Mutation Framework Adapters", () => {
    it("handles React mutation lifecycle and state binding", async () => {
      const client = new ResearchQueryClient();
      const mutation = client.createMutation({
        mutationFn: async (val: string) => `echo:${val}`,
      });
      const store = createReactMutationStore(mutation);

      expect(store.getSnapshot().status).toBe("idle");

      const promise = mutation.mutate("hello");
      expect(store.getSnapshot().status).toBe("pending");

      const res = await promise;
      expect(res).toBe("echo:hello");
      expect(store.getSnapshot().status).toBe("success");
      expect(store.getSnapshot().data).toBe("echo:hello");

      store.dispose();
      client.dispose();
    });

    it("handles Angular mutation lifecycle and signal binding", async () => {
      const client = new ResearchQueryClient();
      const mutation = client.createMutation({
        mutationFn: async (val: number) => val * 2,
      });
      const handle = createAngularMutationSignal(mutation);

      expect(handle.signal().status).toBe("idle");

      const res = await mutation.mutate(21);
      expect(res).toBe(42);
      expect(handle.signal().status).toBe("success");
      expect(handle.signal().data).toBe(42);

      handle.dispose();
      client.dispose();
    });

    it("handles Vue mutation lifecycle and ref binding", async () => {
      const client = new ResearchQueryClient();
      const mutation = client.createMutation({
        mutationFn: async () => {
          throw new Error("Failed to save");
        },
      });
      const handle = createVueMutationRef(mutation);

      expect(handle.ref.value.status).toBe("idle");

      await expect(mutation.mutate(undefined)).rejects.toThrow("Failed to save");
      expect(handle.ref.value.status).toBe("error");

      handle.dispose();
      client.dispose();
    });
  });

  describe("Core Decoupling & Isolation", () => {
    it("proves Query Core functions identically without any framework adapter", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["core", "standalone"];

      await client.fetchQuery(key, async () => ({ decoupled: true }));
      expect(client.getQueryData(key)).toEqual({ decoupled: true });
      expect(client.getQueryState(key)?.status).toBe("success");

      client.dispose();
    });
  });
});
