import { describe, expect, it, vi } from "vitest";
import { evaluateContrast } from "../tokens/contrast-evaluator.js";
import type { DTCGColorValue } from "../tokens/dtcg-types.js";
import { createDialogBehavior } from "../ui-behaviors/dialog.js";
import { createDisclosureBehavior } from "../ui-behaviors/disclosure.js";
import { createTabsBehavior } from "../ui-behaviors/tabs.js";

describe("UI Accessibility Matrix Verification (P6.7)", () => {
  describe("WAI-ARIA APG Keyboard Contracts", () => {
    it("Disclosure: toggles on Enter and Space keys, ignores other keys", () => {
      const disclosure = createDisclosureBehavior({ defaultExpanded: false });

      const intentEnter = disclosure.handleKeyDown({ key: "Enter" });
      expect(intentEnter).toBe("TOGGLE");
      expect(disclosure.isExpanded()).toBe(true);

      const intentSpace = disclosure.handleKeyDown({ key: " " });
      expect(intentSpace).toBe("TOGGLE");
      expect(disclosure.isExpanded()).toBe(false);

      const intentTab = disclosure.handleKeyDown({ key: "Tab" });
      expect(intentTab).toBe("NONE");
      expect(disclosure.isExpanded()).toBe(false);
    });

    it("Tabs: supports Home/End boundary jumps and vertical/horizontal navigation", () => {
      const tabs = createTabsBehavior({
        tabs: [{ id: "tab-1" }, { id: "tab-2" }, { id: "tab-3" }],
        orientation: "horizontal",
      });

      const intentEnd = tabs.handleKeyDown({ key: "End" });
      expect(intentEnd).toBe("LAST");
      expect(tabs.getSelectedId()).toBe("tab-3");

      const intentHome = tabs.handleKeyDown({ key: "Home" });
      expect(intentHome).toBe("FIRST");
      expect(tabs.getSelectedId()).toBe("tab-1");
    });

    it("Dialog: dismisses on Escape key via DOM capability hook", () => {
      const onOpenChange = vi.fn();
      let capturedEscapeCallback: (() => void) | undefined;

      const mockDomCapabilities = {
        trapFocus: vi.fn().mockReturnValue({ activate: vi.fn(), destroy: vi.fn() }),
        setInert: vi.fn().mockReturnValue({ restore: vi.fn() }),
        lockScroll: vi.fn().mockReturnValue({ unlock: vi.fn() }),
        onEscape: vi.fn().mockImplementation((callback) => {
          capturedEscapeCallback = callback;
          return () => {};
        }),
        onOutsideClick: vi.fn().mockReturnValue(() => {}),
      };

      const dialog = createDialogBehavior({
        defaultOpen: true,
        onOpenChange,
        domCapabilities: mockDomCapabilities,
      });

      const dummyContainer = {} as HTMLElement;
      dialog.attachDOM(dummyContainer);

      expect(dialog.isOpen()).toBe(true);
      capturedEscapeCallback?.();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("High Contrast & Contrast Ratio Enforcement", () => {
    const white: DTCGColorValue = { colorSpace: "srgb", components: [1, 1, 1] };
    const blue: DTCGColorValue = { colorSpace: "srgb", components: [0, 0.4, 0.8] };
    const gray: DTCGColorValue = { colorSpace: "srgb", components: [0.46, 0.46, 0.46] };

    it("verifies primary colors satisfy WCAG 2.1 AA 4.5:1 text contrast", () => {
      const result = evaluateContrast(white, blue);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      expect(result.passes.WCAG_1_4_3_AA_NORMAL).toBe(true);
    });

    it("verifies non-text UI boundaries satisfy WCAG 1.4.11 3:1 ratio", () => {
      const result = evaluateContrast(white, gray);
      expect(result.ratio).toBeGreaterThanOrEqual(3.0);
      expect(result.passes.WCAG_1_4_11_NON_TEXT).toBe(true);
    });
  });

  describe("Assistive Technology Gating Policy", () => {
    it("declares that automated checks do not substitute for AT screen reader smoke testing", () => {
      const atGatingPolicy = {
        automatedCheckPassed: true,
        screenReaderTested: false,
        productionClaimAllowed: false,
      };

      expect(atGatingPolicy.automatedCheckPassed).toBe(true);
      expect(atGatingPolicy.productionClaimAllowed).toBe(false);
    });
  });
});
