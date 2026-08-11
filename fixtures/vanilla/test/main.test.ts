import { expect, test } from "vitest";
import { countValue } from "../src/main.js";

test("Vanilla fixture reads and writes State from Core", () => {
  expect(countValue).toBe(2);
});
