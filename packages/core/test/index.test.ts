import { expect, test } from "vitest";
import * as core from "../src/index.js";

test("Core exposes State and Computed factories from its ESM entrypoint", () => {
  expect(Object.keys(core)).toEqual(["computed", "state"]);
});
