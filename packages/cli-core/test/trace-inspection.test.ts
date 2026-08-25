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
    scopes: [
      { scopeId: "scope-1", status: "active" },
      { scopeId: "scope-2", parentScopeId: "scope-1", status: "active" },
    ],
    resources: [{ resourceId: "resource-1", scopeId: "scope-2", status: "attached" }],
  });
  expect(JSON.stringify(inspection)).not.toContain("secret-");
});

test("inspectTrace reports disposed ownership nodes and resource success", () => {
  const inspection = inspectTrace({
    protocol: "vii.trace",
    version: "0.1",
    createdAt: "2026-08-13T00:00:00.000Z",
    events: [
      { type: "scope.created", payload: { scopeId: "scope-1" } },
      { type: "resource.attached", payload: { scopeId: "scope-1", resourceId: "resource-1" } },
      {
        type: "resource.disposed",
        payload: { scopeId: "scope-1", resourceId: "resource-1", succeeded: false },
      },
      { type: "scope.disposed", payload: { scopeId: "scope-1" } },
    ],
    droppedEvents: 0,
  });

  expect(inspection.scopeGraph).toEqual({
    scopes: [{ scopeId: "scope-1", status: "disposed" }],
    resources: [
      { resourceId: "resource-1", scopeId: "scope-1", status: "disposed", succeeded: false },
    ],
  });
});

test("inspectTrace preserves disposal evidence when creation events were dropped", () => {
  const inspection = inspectTrace({
    protocol: "vii.trace",
    version: "0.1",
    createdAt: "2026-08-13T00:00:00.000Z",
    events: [
      {
        type: "resource.disposed",
        payload: { scopeId: "scope-1", resourceId: "resource-1", succeeded: true },
      },
      { type: "scope.disposed", payload: { scopeId: "scope-1" } },
    ],
    droppedEvents: 2,
  });

  expect(inspection.scopeGraph).toEqual({
    scopes: [{ scopeId: "scope-1", status: "disposed" }],
    resources: [
      { resourceId: "resource-1", scopeId: "scope-1", status: "disposed", succeeded: true },
    ],
  });
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

test("inspectTrace rejects non-array events with house error message", () => {
  expect(() =>
    inspectTrace({
      protocol: "vii.trace",
      version: "0.1",
      createdAt: "2026-08-13T00:00:00.000Z",
      events: 5 as unknown as [],
      droppedEvents: 0,
    }),
  ).toThrow("Invalid diagnostics trace events: events must be an array");

  expect(() =>
    inspectTrace({
      protocol: "vii.trace",
      version: "0.1",
      createdAt: "2026-08-13T00:00:00.000Z",
      events: null as unknown as [],
      droppedEvents: 0,
    }),
  ).toThrow("Invalid diagnostics trace events: events must be an array");
});

test("inspectTrace rejects unsafe integer dropped-event count (e.g. 1e21)", () => {
  expect(() =>
    inspectTrace({
      protocol: "vii.trace",
      version: "0.1",
      createdAt: "2026-08-13T00:00:00.000Z",
      events: [],
      droppedEvents: 1e21,
    }),
  ).toThrow("Invalid diagnostics dropped-event count");
});
