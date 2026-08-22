import type { ActivationMode, KeyDownEventLike, KeyboardIntent, Orientation } from "./types.js";

export interface TabItem {
  id: string;
  disabled?: boolean | undefined;
}

export interface TabsOptions {
  id?: string | undefined;
  tabs: TabItem[];
  defaultSelectedId?: string | undefined;
  selectedId?: string | undefined;
  orientation?: Orientation | undefined;
  activationMode?: ActivationMode | undefined;
  onSelectedIdChange?: ((id: string) => void) | undefined;
}

export interface TablistProps {
  role: "tablist";
  "aria-orientation": Orientation;
}

export interface TabProps {
  id: string;
  role: "tab";
  "aria-selected": boolean;
  "aria-controls": string;
  "aria-disabled"?: boolean;
  tabIndex: 0 | -1;
}

export interface TabPanelProps {
  id: string;
  role: "tabpanel";
  "aria-labelledby": string;
  hidden: boolean;
  tabIndex: 0;
}

export interface TabsBehavior {
  getSelectedId: () => string;
  getOrientation: () => Orientation;
  getActivationMode: () => ActivationMode;
  selectTab: (id: string) => void;
  selectNextTab: () => string;
  selectPreviousTab: () => string;
  selectFirstTab: () => string;
  selectLastTab: () => string;
  handleKeyDown: (event: KeyDownEventLike) => KeyboardIntent;
  getTablistProps: () => TablistProps;
  getTabProps: (tabId: string) => TabProps;
  getPanelProps: (tabId: string) => TabPanelProps;
}

let tabsCounter = 0;

export function createTabsBehavior(options: TabsOptions): TabsBehavior {
  const baseId = options.id ?? `vii-tabs-${++tabsCounter}`;
  const orientation = options.orientation ?? "horizontal";
  const activationMode = options.activationMode ?? "automatic";
  const isControlled = options.selectedId !== undefined;

  const tabs = [...options.tabs];
  const enabledTabs = tabs.filter((t) => !t.disabled);
  const fallbackFirstId = enabledTabs[0]?.id ?? tabs[0]?.id ?? "";

  let uncontrolledSelectedId = options.defaultSelectedId ?? fallbackFirstId;

  function getSelectedId(): string {
    return isControlled ? (options.selectedId ?? "") : uncontrolledSelectedId;
  }

  function selectTab(id: string): void {
    const target = tabs.find((t) => t.id === id);
    if (!target || target.disabled) return;
    if (getSelectedId() === id) return;

    if (!isControlled) {
      uncontrolledSelectedId = id;
    }
    options.onSelectedIdChange?.(id);
  }

  function getEnabledIndices(): number[] {
    return tabs.map((t, idx) => (!t.disabled ? idx : -1)).filter((idx) => idx !== -1);
  }

  function selectRelativeTab(direction: 1 | -1): string {
    const enabled = getEnabledIndices();
    if (enabled.length === 0) return getSelectedId();

    const currentId = getSelectedId();
    const currentIdx = tabs.findIndex((t) => t.id === currentId);
    const enabledPos = enabled.indexOf(currentIdx);

    const nextPos =
      enabledPos === -1 ? 0 : (enabledPos + direction + enabled.length) % enabled.length;

    const nextIndex = enabled[nextPos]!;
    const nextTab = tabs[nextIndex]!;
    selectTab(nextTab.id);
    return nextTab.id;
  }

  function selectFirstTab(): string {
    const enabled = getEnabledIndices();
    if (enabled.length === 0) return getSelectedId();
    const firstTab = tabs[enabled[0]!]!;
    selectTab(firstTab.id);
    return firstTab.id;
  }

  function selectLastTab(): string {
    const enabled = getEnabledIndices();
    if (enabled.length === 0) return getSelectedId();
    const lastTab = tabs[enabled[enabled.length - 1]!]!;
    selectTab(lastTab.id);
    return lastTab.id;
  }

  function handleKeyDown(event: KeyDownEventLike): KeyboardIntent {
    const isHoriz = orientation === "horizontal";

    if ((isHoriz && event.key === "ArrowRight") || (!isHoriz && event.key === "ArrowDown")) {
      selectRelativeTab(1);
      return "NEXT";
    }
    if ((isHoriz && event.key === "ArrowLeft") || (!isHoriz && event.key === "ArrowUp")) {
      selectRelativeTab(-1);
      return "PREV";
    }
    if (event.key === "Home") {
      selectFirstTab();
      return "FIRST";
    }
    if (event.key === "End") {
      selectLastTab();
      return "LAST";
    }
    if (activationMode === "manual" && (event.key === "Enter" || event.key === " ")) {
      return "ACTIVATE";
    }
    return "NONE";
  }

  function getTablistProps(): TablistProps {
    return {
      role: "tablist",
      "aria-orientation": orientation,
    };
  }

  function getTabProps(tabId: string): TabProps {
    const tab = tabs.find((t) => t.id === tabId);
    const isSelected = getSelectedId() === tabId;
    const props: TabProps = {
      id: `${baseId}-tab-${tabId}`,
      role: "tab",
      "aria-selected": isSelected,
      "aria-controls": `${baseId}-panel-${tabId}`,
      tabIndex: isSelected ? 0 : -1,
    };
    if (tab?.disabled) {
      props["aria-disabled"] = true;
    }
    return props;
  }

  function getPanelProps(tabId: string): TabPanelProps {
    return {
      id: `${baseId}-panel-${tabId}`,
      role: "tabpanel",
      "aria-labelledby": `${baseId}-tab-${tabId}`,
      hidden: getSelectedId() !== tabId,
      tabIndex: 0,
    };
  }

  return {
    getSelectedId,
    getOrientation: () => orientation,
    getActivationMode: () => activationMode,
    selectTab,
    selectNextTab: () => selectRelativeTab(1),
    selectPreviousTab: () => selectRelativeTab(-1),
    selectFirstTab,
    selectLastTab,
    handleKeyDown,
    getTablistProps,
    getTabProps,
    getPanelProps,
  };
}
