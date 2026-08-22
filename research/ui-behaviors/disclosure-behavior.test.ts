import { describe, expect, it, vi } from "vitest";
import { createDisclosureBehavior } from "./disclosure.js";

describe("Disclosure Behavior (APG Pattern)", () => {
  it("initializes with default collapsed state in uncontrolled mode", () => {
    const disclosure = createDisclosureBehavior();
    expect(disclosure.isExpanded()).toBe(false);

    const trigger = disclosure.getTriggerProps();
    const panel = disclosure.getPanelProps();

    expect(trigger["aria-expanded"]).toBe(false);
    expect(trigger["aria-controls"]).toBe(panel.id);
    expect(panel["aria-labelledby"]).toBe(trigger.id);
    expect(panel.hidden).toBe(true);
  });

  it("toggles expanded state and fires onExpandedChange callback", () => {
    const onChange = vi.fn();
    const disclosure = createDisclosureBehavior({
      defaultExpanded: false,
      onExpandedChange: onChange,
    });

    disclosure.toggle();
    expect(disclosure.isExpanded()).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);

    disclosure.toggle();
    expect(disclosure.isExpanded()).toBe(false);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("handles controlled mode where state is driven externally", () => {
    const onChange = vi.fn();
    const disclosure = createDisclosureBehavior({
      expanded: true,
      onExpandedChange: onChange,
    });

    expect(disclosure.isExpanded()).toBe(true);

    disclosure.toggle();
    // In controlled mode, internal state remains true until parent updates prop
    expect(disclosure.isExpanded()).toBe(true);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("handles APG keyboard interactions (Enter and Space toggle)", () => {
    const disclosure = createDisclosureBehavior();

    const intentEnter = disclosure.handleKeyDown({ key: "Enter" });
    expect(intentEnter).toBe("TOGGLE");
    expect(disclosure.isExpanded()).toBe(true);

    const intentSpace = disclosure.handleKeyDown({ key: " " });
    expect(intentSpace).toBe("TOGGLE");
    expect(disclosure.isExpanded()).toBe(false);

    const intentArrow = disclosure.handleKeyDown({ key: "ArrowDown" });
    expect(intentArrow).toBe("NONE");
    expect(disclosure.isExpanded()).toBe(false);
  });

  it("prevents interaction when disabled", () => {
    const onChange = vi.fn();
    const disclosure = createDisclosureBehavior({
      disabled: true,
      defaultExpanded: false,
      onExpandedChange: onChange,
    });

    disclosure.toggle();
    disclosure.expand();
    expect(disclosure.isExpanded()).toBe(false);
    expect(onChange).not.toHaveBeenCalled();

    const intent = disclosure.handleKeyDown({ key: "Enter" });
    expect(intent).toBe("NONE");

    const trigger = disclosure.getTriggerProps();
    expect(trigger["aria-disabled"]).toBe(true);
  });
});
