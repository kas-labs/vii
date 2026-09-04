import { test, expect } from "@playwright/test";

test.describe("Native Form Submission & Error Containment", () => {
  test("submits form via button click, prevents default navigation, and executes action once", async ({
    page,
  }) => {
    await page.goto("/?scenario=submit-native");

    const input = page.locator("#submit-input");
    const submitBtn = page.locator("#submit-btn");

    await input.fill("test-user");
    await submitBtn.click();

    // Verify submission completed
    await page.waitForFunction(() => window.__viiP1k?.lastSubmitResult !== undefined);

    const bridge = await page.evaluate(() => {
      const b = window.__viiP1k!;
      return {
        actionCalls: b.actionCallCount,
        result: b.lastSubmitResult,
      };
    });

    expect(bridge.actionCalls).toBe(1);
    expect(bridge.result).toEqual({
      saved: true,
      values: { username: "test-user" },
    });
  });

  test("submits form via Enter key press inside text input", async ({ page }) => {
    await page.goto("/?scenario=submit-native");

    const input = page.locator("#submit-input");
    await input.fill("enter-user");
    await input.press("Enter");

    await page.waitForFunction(() => window.__viiP1k?.lastSubmitResult !== undefined);

    const bridge = await page.evaluate(() => {
      const b = window.__viiP1k!;
      return {
        actionCalls: b.actionCallCount,
        result: b.lastSubmitResult,
      };
    });

    expect(bridge.actionCalls).toBe(1);
    expect(bridge.result).toEqual({
      saved: true,
      values: { username: "enter-user" },
    });
  });

  test("P1K-H06: contains unexpected submit action rejection and routes to onSubmitException", async ({
    page,
  }) => {
    await page.goto("/?scenario=submit-exception");

    const submitBtn = page.locator("#submit-btn");
    await submitBtn.click();

    // Wait for exception handler to be called
    await page.waitForFunction(() => window.__viiP1k?.lastException !== undefined);

    const report = await page.evaluate(() => {
      const b = window.__viiP1k!;
      return {
        actionCalls: b.actionCallCount,
        exceptionMessage:
          b.lastException instanceof Error ? b.lastException.message : String(b.lastException),
        unhandledCount: b.unhandledRejections.length,
      };
    });

    expect(report.actionCalls).toBe(1);
    expect(report.exceptionMessage).toContain("Simulated network explosion");
    // Window MUST NOT have received any unhandledrejection event
    expect(report.unhandledCount).toBe(0);
  });
});
