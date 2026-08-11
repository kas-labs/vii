import { expect, test } from "vitest";
import { renderedMarkup } from "../src/main.js";

test("React fixture renders a Core snapshot", () => {
  expect(renderedMarkup).toContain('data-value="2"');
  expect(renderedMarkup).toContain(">2</span>");
});
