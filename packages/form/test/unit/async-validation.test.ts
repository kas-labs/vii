import { describe, expect, it, vi } from "vitest";
import { createField, type AsyncValidationRule, type FieldIssue } from "../../src/index.js";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("P1e: Asynchronous Validation, Revisions & Cancellation", () => {
  it("transitions pending true -> false and updates valid on async resolution", async () => {
    const deferred = createDeferred<FieldIssue | null>();
    const asyncRule: AsyncValidationRule<string> = async () => deferred.promise;

    const field = createField({
      initialValue: "alice",
      rules: [asyncRule],
      validateOn: "manual",
    });

    expect(field.pending.get()).toBe(false);

    const valPromise = field.validate("manual");
    expect(field.pending.get()).toBe(true);

    deferred.resolve(null);
    const issues = await valPromise;

    expect(issues).toHaveLength(0);
    expect(field.pending.get()).toBe(false);
    expect(field.valid.get()).toBe(true);
  });

  it("updates issues and invalid when async rule returns an issue", async () => {
    const deferred = createDeferred<FieldIssue>();
    const asyncRule: AsyncValidationRule<string> = async () => deferred.promise;

    const field = createField({
      initialValue: "bob",
      rules: [asyncRule],
      validateOn: "manual",
    });

    const valPromise = field.validate("manual");
    expect(field.pending.get()).toBe(true);

    deferred.resolve({
      code: "username_taken",
      message: "Username already taken",
      source: "validation",
    });

    const issues = await valPromise;
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe("username_taken");
    expect(field.pending.get()).toBe(false);
    expect(field.valid.get()).toBe(false);
    expect(field.invalid.get()).toBe(true);
  });

  it("aborts active AbortSignal when a newer mutation supersedes previous async validation", async () => {
    const deferredA = createDeferred<FieldIssue | null>();
    const deferredB = createDeferred<FieldIssue | null>();

    let signalA: AbortSignal | undefined;
    let signalB: AbortSignal | undefined;

    const asyncRule: AsyncValidationRule<string> = async (val, { signal }) => {
      if (val === "valueA") {
        signalA = signal;
        return deferredA.promise;
      }
      if (val === "valueB") {
        signalB = signal;
        return deferredB.promise;
      }
      return null;
    };

    const field = createField({
      initialValue: "init",
      rules: [asyncRule],
      validateOn: "change",
    });

    field.setValue("valueA");
    expect(field.pending.get()).toBe(true);
    expect(signalA?.aborted).toBe(false);

    // Mutation B supersedes A
    field.setValue("valueB");
    expect(signalA?.aborted).toBe(true);
    expect(signalB?.aborted).toBe(false);
    expect(field.pending.get()).toBe(true);

    // A resolves late with an issue
    deferredA.resolve({
      code: "error_from_A",
      message: "Stale issue from A",
      source: "validation",
    });
    await Promise.resolve();

    // Stale issue from A must NOT commit
    expect(field.issues.get()).toHaveLength(0);
    expect(field.pending.get()).toBe(true);

    // B resolves with valid
    deferredB.resolve(null);
    await new Promise((r) => setTimeout(r, 10));

    expect(field.issues.get()).toHaveLength(0);
    expect(field.pending.get()).toBe(false);
    expect(field.valid.get()).toBe(true);
  });

  it("strictly suppresses stale completion even if validator ignores AbortSignal", async () => {
    const deferredA = createDeferred<FieldIssue>();
    const deferredB = createDeferred<FieldIssue | null>();

    const stubbornRule: AsyncValidationRule<string> = async (val) => {
      if (val === "A") return deferredA.promise;
      return deferredB.promise;
    };

    const field = createField({
      initialValue: "init",
      rules: [stubbornRule],
      validateOn: "change",
    });

    field.setValue("A");
    field.setValue("B"); // supersedes A

    // A resolves late ignoring abort signal
    deferredA.resolve({
      code: "stale_issue",
      source: "validation",
    });
    await new Promise((r) => setTimeout(r, 10));

    expect(field.issues.get()).toEqual([]);

    deferredB.resolve(null);
    await new Promise((r) => setTimeout(r, 10));

    expect(field.issues.get()).toEqual([]);
    expect(field.valid.get()).toBe(true);
  });

  it("cancels active async validation on reset()", async () => {
    let signal: AbortSignal | undefined;
    const asyncRule: AsyncValidationRule<string> = async (_val, ctx) => {
      signal = ctx.signal;
      return new Promise(() => {}); // never resolves
    };

    const field = createField({
      initialValue: "init",
      rules: [asyncRule],
      validateOn: "change",
    });

    field.setValue("changed");
    expect(field.pending.get()).toBe(true);
    expect(signal?.aborted).toBe(false);

    field.reset();
    expect(signal?.aborted).toBe(true);
    expect(field.pending.get()).toBe(false);
    expect(field.value.get()).toBe("init");
  });

  it("cancels active async validation on dispose()", async () => {
    let signal: AbortSignal | undefined;
    const asyncRule: AsyncValidationRule<string> = async (_val, ctx) => {
      signal = ctx.signal;
      return new Promise(() => {});
    };

    const field = createField({
      initialValue: "init",
      rules: [asyncRule],
      validateOn: "change",
    });

    field.setValue("changed");
    expect(field.pending.get()).toBe(true);

    field.dispose();
    expect(signal?.aborted).toBe(true);
    expect(field.pending.get()).toBe(false);
  });

  it("does not generate unhandled promise rejection when fire-and-forget async rule rejects", async () => {
    const unhandledList: unknown[] = [];
    const handler = (reason: unknown) => unhandledList.push(reason);
    process.on("unhandledRejection", handler);

    const failingRule: AsyncValidationRule<string> = async () => {
      throw new Error("Network timeout during async rule execution");
    };

    const field = createField({
      initialValue: "init",
      rules: [failingRule],
      validateOn: "change",
    });

    field.setValue("new_value");
    await new Promise((r) => setTimeout(r, 20));

    process.off("unhandledRejection", handler);
    expect(unhandledList).toEqual([]);
    expect(field.pending.get()).toBe(false);
  });

  it("supports debounceMs on change trigger", async () => {
    const ruleSpy = vi.fn(async () => null);

    const field = createField({
      initialValue: "init",
      rules: [ruleSpy],
      validateOn: "change",
      debounceMs: 50,
    });

    field.setValue("a");
    field.setValue("ab");
    field.setValue("abc");

    expect(ruleSpy).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 70));

    expect(ruleSpy).toHaveBeenCalledTimes(1);
    expect(ruleSpy).toHaveBeenCalledWith("abc", expect.anything());
    expect(field.pending.get()).toBe(false);
  });
});
