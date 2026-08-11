import { expect, test } from "vitest";
import { coreExports } from "../src/main.js";

test("Vanilla fixture imports the Core package entrypoint", () => {
  expect(coreExports).toEqual([]);
});
