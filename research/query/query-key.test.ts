import { describe, expect, it } from "vitest";
import {
  type QueryKey,
  QueryKeyValidationError,
  canonicalizeQueryKey,
  hashCanonicalKey,
  isExactMatch,
  matchQueryKeyFamily,
} from "./query-key.js";

describe("QueryKey validation and canonicalization", () => {
  describe("Equality and deterministic ordering", () => {
    it("canonicalizes primitive values deterministically", () => {
      expect(canonicalizeQueryKey("todos")).toBe('"todos"');
      expect(canonicalizeQueryKey(42)).toBe("42");
      expect(canonicalizeQueryKey(0)).toBe("0");
      expect(canonicalizeQueryKey(-0)).toBe("0");
      expect(canonicalizeQueryKey(true)).toBe("true");
      expect(canonicalizeQueryKey(false)).toBe("false");
      expect(canonicalizeQueryKey(null)).toBe("null");
    });

    it("treats objects with different property insertion order as identical", () => {
      const keyA: QueryKey = ["projects", { page: 2, status: "active" }];
      const keyB: QueryKey = ["projects", { status: "active", page: 2 }];
      expect(canonicalizeQueryKey(keyA)).toBe(canonicalizeQueryKey(keyB));
      expect(isExactMatch(keyA, keyB)).toBe(true);
    });

    it("treats arrays with different element order as distinct", () => {
      const keyA: QueryKey = ["projects", 2, "active"];
      const keyB: QueryKey = ["projects", "active", 2];
      expect(canonicalizeQueryKey(keyA)).not.toBe(canonicalizeQueryKey(keyB));
      expect(isExactMatch(keyA, keyB)).toBe(false);
    });

    it("handles deeply nested structures with mixed arrays and objects", () => {
      const complex1: QueryKey = [
        "users",
        {
          filter: { role: "admin", tags: ["core", "lead"] },
          sort: { by: "name", order: "asc" },
        },
      ];
      const complex2: QueryKey = [
        "users",
        {
          sort: { order: "asc", by: "name" },
          filter: { tags: ["core", "lead"], role: "admin" },
        },
      ];
      expect(canonicalizeQueryKey(complex1)).toBe(canonicalizeQueryKey(complex2));
      expect(isExactMatch(complex1, complex2)).toBe(true);
    });

    it("strictly distinguishes distinct types with same stringified content", () => {
      expect(canonicalizeQueryKey(1)).not.toBe(canonicalizeQueryKey("1"));
      expect(canonicalizeQueryKey(true)).not.toBe(canonicalizeQueryKey("true"));
      expect(canonicalizeQueryKey(null)).not.toBe(canonicalizeQueryKey("null"));
      expect(canonicalizeQueryKey([1, 2])).not.toBe(canonicalizeQueryKey({ "0": 1, "1": 2 }));
    });
  });

  describe("Deterministic rejection of unsupported values", () => {
    it("rejects undefined", () => {
      expect(() => canonicalizeQueryKey(undefined)).toThrow(QueryKeyValidationError);
      expect(() => canonicalizeQueryKey(["todos", undefined])).toThrow(QueryKeyValidationError);
    });

    it("rejects NaN, +Infinity, and -Infinity", () => {
      expect(() => canonicalizeQueryKey(Number.NaN)).toThrow(QueryKeyValidationError);
      expect(() => canonicalizeQueryKey(Number.POSITIVE_INFINITY)).toThrow(QueryKeyValidationError);
      expect(() => canonicalizeQueryKey(Number.NEGATIVE_INFINITY)).toThrow(QueryKeyValidationError);
    });

    it("rejects functions, symbols, and bigints", () => {
      expect(() => canonicalizeQueryKey(() => {})).toThrow(QueryKeyValidationError);
      expect(() => canonicalizeQueryKey(Symbol("key"))).toThrow(QueryKeyValidationError);
      expect(() => canonicalizeQueryKey(BigInt(42))).toThrow(QueryKeyValidationError);
    });

    it("rejects non-plain class instances (Date, Map, Set, custom class)", () => {
      expect(() => canonicalizeQueryKey(new Date())).toThrow(QueryKeyValidationError);
      expect(() => canonicalizeQueryKey(new Map())).toThrow(QueryKeyValidationError);
      expect(() => canonicalizeQueryKey(new Set())).toThrow(QueryKeyValidationError);
      expect(() => canonicalizeQueryKey(new RegExp("abc"))).toThrow(QueryKeyValidationError);

      class CustomEntity {
        id = 1;
      }
      expect(() => canonicalizeQueryKey(new CustomEntity())).toThrow(QueryKeyValidationError);
    });

    it("detects and rejects cyclic structures deterministically", () => {
      const cyclicArr: unknown[] = ["todos"];
      cyclicArr.push(cyclicArr);
      expect(() => canonicalizeQueryKey(cyclicArr)).toThrow(/Cyclic reference detected/);

      const cyclicObj: Record<string, unknown> = { name: "item" };
      cyclicObj["self"] = cyclicObj;
      expect(() => canonicalizeQueryKey(cyclicObj)).toThrow(/Cyclic reference detected/);
    });
  });

  describe("Security, immutability, and prototype protection", () => {
    it("rejects prototype-pollution properties in objects", () => {
      const malicious = JSON.parse('{"__proto__": {"polluted": true}}');
      expect(() => canonicalizeQueryKey(malicious)).toThrow(
        /must not contain special property '__proto__'/,
      );

      const constructorTamper = { constructor: { admin: true } };
      expect(() => canonicalizeQueryKey(constructorTamper)).toThrow(
        /must not contain special property 'constructor'/,
      );

      const protoTamper = { prototype: { admin: true } };
      expect(() => canonicalizeQueryKey(protoTamper)).toThrow(
        /must not contain special property 'prototype'/,
      );
    });

    it("supports null-prototype objects without error", () => {
      const nullProto = Object.create(null);
      nullProto.page = 1;
      nullProto.filter = "active";
      expect(canonicalizeQueryKey(nullProto)).toBe('{"filter":"active","page":1}');
    });

    it("does not mutate input objects or arrays", () => {
      const inputObj = Object.freeze({ b: 2, a: 1 });
      const inputArr = Object.freeze(["first", "second"]);
      const key: QueryKey = [inputArr, inputObj];

      const serialized = canonicalizeQueryKey(key);
      expect(serialized).toBe('[["first","second"],{"a":1,"b":2}]');
      expect(Object.keys(inputObj)).toEqual(["b", "a"]);
    });
  });

  describe("Complexity bounds and pathological inputs", () => {
    it("enforces nesting depth limits", () => {
      let nested: unknown = "leaf";
      for (let i = 0; i < 70; i++) {
        nested = [nested];
      }
      expect(() => canonicalizeQueryKey(nested)).toThrow(/maximum nesting depth/);
    });

    it("enforces node count limits", () => {
      const wideObj: Record<string, number> = {};
      for (let i = 0; i < 200; i++) {
        wideObj[`prop_${i}`] = i;
      }
      expect(() => canonicalizeQueryKey(wideObj, { maxNodes: 50 })).toThrow(/maximum node count/);
    });

    it("enforces maximum string length limit", () => {
      const hugeString = "x".repeat(2_000_000);
      expect(() => canonicalizeQueryKey(hugeString)).toThrow(/maximum length/);
    });
  });

  describe("Structural Family / Prefix Matching", () => {
    it("matches array prefixes structurally", () => {
      expect(matchQueryKeyFamily(["todos"], ["todos"])).toBe(true);
      expect(matchQueryKeyFamily(["todos"], ["todos", 1])).toBe(true);
      expect(matchQueryKeyFamily(["todos"], ["todos", 2])).toBe(true);
      expect(matchQueryKeyFamily(["todos"], ["todos", { status: "done" }])).toBe(true);
      expect(
        matchQueryKeyFamily(
          ["todos", { status: "done" }],
          ["todos", { status: "done" }, "details"],
        ),
      ).toBe(true);
    });

    it("does not match non-matching prefixes or different element types", () => {
      expect(matchQueryKeyFamily(["todos", 1], ["todos", 2])).toBe(false);
      expect(matchQueryKeyFamily(["todos", 1], ["todos"])).toBe(false);
      expect(
        matchQueryKeyFamily(["todos", { status: "pending" }], ["todos", { status: "done" }]),
      ).toBe(false);
    });

    it("distinguishes string prefixes from structural array elements", () => {
      expect(matchQueryKeyFamily(["todos", "all"], ["todos-all"])).toBe(false);
    });
  });

  describe("Hash indexing", () => {
    it("produces deterministic 32-bit integer hashes", () => {
      const hash1 = hashCanonicalKey('["todos",{"id":1}]');
      const hash2 = hashCanonicalKey('["todos",{"id":1}]');
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe("number");
      expect(hash1 >>> 0).toBe(hash1); // non-negative 32-bit unsigned
    });
  });
});
