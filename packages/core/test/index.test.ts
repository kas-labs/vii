import { expect, test } from "vitest";
import * as core from "../src/index.js";

test("Core exposes State, Computed, and Batch factories from its ESM entrypoint", () => {
  expect(Object.keys(core)).toEqual(["computed", "batch", "state"]);
});
