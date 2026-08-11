import { expect, test } from "vitest";
import * as core from "../src/index.js";

test("Core has a buildable ESM entrypoint during Phase 0", () => {
  expect(Object.keys(core)).toEqual([]);
});
