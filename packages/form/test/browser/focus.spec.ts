import { test, expect } from "@playwright/test";

test.describe("Focus Management & Transition Invariants", () => {
  test("transitions touched to true and executes blur validation exactly once on blur", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-blur");

    const blurInput = page.locator("#blur-input");
    const otherInput = page.locator("#other-input");
    const issue = page.locator("#blur-issue");

    // Initially pristine, untouched, unvalidated
    const initialTouched = await page.evaluate(() => window.__viiP1k!.field.touched.get());
    expect(initialTouched).toBe(false);

    // Focus first input
    await blurInput.focus();

    // Blur by moving focus to other input
    await otherInput.focus();

    const blurredState = await page.evaluate(() => {
      const b = window.__viiP1k!;
      return {
        touched: b.field.touched.get(),
        validationCount: b.validationCount,
        activeId: document.activeElement?.id,
      };
    });

    expect(blurredState.touched).toBe(true);
    expect(blurredState.validationCount).toBe(1);
    expect(blurredState.activeId).toBe("other-input");
    expect(await issue.textContent()).toBe("Field is required");
  });

  test("P1K-H10: preserves input focus when validation issues and ARIA attributes project", async ({
    page,
  }) => {
    await page.goto("/?scenario=issue-focus");

    const input = page.locator("#focus-input");
    const issue = page.locator("#focus-issue");

    await input.focus();

    // Type 'error' to trigger invalid state
    await input.fill("error");

    const state = await page.evaluate(() => {
      const b = window.__viiP1k!;
      const el = document.getElementById("focus-input") as HTMLInputElement;
      return {
        activeId: document.activeElement?.id,
        ariaInvalid: el.getAttribute("aria-invalid"),
        invalid: b.field.invalid.get(),
      };
    });

    expect(state.invalid).toBe(true);
    expect(state.ariaInvalid).toBe("true");
    expect(await issue.textContent()).toBe("Error message text");
    // Active element must remain the focused input
    expect(state.activeId).toBe("focus-input");
  });

  test("programmatic field update does not steal focus from currently focused element", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-blur");

    const otherInput = page.locator("#other-input");
    await otherInput.focus();

    // Programmatically mutate first field
    await page.evaluate(() => {
      window.__viiP1k!.field.setValue("programmatic-val");
    });

    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("other-input");
  });
});
