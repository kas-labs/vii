import { expect, test } from "vitest";
import { createDiagnostics, state } from "../src/index.js";

test("diagnostics preserves an explicit trace correlation id in events and export", () => {
  const diagnostics = createDiagnostics({ traceId: "checkout", clock: () => 123 });

  diagnostics.run(() => {
    state(0).set(1);
  });

  const trace = diagnostics.exportTrace();

  expect(trace).toMatchObject({ protocol: "vii.trace", version: "0.1", traceId: "checkout" });
  expect(trace.events).toHaveLength(2);
  expect(trace.events.every((event) => event.traceId === "checkout")).toBe(true);
});

test("diagnostics does not add trace correlation metadata by default", () => {
  const diagnostics = createDiagnostics({ clock: () => 123 });

  diagnostics.run(() => {
    state(0).set(1);
  });

  const trace = diagnostics.exportTrace();

  expect("traceId" in trace).toBe(false);
  expect(trace.events.every((event) => !("traceId" in event))).toBe(true);
  expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
});
