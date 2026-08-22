import type { ButtonContractProps, RenderedComponentSnapshot } from "../types.js";

export class CustomElementButtonAdapter {
  private props: ButtonContractProps;

  constructor(props: ButtonContractProps = {}) {
    this.props = { ...props };
  }

  click(): void {
    if (!this.props.disabled && this.props.onClick) {
      this.props.onClick();
    }
  }

  getSnapshot(): RenderedComponentSnapshot {
    return {
      type: this.props.type ?? "button",
      disabled: Boolean(this.props.disabled),
      ariaDisabled: this.props.disabled ? true : undefined,
    };
  }
}
