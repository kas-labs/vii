import type { ButtonContractProps, RenderedComponentSnapshot } from "../types.js";

export function ReactButtonAdapter(props: ButtonContractProps) {
  const type = props.type ?? "button";
  const disabled = Boolean(props.disabled);

  return {
    type,
    disabled,
    "aria-disabled": disabled ? true : undefined,
    onClick: !disabled ? props.onClick : undefined,
    getSnapshot(): RenderedComponentSnapshot {
      return {
        type,
        disabled,
        ariaDisabled: disabled ? true : undefined,
      };
    },
  };
}
