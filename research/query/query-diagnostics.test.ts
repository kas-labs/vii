import { describe, expect, it, vi } from "vitest";
import { type QueryKey } from "./query-key.js";
import { ResearchQueryClient } from "./query-client-prototype.js";
import { dehydrate, hydrate } from "./query-hydration.js";
import { type QueryDiagnosticEvent, type QueryDiagnosticSink } from "./query-diagnostics.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("P5.6 Diagnostics and Privacy Prototype", () => {
  describe("Value-Safe Structural Event Lifecycle", () => {
    it("emits complete structural event trace for queries, deduplication, and GC", async () => {
      vi.useFakeTimers();
      try {
        const events: QueryDiagnosticEvent[] = [];
        const sink: QueryDiagnosticSink = (e) => events.push(e);
        const client = new ResearchQueryClient({ defaultGcTime: 100, sink });
        const key: QueryKey = ["items", 1];

        // 1. Initial getQueryData -> cache miss
        client.getQueryData(key);
        expect(events.some((e) => e.type === "query:cache_miss")).toBe(true);

        // 2. Observer added
        const observer = client.observeQuery(key);
        expect(events.some((e) => e.type === "query:observer_added")).toBe(true);

        // 3. Concurrent fetches -> started + deduplicated
        const p1 = client.fetchQuery(key, async () => {
          await delay(20);
          return { id: 1, title: "Item 1" };
        });
        const p2 = client.fetchQuery(key, async () => {
          await delay(20);
          return { id: 1, title: "Item 1" };
        });

        expect(events.some((e) => e.type === "query:fetch_started")).toBe(true);
        expect(events.some((e) => e.type === "query:fetch_deduplicated")).toBe(true);

        await vi.advanceTimersByTimeAsync(25);
        await Promise.all([p1, p2]);

        expect(events.some((e) => e.type === "query:fetch_succeeded")).toBe(true);

        // 4. Invalidation
        client.invalidateQueries({ key });
        expect(events.some((e) => e.type === "query:invalidated")).toBe(true);

        // 5. Observer removed -> GC scheduled -> GC evicted
        observer.dispose();
        expect(events.some((e) => e.type === "query:observer_removed")).toBe(true);
        expect(events.some((e) => e.type === "query:gc_scheduled")).toBe(true);

        vi.advanceTimersByTime(150);
        expect(events.some((e) => e.type === "query:gc_evicted")).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it("emits structural events for mutations and optimistic rollback", async () => {
      const events: QueryDiagnosticEvent[] = [];
      const sink: QueryDiagnosticSink = (e) => events.push(e);
      const client = new ResearchQueryClient({ sink });
      const key: QueryKey = ["settings"];

      client.setQueryData(key, { theme: "light" });

      const mutation = client.createMutation<
        { theme: string },
        { theme: string },
        { rollback: () => boolean }
      >({
        onMutate: (vars) => {
          const { rollback } = client.setOptimisticData(key, vars);
          return { rollback };
        },
        mutationFn: async () => {
          await delay(10);
          throw new Error("Server rejected theme change");
        },
        onError: (_err, _vars, ctx) => {
          ctx?.rollback();
        },
      });

      await expect(mutation.mutate({ theme: "dark" })).rejects.toThrow();

      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toContain("mutation:started");
      expect(eventTypes).toContain("mutation:failed");
      expect(eventTypes).toContain("mutation:rollback");
    });

    it("emits events for dehydration and hydration count", async () => {
      const events: QueryDiagnosticEvent[] = [];
      const sink: QueryDiagnosticSink = (e) => events.push(e);
      const serverClient = new ResearchQueryClient({ sink });

      await serverClient.fetchQuery(["doc", 1], async () => "content");
      await serverClient.fetchQuery(["doc", 2], async () => "content");

      const envelope = dehydrate(serverClient);
      expect(events.some((e) => e.type === "query:dehydrated" && e.count === 2)).toBe(true);

      const clientClient = new ResearchQueryClient({ sink });
      hydrate(clientClient, envelope);
      expect(events.some((e) => e.type === "query:hydrated" && e.count === 2)).toBe(true);
    });
  });

  describe("Absolute Privacy & Zero Data Leakage", () => {
    it("never includes query payload values, response bodies, or mutation variables in diagnostic events", async () => {
      const events: QueryDiagnosticEvent[] = [];
      const sink: QueryDiagnosticSink = (e) => events.push(e);
      const client = new ResearchQueryClient({ sink });

      const SECRET_RESPONSE_BODY = "SENSITIVE_BEARER_TOKEN_99999";
      const SECRET_MUTATION_VAR = "PASSWORD_CREDENTIAL_SECRET";
      const SENSITIVE_USER_CONTENT = "CONFIDENTIAL_PII_SSN_000112222";

      // 1. Execute query with secret response
      await client.fetchQuery(["auth", "token"], async () => ({
        token: SECRET_RESPONSE_BODY,
        ssn: SENSITIVE_USER_CONTENT,
      }));

      // 2. Execute mutation with secret variables
      const mutation = client.createMutation({
        mutationFn: async (_vars: { password: string }) => {
          return "ok";
        },
      });
      await mutation.mutate({ password: SECRET_MUTATION_VAR });

      // 3. Serialize all emitted events into one string
      const serializedLog = JSON.stringify(events);

      // 4. Assert absolute absence of sensitive values
      expect(serializedLog).not.toContain(SECRET_RESPONSE_BODY);
      expect(serializedLog).not.toContain(SECRET_MUTATION_VAR);
      expect(serializedLog).not.toContain(SENSITIVE_USER_CONTENT);

      // 5. Verify only safe structural metadata exists
      for (const ev of events) {
        expect(typeof ev.type).toBe("string");
        expect(typeof ev.timestamp).toBe("number");
        if (ev.keyHash !== undefined) {
          expect(typeof ev.keyHash).toBe("number");
        }
      }
    });
  });

  describe("Fault Isolation & Resilience", () => {
    it("guarantees throwing diagnostic sinks cannot break or alter Query and Mutation execution", async () => {
      const brokenSink: QueryDiagnosticSink = () => {
        throw new Error("Broken logger threw unexpected exception");
      };

      const client = new ResearchQueryClient({ sink: brokenSink });
      const key: QueryKey = ["resilience", "test"];

      // Fetch query succeeds even though sink throws on every lifecycle event
      const fetchResult = await client.fetchQuery(key, async () => "safe-data");
      expect(fetchResult).toBe("safe-data");
      expect(client.getQueryData(key)).toBe("safe-data");

      // Mutation succeeds despite broken sink
      const mutation = client.createMutation({
        mutationFn: async () => "mutation-safe",
      });
      const mutateResult = await mutation.mutate(undefined);
      expect(mutateResult).toBe("mutation-safe");

      // Hydration succeeds despite broken sink
      const envelope = dehydrate(client);
      const hydrateClient = new ResearchQueryClient({ sink: brokenSink });
      const { hydratedCount } = hydrate(hydrateClient, envelope);
      expect(hydratedCount).toBe(1);
    });
  });
});
