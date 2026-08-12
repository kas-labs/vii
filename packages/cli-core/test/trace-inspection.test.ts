import { expect, test } from "vitest";
import { inspectTrace } from "../src/index.js";

test("inspectTrace summarizes a versioned trace in deterministic event order", () => {
  const events = [
    { type: "state.created", payload: "private-value" },
    { type: "state.updated" },
    { type: "state.created" },
  ];
  const inspection = inspectTrace({
    protocol: "vii.trace",
    version: "0.1",
    createdAt: "2026-08-13T00:00:00.000Z",
    traceId: "checkout",
    events,
    droppedEvents: 2,
  });

  expect(inspection).toEqual({
    protocol: "vii.trace",
    version: "0.1",
    eventCount: 3,
    droppedEvents: 2,
    eventTypes: [
      { type: "state.created", count: 2 },
      { type: "state.updated", count: 1 },
    ],
  });
  expect(JSON.stringify(inspection)).not.toContain("private-value");
});

test("inspectTrace rejects an unsupported trace version", () => {
  expect(() =>
    inspectTrace({
      protocol: "vii.trace",
      version: "0.2",
      createdAt: "2026-08-13T00:00:00.000Z",
      events: [],
      droppedEvents: 0,
    }),
  ).toThrow("Unsupported diagnostics trace version");
});

test("inspectTrace rejects an unsupported trace protocol", () => {
  expect(() =>
    inspectTrace({
      protocol: "other.trace",
      version: "0.1",
      createdAt: "2026-08-13T00:00:00.000Z",
      events: [],
      droppedEvents: 0,
    }),
  ).toThrow("Unsupported diagnostics trace protocol");
});

test("inspectTrace rejects an event with an empty type", () => {
  expect(() =>
    inspectTrace({
      protocol: "vii.trace",
      version: "0.1",
      createdAt: "2026-08-13T00:00:00.000Z",
      events: [{ type: "" }],
      droppedEvents: 0,
    }),
  ).toThrow("Invalid diagnostics trace event type");
});

test("inspectTrace rejects an invalid dropped-event count", () => {
  expect(() =>
    inspectTrace({
      protocol: "vii.trace",
      version: "0.1",
      createdAt: "2026-08-13T00:00:00.000Z",
      events: [],
      droppedEvents: -1,
    }),
  ).toThrow("Invalid diagnostics dropped-event count");
});
