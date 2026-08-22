import type { ButtonContractProps, RenderedComponentSnapshot } from "../types.js";

export class AngularButtonAdapter {
  public type: "button" | "submit" | "reset" = "button";
  public disabled = false;
  private clickHandler?: (() => void) | undefined;

  constructor(props: ButtonContractProps = {}) {
    if (props.type) this.type = props.type;
    if (props.disabled !== undefined) this.disabled = props.disabled;
    this.clickHandler = props.onClick;
  }

  handleClick(): void {
    if (!this.disabled && this.clickHandler) {
      this.clickHandler();
    }
  }

  getSnapshot(): RenderedComponentSnapshot {
    return {
      type: this.type,
      disabled: this.disabled,
      ariaDisabled: this.disabled ? true : undefined,
    };
  }
}
