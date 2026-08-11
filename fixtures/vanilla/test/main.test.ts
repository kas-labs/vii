import { expect, test } from "vitest";
import { countValue, observedValues } from "../src/main.js";

test("Vanilla fixture reads and writes State from Core", () => {
  expect(countValue).toBe(2);
});

test("Vanilla fixture observes State changes from Core", () => {
  expect(observedValues).toEqual([1, 2]);
});
