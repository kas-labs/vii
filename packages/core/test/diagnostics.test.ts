import { expect, test } from "vitest";
import { batch, computed, createDiagnostics, createScope, state } from "../src/index.js";

test("diagnostics records structured State events without values", () => {
  const diagnostics = createDiagnostics({ clock: () => 123 });

  diagnostics.run(() => {
    const count = state("private-value");
    count.set("secret-value");
  });

  const events = diagnostics.getEvents();

  expect(events.map((event) => event.type)).toEqual(["state.created", "state.updated"]);
  expect(events[0]).toMatchObject({
    protocolVersion: "0.1",
    id: "diagnostic-1",
    timestamp: 123,
    package: "@vii/core",
  });
  expect(JSON.stringify(events)).not.toContain("private-value");
  expect(JSON.stringify(events)).not.toContain("secret-value");
});

test("diagnostics keeps a bounded ring buffer and reports dropped events", () => {
  const diagnostics = createDiagnostics({ maxEvents: 2, clock: () => 456 });

  diagnostics.run(() => {
    const count = state(0);
    count.set(1);
    count.set(2);
  });

  expect(diagnostics.getEvents()).toHaveLength(2);
  expect(diagnostics.droppedEvents).toBe(1);
  expect(diagnostics.getEvents().map((event) => event.id)).toEqual([
    "diagnostic-2",
    "diagnostic-3",
  ]);
});

test("off diagnostics do not collect events or alter State behavior", () => {
  const diagnostics = createDiagnostics({ mode: "off" });
  const observed: number[] = [];
  const count = state(0);

  diagnostics.run(() => {
    count.subscribe((value) => observed.push(value));
    count.set(1);
  });

  expect(count.get()).toBe(1);
  expect(observed).toEqual([1]);
  expect(diagnostics.getEvents()).toEqual([]);
  expect(diagnostics.droppedEvents).toBe(0);
});

test("a failing diagnostic sink cannot break State updates", () => {
  const diagnostics = createDiagnostics({
    sink: {
      emit: () => {
        throw new Error("sink failed");
      },
    },
  });
  const count = state(0);

  expect(() =>
    diagnostics.run(() => {
      count.set(1);
    }),
  ).not.toThrow();
  expect(count.get()).toBe(1);
});

test("diagnostics records subscription lifecycle without listener values", () => {
  const diagnostics = createDiagnostics({ clock: () => 789 });
  const observed: number[] = [];

  diagnostics.run(() => {
    const count = state(0);
    const unsubscribe = count.subscribe((value) => observed.push(value));
    count.set(1);
    unsubscribe();
  });

  expect(observed).toEqual([1]);
  expect(diagnostics.getEvents().map((event) => event.type)).toEqual([
    "state.created",
    "subscription.created",
    "state.updated",
    "subscription.notified",
    "subscription.disposed",
  ]);
});

test("diagnostics records Scope and resource lifecycle", () => {
  const diagnostics = createDiagnostics({ clock: () => 987 });

  diagnostics.run(() => {
    const scope = createScope({ name: "test-scope" });
    scope.use(() => undefined);
    scope.dispose();
  });

  expect(diagnostics.getEvents().map((event) => event.type)).toEqual([
    "scope.created",
    "resource.attached",
    "scope.disposing",
    "resource.disposed",
    "scope.disposed",
  ]);
});

test("diagnostics records batch commit outcomes", () => {
  const diagnostics = createDiagnostics({ clock: () => 654 });

  diagnostics.run(() => {
    const count = state(0);
    batch(() => count.set(1));
  });

  expect(diagnostics.getEvents().map((event) => event.type)).toEqual([
    "state.created",
    "batch.started",
    "state.updated",
    "batch.committed",
  ]);
});

test("diagnostics records failed batches after committed writes", () => {
  const diagnostics = createDiagnostics({ clock: () => 655 });
  const callbackError = new Error("callback failed");

  expect(() =>
    diagnostics.run(() => {
      const count = state(0);
      batch(() => {
        count.set(1);
        throw callbackError;
      });
    }),
  ).toThrow(callbackError);

  expect(diagnostics.getEvents().map((event) => event.type)).toEqual([
    "state.created",
    "batch.started",
    "state.updated",
    "batch.failed",
  ]);
});

test("diagnostics records Computed creation, evaluation, and disposal", () => {
  const diagnostics = createDiagnostics({ clock: () => 321 });

  diagnostics.run(() => {
    const count = state(1);
    const doubled = computed(() => count.get() * 2);
    expect(doubled.get()).toBe(2);
    doubled.dispose();
  });

  expect(diagnostics.getEvents().map((event) => event.type)).toEqual([
    "state.created",
    "computed.created",
    "subscription.created",
    "computed.recomputed",
    "subscription.disposed",
    "computed.disposed",
  ]);
});

test("diagnostics records equal State writes as skipped without values", () => {
  const diagnostics = createDiagnostics();

  diagnostics.run(() => {
    const count = state("same-value");
    count.set("same-value");
  });

  expect(diagnostics.getEvents().map((event) => event.type)).toEqual([
    "state.created",
    "state.update_skipped",
  ]);
  expect(JSON.stringify(diagnostics.getEvents())).not.toContain("same-value");
});
