import { test, expect } from "@playwright/test";

test.describe("React 19 Real-Browser Lifecycle & Subscription Freshness", () => {
  test("P1K-H15: handles React 19 mount, edit, unmount during async validation, and remount", async ({
    page,
  }) => {
    // Collect console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/?scenario=react-lifecycle");

    const input = page.locator("#react-title-input");
    const pending = page.locator("#react-title-pending");
    const status = page.locator("#react-title-status");
    const dirty = page.locator("#react-form-dirty");

    // Verify initial render
    expect(await input.inputValue()).toBe("Initial Title");
    expect(await dirty.textContent()).toBe("pristine");
    expect(await status.textContent()).toBe("unvalidated");

    // Edit input
    await input.fill("Brand New Title");

    expect(await input.inputValue()).toBe("Brand New Title");
    expect(await dirty.textContent()).toBe("dirty");

    // Trigger async validation
    await page.evaluate(() => {
      window.__viiP1k!.field.validate("change");
    });

    expect(await pending.textContent()).toBe("pending");

    // Unmount React component while async validation is in flight
    await page.evaluate(() => {
      window.__viiP1k!.unmountReact();
    });

    // Verify unmounted
    expect(await page.locator("#react-title-input").count()).toBe(0);

    // Resolve the async validation
    await page.evaluate(() => {
      const resolver = window.__viiP1k!.resolvers["resolveReactAsync"];
      if (resolver) resolver();
    });

    // Remount React component with same canonical field
    await page.evaluate(() => {
      window.__viiP1k!.remountReact();
    });

    // Verify remounted state has fresh snapshot and reactivity intact
    const remountedInput = page.locator("#react-title-input");
    expect(await remountedInput.inputValue()).toBe("Brand New Title");
    expect(await page.locator("#react-form-dirty").textContent()).toBe("dirty");
    expect(await page.locator("#react-title-pending").textContent()).toBe("settled");
    expect(await page.locator("#react-title-status").textContent()).toBe("valid");

    // Ensure 0 unexpected console errors
    const filteredErrors = consoleErrors.filter(
      (err) => !err.includes("react-test-renderer is deprecated"),
    );
    expect(filteredErrors).toEqual([]);
  });
});
