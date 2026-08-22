import { createDisclosureBehavior } from "../../ui-behaviors/disclosure.js";
import type { DisclosureContractProps, RenderedComponentSnapshot } from "../types.js";

export function useReactDisclosureAdapter(props: DisclosureContractProps = {}) {
  const behavior = createDisclosureBehavior(props);

  return {
    isExpanded: behavior.isExpanded,
    toggle: behavior.toggle,
    triggerProps: behavior.getTriggerProps(),
    panelProps: behavior.getPanelProps(),
    getSnapshot(): { trigger: RenderedComponentSnapshot; panel: RenderedComponentSnapshot } {
      const trigger = behavior.getTriggerProps();
      const panel = behavior.getPanelProps();
      return {
        trigger: {
          role: trigger.role ?? "button",
          ariaExpanded: trigger["aria-expanded"],
          ariaControls: trigger["aria-controls"],
          ariaDisabled: trigger["aria-disabled"],
        },
        panel: {
          role: panel.role,
          ariaLabelledby: panel["aria-labelledby"],
          hidden: panel.hidden,
        },
      };
    },
  };
}
