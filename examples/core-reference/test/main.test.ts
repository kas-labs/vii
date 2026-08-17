import { expect, test } from "vitest";
import { runCheckoutReference } from "../src/main.js";

test("reference consumer owns its subscription and Computed value in the checkout Scope", () => {
  expect(runCheckoutReference()).toEqual({
    finalQuantity: 3,
    observedQuantities: [2, 3],
    totalCents: 2400,
  });
});
