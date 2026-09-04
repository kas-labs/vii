import { test, expect } from "@playwright/test";

test.describe("Submit Validation Authority & Lifecycle Races", () => {
  test("P1K-H07: cancels stale submit when field is edited during async submit validation", async ({
    page,
  }) => {
    await page.goto("/?scenario=submit-lifecycle");

    const input = page.locator("#title-input");
    const submitBtn = page.locator("#lifecycle-submit-btn");

    // Click submit -> begins submit validation
    await submitBtn.click();

    // Check that form is validating/submitting
    const isSubmitting = await page.evaluate(() => {
      const b = window.__viiP1k!;
      return b.form.submitting.get();
    });
    expect(isSubmitting).toBe(true);

    // User modifies input while submit validation is pending
    await input.fill("mutated-during-validation");

    // Now resolve the submit validation promise
    await page.evaluate(() => {
      const resolver = window.__viiP1k!.resolvers["resolveSubmitValidation"];
      if (resolver) resolver();
    });

    // Wait for submission promise to settle
    await page.waitForFunction(() => !window.__viiP1k?.form.submitting.get());

    const result = await page.evaluate(() => {
      const b = window.__viiP1k!;
      return {
        actionCalls: b.actionCallCount,
        submissionStatus: b.form.submissionStatus.get(),
      };
    });

    // Action MUST NOT have been called with the unvalidated mutated value
    expect(result.actionCalls).toBe(0);
    // Canonical Model A lifecycle transitions to 'cancelled'
    expect(result.submissionStatus).toBe("cancelled");
  });
});
