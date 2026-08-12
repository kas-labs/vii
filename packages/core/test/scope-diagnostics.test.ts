import { expect, test } from "vitest";
import { createDiagnostics, createScope } from "../src/index.js";

test("diagnostics records scope names and parent ownership metadata", () => {
  const diagnostics = createDiagnostics({ clock: () => 123 });

  diagnostics.run(() => {
    const root = createScope({ name: "application" });
    root.createChild({ name: "checkout" });
    root.dispose();
  });

  const createdScopes = diagnostics.getEvents().filter((event) => event.type === "scope.created");

  expect(createdScopes).toHaveLength(2);
  expect(createdScopes[0]).toMatchObject({
    payload: { scopeId: "scope-1", name: "application" },
  });
  expect(createdScopes[1]).toMatchObject({
    payload: { scopeId: "scope-2", name: "checkout", parentScopeId: "scope-1" },
  });
});
