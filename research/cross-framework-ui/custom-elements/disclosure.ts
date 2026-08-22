import { createDisclosureBehavior } from "../../ui-behaviors/disclosure.js";
import type { DisclosureContractProps, RenderedComponentSnapshot } from "../types.js";

export class CustomElementDisclosureAdapter {
  private behavior: ReturnType<typeof createDisclosureBehavior>;

  constructor(options: DisclosureContractProps = {}) {
    this.behavior = createDisclosureBehavior(options);
  }

  isExpanded(): boolean {
    return this.behavior.isExpanded();
  }

  toggle(): void {
    this.behavior.toggle();
  }

  getSnapshot(): { trigger: RenderedComponentSnapshot; panel: RenderedComponentSnapshot } {
    const trigger = this.behavior.getTriggerProps();
    const panel = this.behavior.getPanelProps();
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
  }
}
