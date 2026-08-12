import { expect, test } from "vitest";
import { createDiagnostics, state } from "../src/index.js";

test("diagnostics exports a versioned redacted trace envelope", () => {
  const diagnostics = createDiagnostics({ maxEvents: 2, clock: () => 123 });

  diagnostics.run(() => {
    const count = state("private-value");
    count.set("secret-value");
  });

  const trace = diagnostics.exportTrace();

  expect(trace).toMatchObject({
    protocol: "vii.trace",
    version: "0.1",
    createdAt: "1970-01-01T00:00:00.123Z",
    droppedEvents: 0,
  });
  expect(trace.events).toEqual(diagnostics.getEvents());
  expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
  expect(JSON.stringify(trace)).not.toContain("private-value");
  expect(JSON.stringify(trace)).not.toContain("secret-value");
});

test("diagnostics trace export preserves bounded events and dropped count", () => {
  const diagnostics = createDiagnostics({ maxEvents: 1, clock: () => 456 });

  diagnostics.run(() => {
    const count = state(0);
    count.set(1);
  });

  const trace = diagnostics.exportTrace();

  expect(trace.droppedEvents).toBe(1);
  expect(trace.events.map((event) => event.id)).toEqual(["diagnostic-2"]);
});
