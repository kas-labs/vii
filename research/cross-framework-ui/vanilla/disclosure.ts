import { createDisclosureBehavior } from "../../ui-behaviors/disclosure.js";
import type { DisclosureContractProps, RenderedComponentSnapshot } from "../types.js";

export interface VanillaDisclosureHandle {
  isExpanded: () => boolean;
  toggle: () => void;
  getSnapshot: () => { trigger: RenderedComponentSnapshot; panel: RenderedComponentSnapshot };
  destroy: () => void;
}

export function createVanillaDisclosure(
  options: DisclosureContractProps = {},
): VanillaDisclosureHandle {
  const behavior = createDisclosureBehavior(options);

  function getSnapshot() {
    const triggerProps = behavior.getTriggerProps();
    const panelProps = behavior.getPanelProps();

    return {
      trigger: {
        role: triggerProps.role ?? "button",
        ariaExpanded: triggerProps["aria-expanded"],
        ariaControls: triggerProps["aria-controls"],
        ariaDisabled: triggerProps["aria-disabled"],
      },
      panel: {
        role: panelProps.role,
        ariaLabelledby: panelProps["aria-labelledby"],
        hidden: panelProps.hidden,
      },
    };
  }

  return {
    isExpanded: behavior.isExpanded,
    toggle: behavior.toggle,
    getSnapshot,
    destroy: () => {},
  };
}
