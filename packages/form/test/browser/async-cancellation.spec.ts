import { test, expect } from "@playwright/test";

test.describe("Async Validation Cancellation & Stale Resolution", () => {
  test("P1K-H08: supersedes pending async validation when fresh edit occurs", async ({ page }) => {
    await page.goto("/?scenario=async-cancellation");

    const input = page.locator("#async-input");
    const issue = page.locator("#async-issue");

    // Edit 1: type 'first'
    await input.fill("first");

    // Verify pending
    const isPendingFirst = await page.evaluate(() => window.__viiP1k!.field.pending.get());
    expect(isPendingFirst).toBe(true);

    // Edit 2: type 'second' before 'first' resolves
    await input.fill("second");

    // Resolve 'second' first with valid result (null)
    await page.evaluate(() => {
      const resolver2 = window.__viiP1k!.resolvers["second"];
      if (resolver2) resolver2(null);
    });

    // Wait for 'second' validation to settle
    await page.waitForFunction(() => !window.__viiP1k?.field.pending.get());

    expect(await issue.textContent()).toBe("");

    // Resolve 'first' late with an error
    await page.evaluate(() => {
      const resolver1 = window.__viiP1k!.resolvers["first"];
      if (resolver1) resolver1({ code: "stale_error", message: "Stale error from first" });
    });

    // Ensure microtasks flush
    await page.waitForTimeout(50);

    const finalState = await page.evaluate(() => {
      const b = window.__viiP1k!;
      return {
        issues: b.field.issues.get(),
        value: b.field.value.get(),
        valid: b.field.valid.get(),
      };
    });

    // The stale error from 'first' must NOT overwrite the valid state of 'second'
    expect(finalState.value).toBe("second");
    expect(finalState.valid).toBe(true);
    expect(finalState.issues).toEqual([]);
    expect(await issue.textContent()).toBe("");
  });
});
