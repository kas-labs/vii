import { createDiagnostics } from "@vii-labs/core";
import { describe, expect, it } from "vitest";
import { createField } from "../../src/core/field.js";
import { createForm } from "../../src/core/form.js";

describe("Diagnostics Privacy Sentinel", () => {
  it("never includes form values, raw values, or server issue text in diagnostic telemetry", async () => {
    const diagnostics = createDiagnostics({ mode: "development" });

    const secretPassword = "SuperSecretPassword123!";
    const secretServerErrorMessage = "Sensitive database detail in error string";

    const form = createForm({
      diagnostics,
      fields: {
        password: createField({ initialValue: secretPassword }),
      },
    });

    await form.submit(async () => ({
      ok: false,
      issues: [
        {
          code: "auth.error",
          message: secretServerErrorMessage,
          path: ["password"],
        },
      ],
    }));

    const events = diagnostics.getEvents();
    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      const payloadStr = JSON.stringify(event.payload);

      // Verify no sensitive payload data leaked
      expect(payloadStr).not.toContain(secretPassword);
      expect(payloadStr).not.toContain(secretServerErrorMessage);
    }
  });
});
