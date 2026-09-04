import { test, expect } from "@playwright/test";

test.describe("IME Composition Event Sequencing & Invariants", () => {
  test("P1K-H09: handles Japanese composition sequence (Hiragana 'ka')", async ({ page }) => {
    await page.goto("/?scenario=ime-text");
    const input = page.locator("#ime-input");
    await input.focus();

    const log = await page.evaluate(() => {
      const el = document.getElementById("ime-input") as HTMLInputElement;
      const b = window.__viiP1k!;
      const snap = (step: string) => ({
        step,
        domValue: el.value,
        fieldRaw: b.field.rawValue.get(),
        validationCount: b.validationCount,
        rawCommitCount: b.rawCommitCount,
      });

      const records = [snap("initial")];

      el.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
      el.dispatchEvent(new CompositionEvent("compositionupdate", { data: "か" }));

      el.value = "か";
      el.dispatchEvent(new InputEvent("input", { data: "か", isComposing: true }));
      records.push(snap("composing"));

      el.dispatchEvent(new CompositionEvent("compositionend", { data: "か" }));
      records.push(snap("compositionend"));

      el.dispatchEvent(new InputEvent("input", { data: "か", isComposing: false }));
      records.push(snap("committed"));

      return {
        records,
        events: b.imeEvents?.map((e) => ({ type: e.type, isComposing: e.isComposing })),
      };
    });

    const composing = log.records.find((r) => r.step === "composing")!;
    expect(composing.domValue).toBe("か");
    expect(composing.fieldRaw).toBe("");
    expect(composing.validationCount).toBe(0);
    expect(composing.rawCommitCount).toBe(0);

    const afterEnd = log.records.find((r) => r.step === "compositionend")!;
    expect(afterEnd.fieldRaw).toBe("");
    expect(afterEnd.validationCount).toBe(0);
    expect(afterEnd.rawCommitCount).toBe(0);

    const final = log.records.find((r) => r.step === "committed")!;
    expect(final.domValue).toBe("か");
    expect(final.fieldRaw).toBe("か");
    expect(final.validationCount).toBe(1);
    expect(final.rawCommitCount).toBe(1);

    expect(log.events).toEqual([
      { type: "compositionstart", isComposing: undefined },
      { type: "compositionupdate", isComposing: undefined },
      { type: "input", isComposing: true },
      { type: "compositionend", isComposing: undefined },
      { type: "input", isComposing: false },
    ]);
  });

  test("P1K-H09: handles Korean multi-step jamo composition sequence ('ga')", async ({ page }) => {
    await page.goto("/?scenario=ime-text");
    const input = page.locator("#ime-input");
    await input.focus();

    const records = await page.evaluate(() => {
      const el = document.getElementById("ime-input") as HTMLInputElement;
      const b = window.__viiP1k!;
      const snap = (step: string) => ({
        step,
        domValue: el.value,
        fieldRaw: b.field.rawValue.get(),
        validationCount: b.validationCount,
        rawCommitCount: b.rawCommitCount,
      });

      const res = [snap("initial")];
      el.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));

      el.dispatchEvent(new CompositionEvent("compositionupdate", { data: "ㄱ" }));
      el.value = "ㄱ";
      el.dispatchEvent(new InputEvent("input", { data: "ㄱ", isComposing: true }));
      res.push(snap("jamo-1"));

      el.dispatchEvent(new CompositionEvent("compositionupdate", { data: "가" }));
      el.value = "가";
      el.dispatchEvent(new InputEvent("input", { data: "가", isComposing: true }));
      res.push(snap("jamo-2"));

      el.dispatchEvent(new CompositionEvent("compositionend", { data: "가" }));
      res.push(snap("compositionend"));

      el.dispatchEvent(new InputEvent("input", { data: "가", isComposing: false }));
      res.push(snap("committed"));

      return res;
    });

    for (const step of ["jamo-1", "jamo-2", "compositionend"]) {
      const snap = records.find((r) => r.step === step)!;
      expect(snap.fieldRaw).toBe("");
      expect(snap.validationCount).toBe(0);
      expect(snap.rawCommitCount).toBe(0);
    }

    const final = records.find((r) => r.step === "committed")!;
    expect(final.domValue).toBe("가");
    expect(final.fieldRaw).toBe("가");
    expect(final.validationCount).toBe(1);
    expect(final.rawCommitCount).toBe(1);
  });

  test("P1K-H09: handles Chinese pinyin composition sequence ('ni' -> '你')", async ({ page }) => {
    await page.goto("/?scenario=ime-text");
    const input = page.locator("#ime-input");
    await input.focus();

    const records = await page.evaluate(() => {
      const el = document.getElementById("ime-input") as HTMLInputElement;
      const b = window.__viiP1k!;
      const snap = (step: string) => ({
        step,
        domValue: el.value,
        fieldRaw: b.field.rawValue.get(),
        validationCount: b.validationCount,
        rawCommitCount: b.rawCommitCount,
      });

      const res = [snap("initial")];
      el.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
      el.dispatchEvent(new CompositionEvent("compositionupdate", { data: "ni" }));

      el.value = "ni";
      el.dispatchEvent(new InputEvent("input", { data: "ni", isComposing: true }));
      res.push(snap("pinyin"));

      el.dispatchEvent(new CompositionEvent("compositionend", { data: "你" }));
      res.push(snap("compositionend"));

      el.value = "你";
      el.dispatchEvent(new InputEvent("input", { data: "你", isComposing: false }));
      res.push(snap("committed"));

      return res;
    });

    const pinyin = records.find((r) => r.step === "pinyin")!;
    expect(pinyin.domValue).toBe("ni");
    expect(pinyin.fieldRaw).toBe("");
    expect(pinyin.validationCount).toBe(0);
    expect(pinyin.rawCommitCount).toBe(0);

    const final = records.find((r) => r.step === "committed")!;
    expect(final.domValue).toBe("你");
    expect(final.fieldRaw).toBe("你");
    expect(final.validationCount).toBe(1);
    expect(final.rawCommitCount).toBe(1);
  });

  test("P1K-H09: preserves presentation without snap-back or premature validation in parser-backed field", async ({
    page,
  }) => {
    await page.goto("/?scenario=ime-parser");
    const input = page.locator("#ime-parser-input");
    await input.focus();

    const records = await page.evaluate(() => {
      const el = document.getElementById("ime-parser-input") as HTMLInputElement;
      const b = window.__viiP1k!;
      const snap = (step: string) => ({
        step,
        domValue: el.value,
        fieldRaw: b.field.rawValue.get(),
        fieldValue: b.field.value.get(),
        parseStatus: b.field.parseStatus.get(),
        validationCount: b.validationCount,
        rawCommitCount: b.rawCommitCount,
      });

      const res = [snap("initial")];
      el.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
      el.dispatchEvent(new CompositionEvent("compositionupdate", { data: "1" }));

      el.value = "1";
      el.dispatchEvent(new InputEvent("input", { data: "1", isComposing: true }));
      res.push(snap("composing"));

      el.dispatchEvent(new CompositionEvent("compositionend", { data: "1" }));
      res.push(snap("compositionend"));

      el.dispatchEvent(new InputEvent("input", { data: "1", isComposing: false }));
      res.push(snap("committed"));

      return res;
    });

    const initial = records.find((r) => r.step === "initial")!;
    expect(initial.domValue).toBe("42");
    expect(initial.fieldValue).toBe(42);

    const composing = records.find((r) => r.step === "composing")!;
    expect(composing.domValue).toBe("1");
    expect(composing.fieldRaw).toBe("42");
    expect(composing.fieldValue).toBe(42);
    expect(composing.validationCount).toBe(0);
    expect(composing.rawCommitCount).toBe(0);

    const final = records.find((r) => r.step === "committed")!;
    expect(final.domValue).toBe("1");
    expect(final.fieldRaw).toBe("1");
    expect(final.fieldValue).toBe(1);
    expect(final.parseStatus).toBe("parsed");
    expect(final.validationCount).toBe(1);
    expect(final.rawCommitCount).toBe(1);
  });
});
