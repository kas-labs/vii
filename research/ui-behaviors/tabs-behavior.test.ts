import { describe, expect, it, vi } from "vitest";
import { createTabsBehavior } from "./tabs.js";

describe("Tabs Behavior (APG Pattern)", () => {
  const sampleTabs = [
    { id: "overview" },
    { id: "analytics" },
    { id: "settings", disabled: true },
    { id: "billing" },
  ];

  it("initializes with the first enabled tab selected", () => {
    const tabs = createTabsBehavior({ tabs: sampleTabs });
    expect(tabs.getSelectedId()).toBe("overview");

    const tablistProps = tabs.getTablistProps();
    expect(tablistProps.role).toBe("tablist");
    expect(tablistProps["aria-orientation"]).toBe("horizontal");

    const tab1 = tabs.getTabProps("overview");
    const tab2 = tabs.getTabProps("analytics");
    const tab3 = tabs.getTabProps("settings");

    expect(tab1["aria-selected"]).toBe(true);
    expect(tab1.tabIndex).toBe(0);

    expect(tab2["aria-selected"]).toBe(false);
    expect(tab2.tabIndex).toBe(-1);

    expect(tab3["aria-disabled"]).toBe(true);

    const panel1 = tabs.getPanelProps("overview");
    const panel2 = tabs.getPanelProps("analytics");

    expect(panel1.hidden).toBe(false);
    expect(panel2.hidden).toBe(true);
  });

  it("navigates with ArrowRight and ArrowLeft in horizontal orientation, skipping disabled tabs and wrapping", () => {
    const tabs = createTabsBehavior({
      tabs: sampleTabs,
      orientation: "horizontal",
    });

    expect(tabs.getSelectedId()).toBe("overview");

    // Next -> analytics
    tabs.handleKeyDown({ key: "ArrowRight" });
    expect(tabs.getSelectedId()).toBe("analytics");

    // Next -> skips 'settings' (disabled) -> billing
    tabs.handleKeyDown({ key: "ArrowRight" });
    expect(tabs.getSelectedId()).toBe("billing");

    // Next -> wraps around to 'overview'
    tabs.handleKeyDown({ key: "ArrowRight" });
    expect(tabs.getSelectedId()).toBe("overview");

    // Prev -> wraps around to 'billing'
    tabs.handleKeyDown({ key: "ArrowLeft" });
    expect(tabs.getSelectedId()).toBe("billing");
  });

  it("navigates with ArrowDown and ArrowUp in vertical orientation", () => {
    const tabs = createTabsBehavior({
      tabs: sampleTabs,
      orientation: "vertical",
    });

    expect(tabs.getTablistProps()["aria-orientation"]).toBe("vertical");

    tabs.handleKeyDown({ key: "ArrowDown" });
    expect(tabs.getSelectedId()).toBe("analytics");

    tabs.handleKeyDown({ key: "ArrowUp" });
    expect(tabs.getSelectedId()).toBe("overview");
  });

  it("supports Home and End keys for jumping to first and last enabled tabs", () => {
    const tabs = createTabsBehavior({ tabs: sampleTabs });

    tabs.handleKeyDown({ key: "End" });
    expect(tabs.getSelectedId()).toBe("billing");

    tabs.handleKeyDown({ key: "Home" });
    expect(tabs.getSelectedId()).toBe("overview");
  });

  it("supports manual activation mode where selection occurs on Enter or Space", () => {
    const onChange = vi.fn();
    const tabs = createTabsBehavior({
      tabs: sampleTabs,
      activationMode: "manual",
      onSelectedIdChange: onChange,
    });

    const enterIntent = tabs.handleKeyDown({ key: "Enter" });
    expect(enterIntent).toBe("ACTIVATE");

    const spaceIntent = tabs.handleKeyDown({ key: " " });
    expect(spaceIntent).toBe("ACTIVATE");
  });

  it("handles controlled mode where selectedId is externally supplied", () => {
    const onChange = vi.fn();
    const tabs = createTabsBehavior({
      tabs: sampleTabs,
      selectedId: "billing",
      onSelectedIdChange: onChange,
    });

    expect(tabs.getSelectedId()).toBe("billing");

    tabs.selectTab("overview");
    expect(onChange).toHaveBeenCalledWith("overview");
    // Internal state remains 'billing' until prop updates
    expect(tabs.getSelectedId()).toBe("billing");
  });
});
