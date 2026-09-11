import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("DOM Focus & Accessibility Orchestration (P2d Real Browser)", () => {
  test("focuses first invalid text field upon submit failure", async ({ page }) => {
    await page.goto("/?scenario=focus-first-invalid");

    const submitBtn = page.locator("#submit-btn");
    await submitBtn.click();

    // After submit validation failure with focusInvalidOnSubmit, focus lands on #input-name
    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("input-name");
  });

  test("DOM order determines chosen invalid target and dynamically adapts to DOM reorder", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-dom-order");

    // Initially order-input-1 is physically first in DOM
    await page.evaluate(() => {
      window.__viiP1k!.formBinding!.focusInvalid();
    });

    let activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("order-input-1");

    // Reorder wrappers in DOM so order-input-2 is first
    await page.evaluate(() => {
      window.__viiP1k!.swapDomOrder!();
      window.__viiP1k!.formBinding!.focusInvalid();
    });

    activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("order-input-2");
  });

  test("radio group focuses checked radio if present, or first radio if none checked", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-radio-group");

    // Initially none checked: focuses first in DOM (radio-card)
    await page.evaluate(() => {
      window.__viiP1k!.formBinding!.focusInvalid();
    });

    let activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("radio-card");

    // Now check radio-paypal (second radio)
    await page.locator("#radio-paypal").check();

    // Trigger focus invalid again: should focus checked radio (radio-paypal)
    await page.evaluate(() => {
      document.body.focus();
      window.__viiP1k!.formBinding!.focusInvalid();
    });

    activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("radio-paypal");
  });

  test("scrolls invalid element into view when scroll option is enabled", async ({ page }) => {
    await page.goto("/?scenario=focus-scroll");

    // Initially at top of page
    const initialScrollY = await page.evaluate(() => window.scrollY);
    expect(initialScrollY).toBe(0);

    // Call focusInvalid with scroll: true
    await page.evaluate(() => {
      window.__viiP1k!.formBinding!.focusInvalid({ scroll: true });
    });

    // Wait for scroll to settle
    await page.waitForFunction(() => window.scrollY > 100);

    const scrolledY = await page.evaluate(() => window.scrollY);
    expect(scrolledY).toBeGreaterThan(100);

    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("bottom-input");
  });

  test("dynamic P2b unregister removes field from focus eligibility in browser", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-dynamic-unregister");

    // Unregister optional field
    await page.evaluate(() => {
      window.__viiP1k!.unregisterOpt!();
      window.__viiP1k!.formBinding!.focusInvalid();
    });

    // Focus must land on req-input (since opt-input was unregistered)
    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("req-input");
  });

  test("produces zero WCAG accessibility violations on focus-orchestrated form", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-a11y-audit");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include("#a11y-focus-form")
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("skips plain div without tabindex and focuses div with tabindex=-1 in real browser", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-plain-div");

    const result = await page.evaluate(() => {
      return window.__viiP1k!.formBinding!.focusInvalid();
    });

    expect(result.focused).toBe(true);
    expect(result.hasEligibleTarget).toBe(true);

    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("tabindex-div");
  });

  test("skips control inside disabled fieldset and focuses control inside first legend", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-fieldset-disabled");

    const result = await page.evaluate(() => {
      return window.__viiP1k!.formBinding!.focusInvalid();
    });

    expect(result.focused).toBe(true);
    expect(result.hasEligibleTarget).toBe(true);

    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("legend-input");
  });

  test("verifies activeElement and falls back when focus attempt fails silently", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-silent-failure");

    const result = await page.evaluate(() => {
      return window.__viiP1k!.formBinding!.focusInvalid();
    });

    expect(result.focused).toBe(true);
    expect(result.hasEligibleTarget).toBe(true);

    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("fallback-input");
  });

  test("skips disabled checked radio and focuses first eligible enabled radio", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-radio-disabled");

    const result = await page.evaluate(() => {
      return window.__viiP1k!.formBinding!.focusInvalid();
    });

    expect(result.focused).toBe(true);
    expect(result.hasEligibleTarget).toBe(true);

    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("radio-free-enabled");
  });

  test("skips input inside ancestor with display:none and focuses next visible invalid target", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-ancestor-display-none");

    const result = await page.evaluate(() => {
      return window.__viiP1k!.formBinding!.focusInvalid();
    });

    expect(result.focused).toBe(true);
    expect(result.hasEligibleTarget).toBe(true);

    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("visible-fallback-display");
  });

  test("skips input inside ancestor with visibility:hidden and focuses next visible invalid target", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-ancestor-visibility-hidden");

    const result = await page.evaluate(() => {
      return window.__viiP1k!.formBinding!.focusInvalid();
    });

    expect(result.focused).toBe(true);
    expect(result.hasEligibleTarget).toBe(true);

    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).toBe("visible-fallback-visibility");
  });

  test("in scroll-only mode, skips CSS-hidden invalid target, does not scroll to it, and scrolls to next visible target", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-scroll-fallback");

    const initialScrollY = await page.evaluate(() => window.scrollY);
    expect(initialScrollY).toBe(0);

    const result = await page.evaluate(() => {
      return window.__viiP1k!.formBinding!.focusInvalid({ focus: false, scroll: true });
    });

    expect(result.focused).toBe(false);
    expect(result.scrolled).toBe(true);
    expect(result.hasEligibleTarget).toBe(true);
    expect(result.hasInvalidFields).toBe(true);

    await page.waitForFunction(() => window.scrollY > 100);
    const scrolledY = await page.evaluate(() => window.scrollY);
    expect(scrolledY).toBeGreaterThan(100);

    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).not.toBe("scroll-hidden-input");
    expect(activeId).not.toBe("scroll-visible-input");
  });

  test("returns hasInvalidFields=true, hasEligibleTarget=false, focused=false, scrolled=false when all invalid bindings are CSS-hidden", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-all-css-hidden");

    const result = await page.evaluate(() => {
      return window.__viiP1k!.formBinding!.focusInvalid();
    });

    expect(result.focused).toBe(false);
    expect(result.scrolled).toBe(false);
    expect(result.hasInvalidFields).toBe(true);
    expect(result.hasEligibleTarget).toBe(false);

    const activeId = await page.evaluate(() => document.activeElement?.id);
    expect(activeId).not.toBe("all-hidden-input-1");
    expect(activeId).not.toBe("all-hidden-input-2");
  });

  test("in scroll-only mode returns scrolled=false and hasEligibleTarget=false when all invalid bindings are CSS-hidden", async ({
    page,
  }) => {
    await page.goto("/?scenario=focus-all-css-hidden");

    const result = await page.evaluate(() => {
      return window.__viiP1k!.formBinding!.focusInvalid({ focus: false, scroll: true });
    });

    expect(result.focused).toBe(false);
    expect(result.scrolled).toBe(false);
    expect(result.hasInvalidFields).toBe(true);
    expect(result.hasEligibleTarget).toBe(false);

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);
  });
});
