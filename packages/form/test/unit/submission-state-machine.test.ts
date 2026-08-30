import { describe, expect, it } from "vitest";
import { createField } from "../../src/core/field.js";
import { createForm } from "../../src/core/form.js";
import type { SubmitAction } from "../../src/submission/types.js";

describe("Submission State Machine (Model A)", () => {
  it("initializes with idle status and submitting=false", () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
      },
    });

    expect(form.submissionStatus.get()).toBe("idle");
    expect(form.submitting.get()).toBe(false);
  });

  it("follows happy path: idle -> validating -> submitting -> succeeded", async () => {
    const transitions: string[] = [];

    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
      },
    });

    const submitAction: SubmitAction<{ name: string }, { id: number }> = async (values) => {
      transitions.push(`submitting:${form.submissionStatus.get()}`);
      expect(values).toEqual({ name: "Alice" });
      return { id: 123 };
    };

    const promise = form.submit(submitAction);
    expect(form.submitting.get()).toBe(true);

    const result = await promise;

    expect(result).toEqual({ status: "succeeded", result: { id: 123 } });
    expect(form.submissionStatus.get()).toBe("succeeded");
    expect(form.submitting.get()).toBe(false);
    expect(transitions).toEqual(["submitting:submitting"]);
  });

  it("Model A terminal invariant: user edits after succeeded do NOT reset submissionStatus to idle", async () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
      },
    });

    await form.submit(async () => "ok");
    expect(form.submissionStatus.get()).toBe("succeeded");
    expect(form.dirty.get()).toBe(false);

    // User edits the field
    form.fields.name.setValue("Bob");

    expect(form.fields.name.value.get()).toBe("Bob");
    expect(form.dirty.get()).toBe(true);
    // Model A: submissionStatus stays succeeded until next submit attempt or reset/reinitialize
    expect(form.submissionStatus.get()).toBe("succeeded");
  });

  it("Model A terminal invariant: user edits after failed do NOT reset submissionStatus to idle", async () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
      },
    });

    await form.submit(async () => ({
      ok: false,
      issues: [{ code: "duplicate", message: "Name already taken", path: ["name"] }],
    }));

    expect(form.submissionStatus.get()).toBe("failed");

    // User edits the field
    form.fields.name.setValue("Bob");

    expect(form.submissionStatus.get()).toBe("failed");
    expect(form.fields.name.serverIssues.get()).toEqual([]);
  });

  it("reset() and reinitialize() restore submissionStatus to idle", async () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
      },
    });

    await form.submit(async () => "ok");
    expect(form.submissionStatus.get()).toBe("succeeded");

    form.reset();
    expect(form.submissionStatus.get()).toBe("idle");

    await form.submit(async () => "ok");
    expect(form.submissionStatus.get()).toBe("succeeded");

    form.reinitialize({
      value: { name: "Charlie" },
      rawValue: { name: "Charlie" },
    });
    expect(form.submissionStatus.get()).toBe("idle");
  });

  it("duplicate policy: supersede (default) cancels previous submit and lets newer submit win", async () => {
    const form = createForm({
      fields: {
        count: createField({ initialValue: 0 }),
      },
    });

    let firstAborted = false;

    const firstSubmit = form.submit(
      async (_val, { signal }) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (signal.aborted) {
          firstAborted = true;
        }
        return "first";
      },
      { duplicatePolicy: "supersede" },
    );

    // Second submit supersedes first
    const secondSubmit = form.submit(
      async () => {
        return "second";
      },
      { duplicatePolicy: "supersede" },
    );

    const [res1, res2] = await Promise.all([firstSubmit, secondSubmit]);

    expect(res1).toEqual({ status: "cancelled" });
    expect(res2).toEqual({ status: "succeeded", result: "second" });
    expect(firstAborted).toBe(true);
    expect(form.submissionStatus.get()).toBe("succeeded");
  });

  it("duplicate policy: drop returns cancelled immediately for subsequent submit", async () => {
    const form = createForm({
      fields: {
        count: createField({ initialValue: 0 }),
      },
    });

    const firstSubmit = form.submit(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "first";
    });

    const secondSubmit = await form.submit(async () => "second", { duplicatePolicy: "drop" });

    expect(secondSubmit).toEqual({ status: "cancelled" });

    const firstRes = await firstSubmit;
    expect(firstRes).toEqual({ status: "succeeded", result: "first" });
    expect(form.submissionStatus.get()).toBe("succeeded");
  });

  it("duplicate policy: reject throws error if submission in progress", async () => {
    const form = createForm({
      fields: {
        count: createField({ initialValue: 0 }),
      },
    });

    const firstSubmit = form.submit(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "first";
    });

    await expect(form.submit(async () => "second", { duplicatePolicy: "reject" })).rejects.toThrow(
      "Submission is already in progress",
    );

    await firstSubmit;
  });

  it("cancelSubmit() aborts in-flight submit and sets status to cancelled", async () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
      },
    });

    let aborted = false;

    const submitPromise = form.submit(async (_val, { signal }) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (signal.aborted) {
        aborted = true;
      }
      return "done";
    });

    expect(form.submitting.get()).toBe(true);
    form.cancelSubmit();

    expect(form.submissionStatus.get()).toBe("cancelled");
    expect(form.submitting.get()).toBe(false);

    const result = await submitPromise;
    expect(result).toEqual({ status: "cancelled" });
    expect(aborted).toBe(true);
  });

  it("re-throws unexpected submit action errors to caller and sets status to failed", async () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
      },
    });

    const networkError = new Error("Network unreachable");

    await expect(
      form.submit(async () => {
        throw networkError;
      }),
    ).rejects.toThrow("Network unreachable");

    expect(form.submissionStatus.get()).toBe("failed");
    expect(form.submitting.get()).toBe(false);
  });

  it("handles AbortError from submit action gracefully as cancelled status", async () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
      },
    });

    const abortError = new Error("This operation was aborted");
    abortError.name = "AbortError";

    const result = await form.submit(async () => {
      throw abortError;
    });

    expect(result).toEqual({ status: "cancelled" });
    expect(form.submissionStatus.get()).toBe("cancelled");
  });

  it("form.dispose() cancels active submission", async () => {
    const form = createForm({
      fields: {
        name: createField({ initialValue: "Alice" }),
      },
    });

    let signalAborted = false;

    const promise = form.submit(async (_val, { signal }) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (signal.aborted) {
        signalAborted = true;
      }
      return "ok";
    });

    form.dispose();

    const result = await promise;
    expect(result).toEqual({ status: "cancelled" });
    expect(signalAborted).toBe(true);
  });
});
