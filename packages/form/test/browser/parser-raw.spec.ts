import { test, expect } from "@playwright/test";

test.describe("Parser-Backed Raw Intermediate Presentation", () => {
  test("P1K-H02: preserves intermediate invalid raw presentation without snap-back", async ({
    page,
  }) => {
    await page.goto("/?scenario=parser-raw");

    const input = page.locator("#parser-input");
    const issue = page.locator("#parser-issue");

    // Initial state
    expect(await input.inputValue()).toBe("42");
    expect(await issue.textContent()).toBe("");

    // Clear and type intermediate '-'
    await input.fill("");
    await input.focus();
    await page.keyboard.press("-");

    const dashState = await page.evaluate(() => {
      const b = window.__viiP1k!;
      const el = document.getElementById("parser-input") as HTMLInputElement;
      return {
        domValue: el.value,
        fieldRaw: b.field.rawValue.get(),
        fieldValue: b.field.value.get(),
        parseStatus: b.field.parseStatus.get(),
        issues: b.field.issues.get(),
      };
    });

    expect(dashState.domValue).toBe("-");
    expect(dashState.fieldRaw).toBe("-");
    expect(dashState.fieldValue).toBe(42); // Preserves last good parsed value
    expect(dashState.parseStatus).toBe("invalid");
    expect(dashState.issues.length).toBeGreaterThan(0);
    expect(await issue.textContent()).toContain("Incomplete number");

    // Type intermediate decimal '1.'
    await input.fill("1.");

    const decimalState = await page.evaluate(() => {
      const b = window.__viiP1k!;
      const el = document.getElementById("parser-input") as HTMLInputElement;
      return {
        domValue: el.value,
        fieldRaw: b.field.rawValue.get(),
        fieldValue: b.field.value.get(),
        parseStatus: b.field.parseStatus.get(),
      };
    });

    expect(decimalState.domValue).toBe("1.");
    expect(decimalState.fieldRaw).toBe("1.");
    expect(decimalState.fieldValue).toBe(42); // No snap-back
    expect(decimalState.parseStatus).toBe("invalid");

    // Complete valid input: '1.5'
    await input.fill("1.5");

    const validState = await page.evaluate(() => {
      const b = window.__viiP1k!;
      const el = document.getElementById("parser-input") as HTMLInputElement;
      return {
        domValue: el.value,
        fieldRaw: b.field.rawValue.get(),
        fieldValue: b.field.value.get(),
        parseStatus: b.field.parseStatus.get(),
        issues: b.field.issues.get(),
      };
    });

    expect(validState.domValue).toBe("1.5");
    expect(validState.fieldRaw).toBe("1.5");
    expect(validState.fieldValue).toBe(1.5);
    expect(validState.parseStatus).toBe("parsed");
    expect(validState.issues.length).toBe(0);
    expect(await issue.textContent()).toBe("");
  });
});
