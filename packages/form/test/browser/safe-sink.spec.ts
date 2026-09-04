import { test, expect } from "@playwright/test";

test.describe("Safe Issue-Message Sink Security Regression", () => {
  test("P1K-H05: projects hostile issue messages strictly as textContent without HTML evaluation", async ({
    page,
  }) => {
    await page.goto("/?scenario=safe-sink");

    const issue = page.locator("#sink-issue");
    const payload = '<img src=x onerror="globalThis.__viiP1kXss = true">';

    // The textContent must equal the exact raw string
    expect(await issue.textContent()).toBe(payload);

    // Assert that no HTML element nodes were parsed or inserted
    const childElementCount = await page.evaluate(() => {
      const el = document.getElementById("sink-issue")!;
      return el.children.length;
    });
    expect(childElementCount).toBe(0);

    // Assert that no script or onerror handler was executed
    const xssExecuted = await page.evaluate(() => window.__viiP1kXss);
    expect(xssExecuted).toBeUndefined();
  });

  test("P1K-H05: renders script tags harmlessly as textContent", async ({ page }) => {
    await page.goto("/?scenario=safe-sink");

    const input = page.locator("#sink-input");
    const issue = page.locator("#sink-issue");
    const scriptPayload = "<script>window.__viiP1kXss = true</script>";

    await input.fill("script");

    expect(await issue.textContent()).toBe(scriptPayload);

    const childElementCount = await page.evaluate(() => {
      return document.getElementById("sink-issue")!.children.length;
    });
    expect(childElementCount).toBe(0);

    const xssExecuted = await page.evaluate(() => window.__viiP1kXss);
    expect(xssExecuted).toBeUndefined();
  });
});
