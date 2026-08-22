import type { KeyDownEventLike, KeyboardIntent } from "./types.js";

export interface DisclosureOptions {
  id?: string | undefined;
  defaultExpanded?: boolean | undefined;
  expanded?: boolean | undefined;
  disabled?: boolean | undefined;
  onExpandedChange?: ((expanded: boolean) => void) | undefined;
}

export interface DisclosureTriggerProps {
  id: string;
  "aria-expanded": boolean;
  "aria-controls": string;
  "aria-disabled"?: boolean;
  role?: "button";
  tabIndex?: number;
}

export interface DisclosurePanelProps {
  id: string;
  role: "region";
  "aria-labelledby": string;
  hidden: boolean;
}

export interface DisclosureBehavior {
  isExpanded: () => boolean;
  isDisabled: () => boolean;
  getId: () => string;
  getPanelId: () => string;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  handleKeyDown: (event: KeyDownEventLike) => KeyboardIntent;
  getTriggerProps: () => DisclosureTriggerProps;
  getPanelProps: () => DisclosurePanelProps;
}

let disclosureCounter = 0;

export function createDisclosureBehavior(options: DisclosureOptions = {}): DisclosureBehavior {
  const isControlled = options.expanded !== undefined;
  const baseId = options.id ?? `vii-disclosure-${++disclosureCounter}`;
  const triggerId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;

  let uncontrolledExpanded = options.defaultExpanded ?? false;

  function isExpanded(): boolean {
    return isControlled ? Boolean(options.expanded) : uncontrolledExpanded;
  }

  function isDisabled(): boolean {
    return Boolean(options.disabled);
  }

  function setExpanded(nextState: boolean): void {
    if (isDisabled()) return;
    if (isExpanded() === nextState) return;

    if (!isControlled) {
      uncontrolledExpanded = nextState;
    }
    options.onExpandedChange?.(nextState);
  }

  function toggle(): void {
    setExpanded(!isExpanded());
  }

  function expand(): void {
    setExpanded(true);
  }

  function collapse(): void {
    setExpanded(false);
  }

  function handleKeyDown(event: KeyDownEventLike): KeyboardIntent {
    if (isDisabled()) return "NONE";

    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      toggle();
      return "TOGGLE";
    }
    return "NONE";
  }

  function getTriggerProps(): DisclosureTriggerProps {
    const disabled = isDisabled();
    const props: DisclosureTriggerProps = {
      id: triggerId,
      "aria-expanded": isExpanded(),
      "aria-controls": panelId,
    };
    if (disabled) {
      props["aria-disabled"] = true;
    }
    return props;
  }

  function getPanelProps(): DisclosurePanelProps {
    return {
      id: panelId,
      role: "region",
      "aria-labelledby": triggerId,
      hidden: !isExpanded(),
    };
  }

  return {
    isExpanded,
    isDisabled,
    getId: () => baseId,
    getPanelId: () => panelId,
    toggle,
    expand,
    collapse,
    handleKeyDown,
    getTriggerProps,
    getPanelProps,
  };
}
