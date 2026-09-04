import { test, expect } from "@playwright/test";

test.describe("Vanilla DOM Field Interactions & Event Semantics", () => {
  test.beforeEach(async ({ page }) => {
    // Monitor unexpected errors
    page.on("pageerror", (err) => {
      throw new Error(`Unexpected page error: ${err.message}`);
    });
  });

  test("P1K-H01: commits exactly once per text keystroke without duplicate change validation", async ({
    page,
  }) => {
    await page.goto("/?scenario=vanilla-text");

    const input = page.locator("#text-input");
    await input.focus();

    // Type a single character
    await page.keyboard.press("a");

    // Retrieve bridge counters
    const counts = await page.evaluate(() => {
      const b = window.__viiP1k!;
      return {
        inputEvents: b.inputEventCount,
        changeEvents: b.changeEventCount,
        rawCommits: b.rawCommitCount,
        validationInvocations: b.validationCount,
        value: (document.getElementById("text-input") as HTMLInputElement).value,
      };
    });

    expect(counts.value).toBe("a");
    expect(counts.inputEvents).toBe(1);
    expect(counts.changeEvents).toBe(0);
    expect(counts.rawCommits).toBe(1);
    expect(counts.validationInvocations).toBe(1);
  });

  test("handles checkbox change interaction with single commit", async ({ page }) => {
    await page.goto("/?scenario=vanilla-checkbox");

    const checkbox = page.locator("#checkbox-input");
    await checkbox.click();

    const counts = await page.evaluate(() => {
      const b = window.__viiP1k!;
      return {
        changeEvents: b.changeEventCount,
        rawCommits: b.rawCommitCount,
        checked: (document.getElementById("checkbox-input") as HTMLInputElement).checked,
        fieldValue: b.field.value.get(),
      };
    });

    expect(counts.checked).toBe(true);
    expect(counts.fieldValue).toBe(true);
    expect(counts.changeEvents).toBe(1);
    expect(counts.rawCommits).toBe(1);
  });

  test("handles radio group selection preserving native group behavior", async ({ page }) => {
    await page.goto("/?scenario=vanilla-radio");

    const radioA = page.locator("#radio-a");
    const radioB = page.locator("#radio-b");

    expect(await radioA.isChecked()).toBe(true);
    expect(await radioB.isChecked()).toBe(false);

    await radioB.click();

    const state = await page.evaluate(() => {
      const b = window.__viiP1k!;
      return {
        radioAChecked: (document.getElementById("radio-a") as HTMLInputElement).checked,
        radioBChecked: (document.getElementById("radio-b") as HTMLInputElement).checked,
        fieldValue: b.field.value.get(),
      };
    });

    expect(state.radioAChecked).toBe(false);
    expect(state.radioBChecked).toBe(true);
    expect(state.fieldValue).toBe("B");
  });

  test("handles select-one dropdown selection", async ({ page }) => {
    await page.goto("/?scenario=vanilla-select-one");

    const select = page.locator("#select-input");
    await select.selectOption("banana");

    const fieldValue = await page.evaluate(() => window.__viiP1k!.field.value.get());
    expect(fieldValue).toBe("banana");
  });

  test("handles file input selection via setInputFiles", async ({ page }) => {
    await page.goto("/?scenario=vanilla-file");

    const fileInput = page.locator("#file-input");
    await fileInput.setInputFiles({
      name: "report.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Synthetic report content"),
    });

    const fileName = await page.evaluate(() => {
      const files = window.__viiP1k!.field.value.get() as FileList | null;
      return files ? files[0]?.name : null;
    });

    expect(fileName).toBe("report.txt");
  });

  test("disposes DOM listeners cleanly so subsequent inputs do not mutate field", async ({
    page,
  }) => {
    await page.goto("/?scenario=vanilla-text");

    const input = page.locator("#text-input");
    await input.fill("initial");

    // Dispose binding
    await page.evaluate(() => {
      window.__viiP1k!.binding.dispose();
    });

    // Interact with input again
    await input.fill("modified-after-dispose");

    const finalState = await page.evaluate(() => {
      const b = window.__viiP1k!;
      return {
        domValue: (document.getElementById("text-input") as HTMLInputElement).value,
        fieldRaw: b.field.rawValue.get(),
      };
    });

    expect(finalState.domValue).toBe("modified-after-dispose");
    expect(finalState.fieldRaw).toBe("initial");
  });
});
