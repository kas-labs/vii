import { describe, expect, it } from "vitest";
import { createScope } from "../../packages/core/src/index.js";
import { type QueryKey } from "./query-key.js";
import { ResearchQueryClient } from "./query-client-prototype.js";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("P5.4 Mutations and Optimistic Transactions Prototype", () => {
  describe("Mutation Lifecycle", () => {
    it("transitions through idle -> pending -> success on resolution", async () => {
      const client = new ResearchQueryClient();
      const snapshots: string[] = [];

      const mutation = client.createMutation({
        mutationFn: async (title: string) => {
          await delay(10);
          return { id: 1, title };
        },
      });

      mutation.subscribe((snap) => snapshots.push(snap.status));
      expect(mutation.getSnapshot().status).toBe("idle");

      const promise = mutation.mutate("New Title");
      expect(mutation.getSnapshot().status).toBe("pending");
      expect(mutation.getSnapshot().variables).toBe("New Title");

      const result = await promise;
      expect(result).toEqual({ id: 1, title: "New Title" });
      expect(mutation.getSnapshot().status).toBe("success");
      expect(mutation.getSnapshot().data).toEqual({ id: 1, title: "New Title" });
      expect(snapshots).toEqual(["pending", "success"]);
    });

    it("transitions through idle -> pending -> error on rejection", async () => {
      const client = new ResearchQueryClient();
      const mutation = client.createMutation({
        mutationFn: async () => {
          await delay(10);
          throw new Error("Network error");
        },
      });

      expect(mutation.getSnapshot().status).toBe("idle");

      const promise = mutation.mutate("data");
      expect(mutation.getSnapshot().status).toBe("pending");

      await expect(promise).rejects.toThrow("Network error");
      expect(mutation.getSnapshot().status).toBe("error");
      expect((mutation.getSnapshot().error as Error).message).toBe("Network error");
    });
  });

  describe("Optimistic Transactions & Rollback", () => {
    it("applies optimistic update and confirms on server success", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["todos"];

      client.setQueryData(key, ["Todo 1"]);

      const mutation = client.createMutation<string[], string, { rollback: () => boolean }>({
        onMutate: (newTodo) => {
          client.cancelQueries({ key });
          const { rollback } = client.setOptimisticData(key, ["Todo 1", newTodo]);
          return { rollback };
        },
        mutationFn: async (newTodo) => {
          await delay(15);
          return ["Todo 1", `${newTodo} (Saved)`];
        },
        onSuccess: (savedTodos) => {
          client.setQueryData(key, savedTodos);
        },
      });

      expect(client.getQueryData(key)).toEqual(["Todo 1"]);

      const mutatePromise = mutation.mutate("Todo 2");

      // Optimistic state is visible immediately
      expect(client.getQueryData(key)).toEqual(["Todo 1", "Todo 2"]);

      await mutatePromise;

      // Server state is committed
      expect(client.getQueryData(key)).toEqual(["Todo 1", "Todo 2 (Saved)"]);
    });

    it("rolls back optimistic update on mutation failure", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["todos"];

      client.setQueryData(key, ["Todo 1"]);

      const mutation = client.createMutation<string[], string, { rollback: () => boolean }>({
        onMutate: (newTodo) => {
          const { rollback } = client.setOptimisticData(key, ["Todo 1", newTodo]);
          return { rollback };
        },
        mutationFn: async () => {
          await delay(15);
          throw new Error("Server rejected");
        },
        onError: (_err, _vars, context) => {
          context?.rollback();
        },
      });

      expect(client.getQueryData(key)).toEqual(["Todo 1"]);

      const mutatePromise = mutation.mutate("Todo 2");
      expect(client.getQueryData(key)).toEqual(["Todo 1", "Todo 2"]);

      await expect(mutatePromise).rejects.toThrow("Server rejected");

      // Cache is cleanly rolled back to original
      expect(client.getQueryData(key)).toEqual(["Todo 1"]);
    });
  });

  describe("Mandatory Concurrent Mutation Race Protection", () => {
    it("does not allow a failed older mutation to clobber a succeeded newer mutation", async () => {
      const client = new ResearchQueryClient();
      const key: QueryKey = ["items"];

      client.setQueryData(key, ["base"]);

      // Mutation A: slow (takes 40ms) then fails
      const mutationA = client.createMutation<string[], string, { rollback: () => boolean }>({
        onMutate: (item) => {
          const prev = (client.getQueryData<string[]>(key) ?? []).slice();
          const { rollback } = client.setOptimisticData(key, [...prev, item]);
          return { rollback };
        },
        mutationFn: async () => {
          await delay(40);
          throw new Error("Mutation A failed late");
        },
        onError: (_err, _vars, context) => {
          context?.rollback();
        },
      });

      // Mutation B: fast (takes 10ms) and succeeds
      const mutationB = client.createMutation<string[], string, { rollback: () => boolean }>({
        onMutate: (item) => {
          const prev = (client.getQueryData<string[]>(key) ?? []).slice();
          const { rollback } = client.setOptimisticData(key, [...prev, item]);
          return { rollback };
        },
        mutationFn: async () => {
          await delay(10);
          return ["base", "item-B-server"];
        },
        onSuccess: (serverResult) => {
          client.setQueryData(key, serverResult);
        },
        onError: (_err, _vars, context) => {
          context?.rollback();
        },
      });

      // 1. Mutation A starts (optimistic change A applied)
      const promiseA = mutationA.mutate("item-A");
      expect(client.getQueryData(key)).toEqual(["base", "item-A"]);

      // 2. Mutation B starts (optimistic change B applied on top)
      const promiseB = mutationB.mutate("item-B");
      expect(client.getQueryData(key)).toEqual(["base", "item-A", "item-B"]);

      // 3. Mutation B succeeds first
      await promiseB;
      expect(client.getQueryData(key)).toEqual(["base", "item-B-server"]);

      // 4. Mutation A fails late
      await expect(promiseA).rejects.toThrow("Mutation A failed late");

      // 5. Verification: A's failure rollback MUST NOT erase B's accepted update!
      expect(client.getQueryData(key)).toEqual(["base", "item-B-server"]);
    });
  });

  describe("Mutation Cancellation & Scope Integration", () => {
    it("aborts active mutation execution when cancelled", async () => {
      const client = new ResearchQueryClient();
      let aborted = false;

      const mutation = client.createMutation({
        mutationFn: async (_vars, { signal }) => {
          signal.addEventListener("abort", () => {
            aborted = true;
          });
          await delay(50);
          return "done";
        },
      });

      const promise = mutation.mutate("test");
      expect(mutation.getSnapshot().status).toBe("pending");

      mutation.cancel();

      await expect(promise).rejects.toThrow();
      expect(aborted).toBe(true);
      expect(mutation.getSnapshot().status).toBe("idle");
    });

    it("disposes and cancels in-flight mutation on Scope disposal", async () => {
      const client = new ResearchQueryClient();
      const scope = createScope();
      let aborted = false;

      const mutation = client.createMutation({
        mutationFn: async (_vars, { signal }) => {
          signal.addEventListener("abort", () => {
            aborted = true;
          });
          await delay(50);
          return "done";
        },
      });

      scope.use(mutation);

      const promise = mutation.mutate("scoped");
      expect(mutation.getSnapshot().status).toBe("pending");

      scope.dispose();

      expect(mutation.isDisposed).toBe(true);
      await expect(promise).rejects.toThrow();
      expect(aborted).toBe(true);
      expect(mutation.getSnapshot().status).toBe("idle");
    });
  });
});

describe("Superseding mutation snapshot integrity (audit regression)", () => {
  it("does not clobber the successor's pending snapshot when the superseded mutation aborts", async () => {
    const { MutationRecord } = await import("./mutation-record.js");
    let releaseFirst: (() => void) | undefined;
    const statuses: string[] = [];

    const record = new MutationRecord<string, string>({
      mutationFn: async (variables, { signal }) => {
        if (variables === "first") {
          await new Promise<void>((resolve) => {
            releaseFirst = resolve;
          });
          if (signal.aborted) {
            // Simulate a mutation fn that resolves anyway after abort.
            return "first-late";
          }
        }
        return variables;
      },
    });

    record.subscribe((snapshot) => statuses.push(snapshot.status));

    const first = record.mutate("first").catch(() => "aborted");
    const second = record.mutate("second");

    // Release the superseded mutation after the successor is already pending.
    releaseFirst?.();
    await expect(first).resolves.toBe("aborted");

    // The successor must still be pending (or settle to success), never be
    // reset to idle by the superseded mutation's abort handling.
    expect(record.getSnapshot().status).not.toBe("idle");
    await expect(second).resolves.toBe("second");
    expect(record.getSnapshot().status).toBe("success");
    expect(statuses).not.toContain("idle");
  });
});
