import { describe, expect, it } from "vitest";
import { createScope } from "../../packages/core/src/index.js";
import { type QueryKey } from "./query-key.js";
import { ResearchQueryClient } from "./query-client-prototype.js";
import {
  dehydrate,
  hydrate,
  HydrationValidationError,
  type QueryHydrationEnvelope,
} from "./query-hydration.js";

describe("P5.5 SSR Request Scope & Hydration Prototype", () => {
  describe("SSR Request Scope Isolation", () => {
    it("proves Request A data is never visible to Request B", async () => {
      const handleRequestA = async () => {
        const clientA = new ResearchQueryClient();
        await clientA.fetchQuery(["user", "current"], async () => ({
          id: 1,
          name: "Alice",
        }));
        return clientA;
      };

      const handleRequestB = async () => {
        const clientB = new ResearchQueryClient();
        return clientB;
      };

      const clientA = await handleRequestA();
      const clientB = await handleRequestB();

      expect(clientA.getQueryData(["user", "current"])).toEqual({
        id: 1,
        name: "Alice",
      });
      expect(clientB.getQueryData(["user", "current"])).toBeUndefined();
      expect(clientB.hasRecord(["user", "current"])).toBe(false);

      clientA.dispose();
      clientB.dispose();
    });

    it("cleans up all records synchronously on Scope disposal", () => {
      const scope = createScope();
      const client = new ResearchQueryClient();
      scope.use({ dispose: () => client.dispose() });

      client.setQueryData(["temp"], { val: 123 });
      expect(client.size).toBe(1);

      scope.dispose();

      expect(client.isDisposed).toBe(true);
      expect(client.size).toBe(0);
      expect(() => client.getRecord(["temp"])).toThrow(
        "Cannot access records on a disposed QueryClient",
      );
    });
  });

  describe("Server Prefetch & Dehydration", () => {
    it("prefetches queries and dehydrates into a versioned envelope", async () => {
      const serverClient = new ResearchQueryClient();

      await serverClient.prefetchQuery(["posts", "featured"], async () => [
        { id: 10, title: "Featured Post" },
      ]);
      await serverClient.prefetchQuery(["site", "config"], async () => ({
        theme: "dark",
      }));

      const envelope = dehydrate(serverClient);

      expect(envelope.protocol).toBe("vii.query");
      expect(envelope.version).toBe(1);
      expect(envelope.queries).toHaveLength(2);

      const postEntry = envelope.queries.find(
        (q) => JSON.stringify(q.key) === JSON.stringify(["posts", "featured"]),
      );
      expect(postEntry?.data).toEqual([{ id: 10, title: "Featured Post" }]);
      expect(typeof postEntry?.dataUpdatedAt).toBe("number");
      expect(postEntry?.dataUpdatedAt).toBeGreaterThan(0);
    });

    it("filters out unpopulated or failing queries during dehydration", async () => {
      const serverClient = new ResearchQueryClient();

      // Successful query
      await serverClient.fetchQuery(["success"], async () => "ok");

      // Failing query
      try {
        await serverClient.fetchQuery(["failed"], async () => {
          throw new Error("boom");
        });
      } catch {
        // Expected
      }

      const envelope = dehydrate(serverClient);
      expect(envelope.queries).toHaveLength(1);
      expect(envelope.queries[0]?.key).toEqual(["success"]);
    });
  });

  describe("Client Hydration & Timestamp Preservation", () => {
    it("hydrates client cache while preserving original server dataUpdatedAt", () => {
      const serverTime = Date.now() - 5000; // 5 seconds ago
      const envelope: QueryHydrationEnvelope = {
        protocol: "vii.query",
        version: 1,
        queries: [
          {
            key: ["profile", 42],
            data: { username: "octocat" },
            dataUpdatedAt: serverTime,
          },
        ],
      };

      const client = new ResearchQueryClient();
      const { hydratedCount } = hydrate(client, envelope);

      expect(hydratedCount).toBe(1);
      expect(client.getQueryData(["profile", 42])).toEqual({ username: "octocat" });

      const snap = client.getQueryState(["profile", 42]);
      expect(snap?.status).toBe("success");
      expect(snap?.dataUpdatedAt).toBe(serverTime);

      // Freshness is calculated against the original server fetch time (5000ms ago)
      expect(client.isStale(["profile", 42], 10_000)).toBe(false); // 10s staleTime -> fresh
      expect(client.isStale(["profile", 42], 4_000)).toBe(true); // 4s staleTime -> stale!
    });
  });

  describe("Hydration Security & Validation Boundary", () => {
    it("rejects unsupported protocols and versions", () => {
      const client = new ResearchQueryClient();

      expect(() =>
        hydrate(client, { protocol: "other.query", version: 1, queries: [] }),
      ).toThrowError(HydrationValidationError);

      expect(() =>
        hydrate(client, { protocol: "vii.query", version: 2, queries: [] }),
      ).toThrowError(HydrationValidationError);
    });

    it("rejects malformed and non-object envelope structures", () => {
      const client = new ResearchQueryClient();

      expect(() => hydrate(client, null)).toThrowError(HydrationValidationError);
      expect(() => hydrate(client, "string")).toThrowError(HydrationValidationError);
      expect(() => hydrate(client, [1, 2, 3])).toThrowError(HydrationValidationError);
      expect(() =>
        hydrate(client, { protocol: "vii.query", version: 1, queries: "invalid" }),
      ).toThrowError(HydrationValidationError);
    });

    it("rejects prototype pollution attempts in QueryKeys", () => {
      const client = new ResearchQueryClient();
      const maliciousPayload = {
        protocol: "vii.query",
        version: 1,
        queries: [
          {
            key: JSON.parse('{"__proto__": {"polluted": true}}'),
            data: "malicious",
            dataUpdatedAt: Date.now(),
          },
        ],
      };

      expect(() => hydrate(client, maliciousPayload)).toThrowError(HydrationValidationError);
    });

    it("rejects invalid QueryKey types and values", () => {
      const client = new ResearchQueryClient();

      const invalidPayload = {
        protocol: "vii.query",
        version: 1,
        queries: [
          {
            key: ["valid", undefined as unknown as string],
            data: "test",
            dataUpdatedAt: Date.now(),
          },
        ],
      };

      expect(() => hydrate(client, invalidPayload)).toThrowError(HydrationValidationError);
    });

    it("rejects invalid timestamps", () => {
      const client = new ResearchQueryClient();

      expect(() =>
        hydrate(client, {
          protocol: "vii.query",
          version: 1,
          queries: [
            {
              key: ["test"],
              data: "test",
              dataUpdatedAt: Number.NaN,
            },
          ],
        }),
      ).toThrowError(HydrationValidationError);

      expect(() =>
        hydrate(client, {
          protocol: "vii.query",
          version: 1,
          queries: [
            {
              key: ["test"],
              data: "test",
              dataUpdatedAt: -100,
            },
          ],
        }),
      ).toThrowError(HydrationValidationError);

      expect(() =>
        hydrate(client, {
          protocol: "vii.query",
          version: 1,
          queries: [
            {
              key: ["test"],
              data: "test",
              dataUpdatedAt: Date.now() + 1_000_000, // 1000s in the future
            },
          ],
        }),
      ).toThrowError(HydrationValidationError);
    });

    it("rejects oversized payloads exceeding maxQueries", () => {
      const client = new ResearchQueryClient();
      const largeQueries = Array.from({ length: 10 }, (_, i) => ({
        key: ["item", i],
        data: i,
        dataUpdatedAt: Date.now(),
      }));

      const envelope: QueryHydrationEnvelope = {
        protocol: "vii.query",
        version: 1,
        queries: largeQueries,
      };

      expect(() => hydrate(client, envelope, { maxQueries: 5 })).toThrowError(
        HydrationValidationError,
      );
    });
  });
});
