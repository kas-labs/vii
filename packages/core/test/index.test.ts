import { expect, test } from "vitest";
import * as core from "../src/index.js";

test("Core exposes the State factory from its ESM entrypoint", () => {
  expect(Object.keys(core)).toEqual(["state"]);
});
