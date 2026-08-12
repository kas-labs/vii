import { expect, test } from "vitest";
import { renderedValue } from "../src/main.js";

test("Angular clean consumer reads the packed Vii signal", () => {
  expect(renderedValue).toBe(2);
});
