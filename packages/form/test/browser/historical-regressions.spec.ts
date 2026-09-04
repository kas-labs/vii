import { test, expect } from "@playwright/test";

test.describe("Historical Regressions Suite", () => {
  test("P1K-H11: clears localized server issue on edit while preserving sibling issues", async ({
    page,
  }) => {
    await page.goto("/?scenario=server-issues");

    // Trigger server issue distribution via submission
    await page.evaluate(async () => {
      await window.__viiP1k!.triggerServerIssues();
    });

    const inputA = page.locator("#field-a");
    const issueA = page.locator("#issue-a");
    const inputB = page.locator("#field-b");
    const issueB = page.locator("#issue-b");

    // Both fields invalid with server issues
    expect(await inputA.getAttribute("aria-invalid")).toBe("true");
    expect(await issueA.textContent()).toBe("Server error on field A");
    expect(await inputB.getAttribute("aria-invalid")).toBe("true");
    expect(await issueB.textContent()).toBe("Server error on field B");

    // Edit only Field A
    await inputA.fill("alpha-updated");

    // Field A server issue and ARIA invalid must be cleared
    expect(await inputA.getAttribute("aria-invalid")).toBeNull();
    expect(await issueA.textContent()).toBe("");

    // Sibling Field B must retain its server issue and aria-invalid="true"
    expect(await inputB.getAttribute("aria-invalid")).toBe("true");
    expect(await issueB.textContent()).toBe("Server error on field B");
  });

  test("P1K-H13: fails closed with TypeError on unsupported DOM elements", async ({ page }) => {
    await page.goto("/?scenario=vanilla-text");

    const errors = await page.evaluate(() => {
      return window.__viiP1k!.testUnsupported();
    });

    expect(errors.divErr).toContain("<div> is not a supported form control");
    expect(errors.btnErr).toContain('input type "button" is not a supported form control');
  });

  test("P1K-H14: rejects select-multiple with explicit TypeError", async ({ page }) => {
    await page.goto("/?scenario=vanilla-text");

    const selectMultipleErr = await page.evaluate(() => {
      return window.__viiP1k!.testSelectMultiple();
    });

    expect(selectMultipleErr).toContain("select-multiple is not supported in P1i");
  });
});
