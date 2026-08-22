import type { ButtonContractProps, RenderedComponentSnapshot } from "../types.js";

export function createVueButtonAdapter(props: ButtonContractProps = {}) {
  const type = props.type ?? "button";
  const disabled = Boolean(props.disabled);

  function onClick() {
    if (!disabled && props.onClick) {
      props.onClick();
    }
  }

  function getSnapshot(): RenderedComponentSnapshot {
    return {
      type,
      disabled,
      ariaDisabled: disabled ? true : undefined,
    };
  }

  return { type, disabled, onClick, getSnapshot };
}
