import { expect, expectTypeOf, test } from "vitest";
import { state } from "../src/index.js";

test("state returns its initial value", () => {
  const count = state(0);

  expect(count.get()).toBe(0);
});

test("state replaces its value with set", () => {
  const count = state(0);

  count.set(1);

  expect(count.get()).toBe(1);
});

test("state derives its next value with update", () => {
  const count = state(1);

  count.update((current) => current + 1);

  expect(count.get()).toBe(2);
});

test("state preserves the value type", () => {
  const label = state("vii");

  expectTypeOf(label.get()).toEqualTypeOf<string>();
});
