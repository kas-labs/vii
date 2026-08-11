import { expect, test } from "vitest";
import {
  batchedObservedValues,
  batchedValue,
  countValue,
  doubledValue,
  observedValues,
  scopedFinalValue,
  scopedObservedValues,
} from "../src/main.js";

test("Vanilla fixture reads and writes State from Core", () => {
  expect(countValue).toBe(2);
});

test("Vanilla fixture observes State changes from Core", () => {
  expect(observedValues).toEqual([1, 2]);
});

test("Vanilla fixture reads Computed from Core", () => {
  expect(doubledValue).toBe(4);
});

test("Vanilla fixture batches writes from Core", () => {
  expect(batchedValue).toBe(2);
  expect(batchedObservedValues).toEqual([2]);
});

test("Vanilla fixture disposes Scope-owned subscriptions from Core", () => {
  expect(scopedObservedValues).toEqual([1]);
  expect(scopedFinalValue).toBe(2);
});
