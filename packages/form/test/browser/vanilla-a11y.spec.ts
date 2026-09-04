import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Vanilla DOM Accessibility & ARIA Invariants", () => {
  test("produces zero WCAG accessibility violations on semantic form fixture", async ({ page }) => {
    await page.goto("/?scenario=a11y-full");

    const accessibilityScanResults = await new AxeBuilder({ page }).include("#a11y-form").analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("P1K-H03: preserves and restores pre-existing aria-invalid baseline", async ({ page }) => {
    await page.goto("/?scenario=a11y-full");

    const emailInput = page.locator("#a11y-email");

    // Initially valid with pre-existing baseline 'grammar'
    expect(await emailInput.getAttribute("aria-invalid")).toBe("grammar");
    expect(await emailInput.getAttribute("aria-describedby")).toBe("a11y-email-issue");

    // Make field invalid
    await emailInput.fill("invalid-email");

    expect(await emailInput.getAttribute("aria-invalid")).toBe("true");

    // Restore to valid email
    await emailInput.fill("valid@example.com");

    expect(await emailInput.getAttribute("aria-invalid")).toBe("grammar");

    // Dispose binding: must restore baseline and clean up describedby
    await page.evaluate(() => {
      window.__viiP1k!.emailBinding.dispose();
    });

    expect(await emailInput.getAttribute("aria-invalid")).toBe("grammar");
    expect(await emailInput.getAttribute("aria-describedby")).toBeNull();
  });

  test("P1K-H04: coordinates overlapping aria-invalid bindings with WeakMap ownership", async ({
    page,
  }) => {
    await page.goto("/?scenario=overlapping-aria");

    const input = page.locator("#overlap-input");

    // Binding A is valid, Binding B is invalid -> Effective is "true"
    expect(await input.getAttribute("aria-invalid")).toBe("true");

    // Dispose valid Binding A first -> still "true" because Binding B remains invalid
    await page.evaluate(() => {
      window.__viiP1k!.bindingA.dispose();
    });

    expect(await input.getAttribute("aria-invalid")).toBe("true");

    // Dispose invalid Binding B -> restores exact application baseline "grammar"
    await page.evaluate(() => {
      window.__viiP1k!.bindingB.dispose();
    });

    expect(await input.getAttribute("aria-invalid")).toBe("grammar");
  });

  test("P1K-H04 (reverse disposal): restores baseline when invalid binding disposed before valid binding", async ({
    page,
  }) => {
    await page.goto("/?scenario=overlapping-aria");

    const input = page.locator("#overlap-input");

    // Dispose invalid Binding B first -> becomes valid (Binding A), restoring baseline "grammar"
    await page.evaluate(() => {
      window.__viiP1k!.bindingB.dispose();
    });

    expect(await input.getAttribute("aria-invalid")).toBe("grammar");

    // Dispose remaining Binding A -> remains "grammar"
    await page.evaluate(() => {
      window.__viiP1k!.bindingA.dispose();
    });

    expect(await input.getAttribute("aria-invalid")).toBe("grammar");
  });
});
