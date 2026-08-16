import { expect, test } from "vitest";
import { runCheckoutReference } from "../src/main.js";

test("reference consumer derives checkout totals and disposes its subscription", () => {
  expect(runCheckoutReference()).toEqual({
    finalQuantity: 3,
    observedQuantities: [2, 3],
    totalCents: 2400,
  });
});
