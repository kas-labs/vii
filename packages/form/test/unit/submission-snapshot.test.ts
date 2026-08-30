import { describe, expect, it } from "vitest";
import { deepCloneSnapshot } from "../../src/core/snapshot.js";

describe("deepCloneSnapshot", () => {
  it("clones primitive values by value", () => {
    expect(deepCloneSnapshot(42)).toBe(42);
    expect(deepCloneSnapshot("hello")).toBe("hello");
    expect(deepCloneSnapshot(true)).toBe(true);
    expect(deepCloneSnapshot(null)).toBe(null);
    expect(deepCloneSnapshot(undefined)).toBe(undefined);
    expect(deepCloneSnapshot(100n)).toBe(100n);
    const sym = Symbol("test");
    expect(deepCloneSnapshot(sym)).toBe(sym);
  });

  it("clones plain objects and arrays immutably", () => {
    const original = {
      username: "alice",
      age: 30,
      tags: ["admin", "staff"],
      nested: { active: true },
    };

    const clone = deepCloneSnapshot(original);

    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone.tags).not.toBe(original.tags);
    expect(clone.nested).not.toBe(original.nested);
    expect(Object.isFrozen(clone)).toBe(true);
    expect(Object.isFrozen(clone.tags)).toBe(true);
    expect(Object.isFrozen(clone.nested)).toBe(true);
  });

  it("clones null-prototype objects safely", () => {
    const nullProto: Record<string, unknown> = Object.create(null);
    nullProto["key1"] = "val1";
    nullProto["key2"] = 123;

    const clone = deepCloneSnapshot(nullProto);
    expect(Object.getPrototypeOf(clone)).toBe(null);
    expect(clone["key1"]).toBe("val1");
    expect(clone["key2"]).toBe(123);
    expect(Object.isFrozen(clone)).toBe(true);
  });

  it("clones Date and RegExp objects", () => {
    const date = new Date(1700000000000);
    const regex = /^[a-z0-9]+$/gi;

    const cloneDate = deepCloneSnapshot(date);
    expect(cloneDate).toBeInstanceOf(Date);
    expect(cloneDate.getTime()).toBe(date.getTime());
    expect(cloneDate).not.toBe(date);

    const cloneRegex = deepCloneSnapshot(regex);
    expect(cloneRegex).toBeInstanceOf(RegExp);
    expect(cloneRegex.source).toBe(regex.source);
    expect(cloneRegex.flags).toBe(regex.flags);
    expect(cloneRegex).not.toBe(regex);
  });

  it("clones Map and Set collections", () => {
    const map = new Map<string, unknown>([
      ["a", { num: 1 }],
      ["b", [2, 3]],
    ]);
    const set = new Set<unknown>([{ id: 1 }, "item"]);

    const cloneMap = deepCloneSnapshot(map);
    expect(cloneMap).toBeInstanceOf(Map);
    expect(cloneMap.size).toBe(2);
    expect(cloneMap.get("a")).toEqual({ num: 1 });
    expect(cloneMap.get("a")).not.toBe(map.get("a"));
    expect(Object.isFrozen(cloneMap)).toBe(true);

    const cloneSet = deepCloneSnapshot(set);
    expect(cloneSet).toBeInstanceOf(Set);
    expect(cloneSet.size).toBe(2);
    expect(Object.isFrozen(cloneSet)).toBe(true);
  });

  it("handles cyclic and shared object references without blowing the stack", () => {
    const cyclicObj: Record<string, unknown> = { name: "cycle" };
    cyclicObj["self"] = cyclicObj;

    const sharedChild = { value: "shared" };
    const root = {
      childA: sharedChild,
      childB: sharedChild,
      cyclic: cyclicObj,
    };

    const clone = deepCloneSnapshot(root);
    expect(clone.childA).toEqual(sharedChild);
    expect(clone.childA).toBe(clone.childB);
    expect(clone.cyclic["self"]).toBe(clone.cyclic);
    expect(clone.cyclic["name"]).toBe("cycle");
  });

  it("preserves functions and Promises by reference", async () => {
    const fn = () => "test";
    const promise = Promise.resolve("done");

    const payload = { fn, promise };
    const clone = deepCloneSnapshot(payload);

    expect(clone.fn).toBe(fn);
    expect(clone.promise).toBe(promise);
    expect(await clone.promise).toBe("done");
  });

  it("safely handles own '__proto__' data property without prototype pollution", () => {
    const evilObj = JSON.parse('{"__proto__": {"polluted": true}, "normal": 42}');
    const clone = deepCloneSnapshot(evilObj);

    expect(Object.prototype.hasOwnProperty.call(clone, "__proto__")).toBe(true);
    expect(clone.normal).toBe(42);
    expect((clone as Record<string, unknown>)["polluted"]).toBeUndefined();
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("rejects unsupported arbitrary class instances and Weak collections", () => {
    class CustomClass {
      constructor(public val: string) {}
    }

    expect(() => deepCloneSnapshot(new CustomClass("bad"))).toThrow(TypeError);
    expect(() => deepCloneSnapshot(new WeakMap())).toThrow(TypeError);
    expect(() => deepCloneSnapshot(new WeakSet())).toThrow(TypeError);
  });
});
