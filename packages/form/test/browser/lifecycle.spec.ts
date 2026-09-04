import { test, expect } from "@playwright/test";

test.describe("Route Teardown & Binding Lifecycle Invariants", () => {
  test("P1K-H12: handles route teardown during active async validation without detached DOM mutation", async ({
    page,
  }) => {
    await page.goto("/?scenario=route-teardown");

    // Trigger async validation
    await page.evaluate(() => {
      window.__viiP1k!.field.validate("change");
    });

    const isPending = await page.evaluate(() => window.__viiP1k!.field.pending.get());
    expect(isPending).toBe(true);

    // Simulate route teardown: dispose binding and remove DOM container
    await page.evaluate(() => {
      window.__viiP1k!.teardown();
    });

    // Subtree is detached from document
    const isDetached = await page.evaluate(() => {
      return document.getElementById("route-subtree") === null;
    });
    expect(isDetached).toBe(true);

    // Resolve async validation after UI teardown
    await page.evaluate(() => {
      const resolver = window.__viiP1k!.resolvers["resolveRouteAsync"];
      if (resolver) resolver();
    });

    // Wait for microtask flush
    await page.waitForTimeout(50);

    const check = await page.evaluate(() => {
      const b = window.__viiP1k!;
      return {
        detachedIssueText: b.detachedIssue?.textContent,
        fieldInvalid: b.field.invalid.get(),
        fieldIssuesCount: b.field.issues.get().length,
        unhandledCount: b.unhandledRejections.length,
        errorsCount: b.pageErrors.length,
      };
    });

    // Detached DOM must NOT have received any late error text update
    expect(check.detachedIssueText).toBe("");
    // Canonical field safely updated its internal state
    expect(check.fieldInvalid).toBe(true);
    expect(check.fieldIssuesCount).toBe(1);
    // 0 unhandled rejections or page errors
    expect(check.unhandledCount).toBe(0);
    expect(check.errorsCount).toBe(0);
  });

  test("proves canonical Form node survives UI binding teardown", async ({ page }) => {
    await page.goto("/?scenario=route-teardown");

    // Perform UI teardown
    await page.evaluate(() => {
      window.__viiP1k!.teardown();
    });

    // Canonical Form remains completely functional
    const formUsable = await page.evaluate(() => {
      const b = window.__viiP1k!;
      b.form.fields.routeField.setValue("programmatic-after-teardown");
      return {
        val: b.form.value.get().routeField,
        dirty: b.form.dirty.get(),
      };
    });

    expect(formUsable.val).toBe("programmatic-after-teardown");
    expect(formUsable.dirty).toBe(true);
  });
});
