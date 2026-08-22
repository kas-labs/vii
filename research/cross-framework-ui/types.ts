/**
 * Phase 6 UI Foundation: Cross-Framework UI Contracts (P6.5)
 */

export interface ButtonContractProps {
  type?: "button" | "submit" | "reset" | undefined;
  disabled?: boolean | undefined;
  onClick?: (() => void) | undefined;
  children?: any;
}

export interface DisclosureContractProps {
  defaultExpanded?: boolean | undefined;
  expanded?: boolean | undefined;
  disabled?: boolean | undefined;
  onExpandedChange?: ((expanded: boolean) => void) | undefined;
  id?: string | undefined;
}

export interface RenderedComponentSnapshot {
  role?: string | undefined;
  ariaExpanded?: boolean | undefined;
  ariaControls?: string | undefined;
  ariaDisabled?: boolean | undefined;
  ariaLabelledby?: string | undefined;
  hidden?: boolean | undefined;
  disabled?: boolean | undefined;
  type?: string | undefined;
  text?: string | undefined;
}
