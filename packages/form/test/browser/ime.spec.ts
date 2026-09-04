import { test, expect } from "@playwright/test";

test.describe("IME Composition Event Sequencing & Invariants", () => {
  test("P1K-H09: handles Japanese composition sequence (Hiragana 'ka')", async ({ page }) => {
    await page.goto("/?scenario=ime-text");

    const input = page.locator("#ime-input");
    await input.focus();

    // Dispatch synthetic browser composition event sequence matching real Chromium IME
    await page.evaluate(() => {
      const el = document.getElementById("ime-input") as HTMLInputElement;

      el.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
      el.dispatchEvent(new CompositionEvent("compositionupdate", { data: "か" }));

      // Browser updates input.value during composition
      el.value = "か";
      el.dispatchEvent(new InputEvent("input", { data: "か", isComposing: true }));

      el.dispatchEvent(new CompositionEvent("compositionend", { data: "か" }));
      el.dispatchEvent(new InputEvent("input", { data: "か", isComposing: false }));
    });

    const state = await page.evaluate(() => {
      const b = window.__viiP1k!;
      const el = document.getElementById("ime-input") as HTMLInputElement;
      return {
        domValue: el.value,
        fieldRaw: b.field.rawValue.get(),
        events: b.imeEvents,
        validationCount: b.validationCount,
      };
    });

    expect(state.domValue).toBe("か");
    expect(state.fieldRaw).toBe("か");
    expect(state.events.length).toBe(5);
    expect(state.events[0].type).toBe("compositionstart");
    expect(state.events[1].type).toBe("compositionupdate");
    expect(state.events[2].type).toBe("input");
    expect(state.events[3].type).toBe("compositionend");
    expect(state.events[4].type).toBe("input");
  });

  test("P1K-H09: handles Korean multi-step jamo composition sequence ('ga')", async ({ page }) => {
    await page.goto("/?scenario=ime-text");

    const input = page.locator("#ime-input");
    await input.focus();

    // Korean IME: 'ㄱ' -> '가'
    await page.evaluate(() => {
      const el = document.getElementById("ime-input") as HTMLInputElement;

      el.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));

      // Step 1: consonant 'ㄱ'
      el.dispatchEvent(new CompositionEvent("compositionupdate", { data: "ㄱ" }));
      el.value = "ㄱ";
      el.dispatchEvent(new InputEvent("input", { data: "ㄱ", isComposing: true }));

      // Step 2: syllable composed to '가'
      el.dispatchEvent(new CompositionEvent("compositionupdate", { data: "가" }));
      el.value = "가";
      el.dispatchEvent(new InputEvent("input", { data: "가", isComposing: true }));

      el.dispatchEvent(new CompositionEvent("compositionend", { data: "가" }));
      el.dispatchEvent(new InputEvent("input", { data: "가", isComposing: false }));
    });

    const state = await page.evaluate(() => {
      const b = window.__viiP1k!;
      const el = document.getElementById("ime-input") as HTMLInputElement;
      return {
        domValue: el.value,
        fieldRaw: b.field.rawValue.get(),
      };
    });

    expect(state.domValue).toBe("가");
    expect(state.fieldRaw).toBe("가");
  });

  test("P1K-H09: handles Chinese pinyin composition sequence ('ni' -> '你')", async ({ page }) => {
    await page.goto("/?scenario=ime-text");

    const input = page.locator("#ime-input");
    await input.focus();

    // Chinese Pinyin IME: 'ni' composed to '你'
    await page.evaluate(() => {
      const el = document.getElementById("ime-input") as HTMLInputElement;

      el.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
      el.dispatchEvent(new CompositionEvent("compositionupdate", { data: "ni" }));
      el.value = "ni";
      el.dispatchEvent(new InputEvent("input", { data: "ni", isComposing: true }));

      el.dispatchEvent(new CompositionEvent("compositionend", { data: "你" }));
      el.value = "你";
      el.dispatchEvent(new InputEvent("input", { data: "你", isComposing: false }));
    });

    const state = await page.evaluate(() => {
      const b = window.__viiP1k!;
      const el = document.getElementById("ime-input") as HTMLInputElement;
      return {
        domValue: el.value,
        fieldRaw: b.field.rawValue.get(),
      };
    });

    expect(state.domValue).toBe("你");
    expect(state.fieldRaw).toBe("你");
  });
});
