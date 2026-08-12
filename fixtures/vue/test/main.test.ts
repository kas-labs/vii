import { expect, test } from "vitest";
import { renderedValue } from "../src/main.js";

test("packed Vue consumer reads the Core-backed ref", () => {
  expect(renderedValue).toBe(2);
});
