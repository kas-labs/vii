import { describe, expect, it } from "vitest";
import { v } from "./index.js";

describe("S1: Zero-Copy Success Path", () => {
  it("preserves object identity on successful object validation", () => {
    const schema = v.object({
      id: v.string(),
      count: v.number(),
      meta: v.object({
        tag: v.string(),
      }),
    });

    const input = {
      id: "obj_1",
      count: 42,
      meta: {
        tag: "vii",
      },
    };

    const result = schema.check(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Object identity must be preserved (zero cloning)
      expect(result.value).toBe(input);
      expect(result.value.meta).toBe(input.meta);
    }
  });

  it("preserves array and element identity on successful array validation", () => {
    const itemSchema = v.object({
      name: v.string(),
    });
    const listSchema = v.array(itemSchema);

    const firstItem = { name: "item1" };
    const secondItem = { name: "item2" };
    const listInput = [firstItem, secondItem];

    const result = listSchema.check(listInput);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Array identity and item identity must be preserved (zero allocation of new array/items)
      expect(result.value).toBe(listInput);
      expect(result.value[0]).toBe(firstItem);
      expect(result.value[1]).toBe(secondItem);
    }
  });
});
