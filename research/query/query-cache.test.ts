import { describe, expect, it } from "vitest";
import { type QueryKey } from "./query-key.js";
import { ResearchQueryCache } from "./query-cache-prototype.js";

describe("ResearchQueryCache prototype", () => {
  describe("Basic cache operations and canonical lookup", () => {
    it("stores and retrieves records by exact canonical identity", () => {
      const cache = new ResearchQueryCache<{ name: string }>();

      const keyA: QueryKey = ["project", { id: 10, env: "prod" }];
      const keyB: QueryKey = ["project", { env: "prod", id: 10 }];

      cache.set(keyA, { name: "Apollo" });

      expect(cache.size).toBe(1);
      expect(cache.has(keyB)).toBe(true);

      const retrieved = cache.get(keyB);
      expect(retrieved).toBeDefined();
      expect(retrieved?.data).toEqual({ name: "Apollo" });
    });

    it("returns undefined for missing keys", () => {
      const cache = new ResearchQueryCache();
      expect(cache.get(["nonexistent"])).toBeUndefined();
      expect(cache.has(["nonexistent"])).toBe(false);
    });

    it("updates existing records in-place without expanding size", () => {
      const cache = new ResearchQueryCache<number>();
      cache.set(["counter"], 1);
      expect(cache.size).toBe(1);
      expect(cache.get(["counter"])?.data).toBe(1);

      cache.set(["counter"], 2);
      expect(cache.size).toBe(1);
      expect(cache.get(["counter"])?.data).toBe(2);
    });

    it("deletes records and tracks size", () => {
      const cache = new ResearchQueryCache<string>();
      cache.set(["item", 1], "first");
      cache.set(["item", 2], "second");
      expect(cache.size).toBe(2);

      expect(cache.delete(["item", 1])).toBe(true);
      expect(cache.size).toBe(1);
      expect(cache.get(["item", 1])).toBeUndefined();
      expect(cache.get(["item", 2])?.data).toBe("second");

      expect(cache.delete(["item", 1])).toBe(false);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get(["item", 2])).toBeUndefined();
    });
  });

  describe("Structural family and prefix matching", () => {
    it("finds all records matching a family prefix", () => {
      const cache = new ResearchQueryCache<string>();

      cache.set(["todos"], "all-todos");
      cache.set(["todos", 1], "todo-1");
      cache.set(["todos", 2], "todo-2");
      cache.set(["todos", { status: "done" }], "todos-done");
      cache.set(["todos", { status: "done" }, "details"], "todos-done-details");
      cache.set(["users", 1], "user-1");

      expect(cache.size).toBe(6);

      const todosFamily = cache.matchFamily(["todos"]);
      expect(todosFamily.map((r) => r.data)).toEqual([
        "all-todos",
        "todo-1",
        "todo-2",
        "todos-done",
        "todos-done-details",
      ]);

      const doneFamily = cache.matchFamily(["todos", { status: "done" }]);
      expect(doneFamily.map((r) => r.data)).toEqual(["todos-done", "todos-done-details"]);

      const userFamily = cache.matchFamily(["users"]);
      expect(userFamily.map((r) => r.data)).toEqual(["user-1"]);
    });

    it("returns empty array when family prefix does not match any records", () => {
      const cache = new ResearchQueryCache<string>();
      cache.set(["todos", 1], "todo-1");
      expect(cache.matchFamily(["posts"])).toEqual([]);
    });
  });

  describe("Hash collision safety and fallback isolation", () => {
    it("stores multiple records under the same hash without aliasing", () => {
      // Force all keys to hash to 42, simulating 100% hash collision scenario
      const constantHasher = () => 42;
      const cache = new ResearchQueryCache<string>(constantHasher);

      const keyA: QueryKey = ["alpha", 1];
      const keyB: QueryKey = ["beta", 2];

      cache.set(keyA, "data-alpha");
      cache.set(keyB, "data-beta");

      expect(cache.size).toBe(2);
      expect(cache.bucketCount).toBe(1);
      expect(cache.collisionCount).toBe(1);

      // Verify exact lookup returns the right record despite identical hash bucket
      const recA = cache.get(keyA);
      const recB = cache.get(keyB);

      expect(recA).toBeDefined();
      expect(recA?.data).toBe("data-alpha");

      expect(recB).toBeDefined();
      expect(recB?.data).toBe("data-beta");

      // Verify deletion in collision bucket removes only targeted record
      expect(cache.delete(keyA)).toBe(true);
      expect(cache.size).toBe(1);
      expect(cache.get(keyA)).toBeUndefined();
      expect(cache.get(keyB)?.data).toBe("data-beta");
    });
  });
});
