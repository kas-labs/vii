import type { ButtonContractProps, RenderedComponentSnapshot } from "../types.js";

export interface VanillaButtonHandle {
  mount: (element: HTMLElement) => void;
  update: (props: Partial<ButtonContractProps>) => void;
  click: () => void;
  getSnapshot: () => RenderedComponentSnapshot;
  destroy: () => void;
}

export function createVanillaButton(initialProps: ButtonContractProps = {}): VanillaButtonHandle {
  let props = { ...initialProps };
  let targetEl: HTMLElement | null = null;
  let clickListener: (() => void) | null = null;

  function applyAttributes(): void {
    if (!targetEl) return;
    targetEl.setAttribute("type", props.type ?? "button");
    if (props.disabled) {
      targetEl.setAttribute("disabled", "true");
      targetEl.setAttribute("aria-disabled", "true");
    } else {
      targetEl.removeAttribute("disabled");
      targetEl.removeAttribute("aria-disabled");
    }
  }

  function mount(element: HTMLElement): void {
    targetEl = element;
    clickListener = () => {
      if (!props.disabled && props.onClick) {
        props.onClick();
      }
    };
    targetEl.addEventListener("click", clickListener);
    applyAttributes();
  }

  function update(nextProps: Partial<ButtonContractProps>): void {
    props = { ...props, ...nextProps };
    applyAttributes();
  }

  function click(): void {
    if (!props.disabled && props.onClick) {
      props.onClick();
    }
  }

  function getSnapshot(): RenderedComponentSnapshot {
    return {
      type: props.type ?? "button",
      disabled: Boolean(props.disabled),
      ariaDisabled: props.disabled ? true : undefined,
    };
  }

  function destroy(): void {
    if (targetEl && clickListener) {
      targetEl.removeEventListener("click", clickListener);
    }
    targetEl = null;
    clickListener = null;
  }

  return { mount, update, click, getSnapshot, destroy };
}
