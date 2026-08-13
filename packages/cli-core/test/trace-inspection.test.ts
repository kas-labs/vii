import { expect, test } from "vitest";
import { inspectTrace } from "../src/index.js";

test("inspectTrace summarizes a versioned trace in deterministic event order", () => {
  const events = [
    { type: "state.created", payload: { value: "private-value" } },
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
    scopeGraph: { scopes: [], resources: [] },
  });
  expect(JSON.stringify(inspection)).not.toContain("private-value");
});

test("inspectTrace summarizes scope and resource ownership without names", () => {
  const trace = {
    protocol: "vii.trace",
    version: "0.1",
    createdAt: "2026-08-13T00:00:00.000Z",
    events: [
      {
        type: "scope.created",
        payload: { scopeId: "scope-1", name: "secret-root" },
      },
      {
        type: "scope.created",
        payload: { scopeId: "scope-2", parentScopeId: "scope-1", name: "secret-child" },
      },
      {
        type: "resource.attached",
        payload: { scopeId: "scope-2", resourceId: "resource-1" },
      },
    ],
    droppedEvents: 0,
  };

  const inspection = inspectTrace(trace as Parameters<typeof inspectTrace>[0]);

  expect(inspection.scopeGraph).toEqual({
    scopes: [{ scopeId: "scope-1" }, { scopeId: "scope-2", parentScopeId: "scope-1" }],
    resources: [{ resourceId: "resource-1", scopeId: "scope-2" }],
  });
  expect(JSON.stringify(inspection)).not.toContain("secret-");
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

test("inspectTrace rejects malformed ownership metadata", () => {
  expect(() =>
    inspectTrace({
      protocol: "vii.trace",
      version: "0.1",
      createdAt: "2026-08-13T00:00:00.000Z",
      events: [{ type: "resource.attached", payload: { scopeId: "scope-1" } }],
      droppedEvents: 0,
    }),
  ).toThrow("Invalid diagnostics resource event payload");
});
