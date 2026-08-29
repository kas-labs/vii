import { describe, expect, it, vi } from "vitest";
import { createField, type AsyncValidationRule, type SyncValidationRule } from "../../src/index.js";

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("P1e: Mixed sync + async validation rule semantics", () => {
  it("sync failure prevents async result commit even when async rule was invoked", async () => {
    const asyncStarted = vi.fn();
    const asyncRule: AsyncValidationRule<string> = async () => {
      asyncStarted();
      return null;
    };
    const syncFailRule: SyncValidationRule<string> = () => ({
      code: "sync_fail",
      message: "Sync failed",
      source: "validation",
    });

    const field = createField({
      initialValue: "init",
      rules: [syncFailRule, asyncRule],
      validateOn: "manual",
    });

    const issues = field.validate("manual");
    expect(Array.isArray(issues)).toBe(true);
    expect((issues as readonly { code: string }[])[0]?.code).toBe("sync_fail");
    expect(asyncStarted).toHaveBeenCalled();
    expect(field.pending.get()).toBe(false);
  });

  it("async rules run when all preceding sync rules pass", async () => {
    const deferred = createDeferred<null>();
    const asyncRule: AsyncValidationRule<string> = async () => deferred.promise;
    const syncPassRule: SyncValidationRule<string> = () => null;

    const field = createField({
      initialValue: "init",
      rules: [syncPassRule, asyncRule],
      validateOn: "manual",
    });

    const valPromise = field.validate("manual");
    expect(field.pending.get()).toBe(true);
    deferred.resolve(null);
    await valPromise;
    expect(field.pending.get()).toBe(false);
    expect(field.valid.get()).toBe(true);
  });

  it("async started before a later sync failure is cancelled without stale commit", async () => {
    const deferred = createDeferred<{ code: string; source: "validation" } | null>();
    const asyncFirst: AsyncValidationRule<string> = async () => deferred.promise;
    const syncFail: SyncValidationRule<string> = () => ({
      code: "later_sync_fail",
      source: "validation",
    });

    const field = createField({
      initialValue: "init",
      rules: [asyncFirst, syncFail],
      validateOn: "manual",
    });

    const valPromise = field.validate("manual");
    expect(field.pending.get()).toBe(false);

    deferred.resolve({ code: "stale_async", source: "validation" });
    await Promise.resolve();

    const issues = await valPromise;
    expect(issues.some((iss) => iss.code === "later_sync_fail")).toBe(true);
    expect(issues.some((iss) => iss.code === "stale_async")).toBe(false);
  });
});
