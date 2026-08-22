import { defaultDOMCapabilities } from "./dom-capabilities.js";
import type {
  DOMCapabilityProvider,
  FocusTrapHandle,
  InertHandle,
  ScrollLockHandle,
} from "./types.js";

export interface DialogOptions {
  id?: string | undefined;
  defaultOpen?: boolean | undefined;
  isOpen?: boolean | undefined;
  modal?: boolean | undefined;
  role?: "dialog" | "alertdialog" | undefined;
  titleId?: string | undefined;
  descriptionId?: string | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  domCapabilities?: DOMCapabilityProvider | undefined;
}

export interface DialogProps {
  id: string;
  role: "dialog" | "alertdialog";
  "aria-modal"?: boolean;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  tabIndex: -1;
}

export interface DialogBehavior {
  isOpen: () => boolean;
  isModal: () => boolean;
  getRole: () => "dialog" | "alertdialog";
  getId: () => string;
  getTitleId: () => string;
  getDescriptionId: () => string;
  open: () => void;
  close: () => void;
  toggle: () => void;
  getDialogProps: () => DialogProps;
  getTitleProps: () => { id: string };
  getDescriptionProps: () => { id: string };
  attachDOM: (container: HTMLElement, backgroundSiblings?: HTMLElement[]) => () => void;
  destroy: () => void;
}

let dialogCounter = 0;

export function createDialogBehavior(options: DialogOptions = {}): DialogBehavior {
  const baseId = options.id ?? `vii-dialog-${++dialogCounter}`;
  const titleId = options.titleId ?? `${baseId}-title`;
  const descriptionId = options.descriptionId ?? `${baseId}-desc`;
  const role = options.role ?? "dialog";
  const modal = options.modal ?? true;
  const isControlled = options.isOpen !== undefined;
  const dom = options.domCapabilities ?? defaultDOMCapabilities;

  let uncontrolledOpen = options.defaultOpen ?? false;
  let activeTrap: FocusTrapHandle | null = null;
  let activeInert: InertHandle | null = null;
  let activeScroll: ScrollLockHandle | null = null;
  let cleanups: Array<() => void> = [];

  function isOpen(): boolean {
    return isControlled ? Boolean(options.isOpen) : uncontrolledOpen;
  }

  function setOpen(nextState: boolean): void {
    if (isOpen() === nextState) return;
    if (!isControlled) {
      uncontrolledOpen = nextState;
    }
    options.onOpenChange?.(nextState);
  }

  function open(): void {
    setOpen(true);
  }

  function close(): void {
    setOpen(false);
  }

  function toggle(): void {
    setOpen(!isOpen());
  }

  function cleanupActiveDOM(): void {
    activeTrap?.destroy();
    activeTrap = null;
    activeInert?.restore();
    activeInert = null;
    activeScroll?.unlock();
    activeScroll = null;
    for (const fn of cleanups) fn();
    cleanups = [];
  }

  function attachDOM(container: HTMLElement, backgroundSiblings: HTMLElement[] = []): () => void {
    cleanupActiveDOM();

    if (!isOpen()) return () => {};

    if (modal) {
      activeTrap = dom.trapFocus(container);
      activeTrap.activate();
      if (backgroundSiblings.length > 0) {
        activeInert = dom.setInert(backgroundSiblings);
      }
      activeScroll = dom.lockScroll();
      cleanups.push(dom.onEscape(close));
      cleanups.push(dom.onOutsideClick(container, close));
    }

    return () => {
      cleanupActiveDOM();
    };
  }

  function getDialogProps(): DialogProps {
    const props: DialogProps = {
      id: baseId,
      role,
      "aria-labelledby": titleId,
      "aria-describedby": descriptionId,
      tabIndex: -1,
    };
    if (modal) {
      props["aria-modal"] = true;
    }
    return props;
  }

  return {
    isOpen,
    isModal: () => modal,
    getRole: () => role,
    getId: () => baseId,
    getTitleId: () => titleId,
    getDescriptionId: () => descriptionId,
    open,
    close,
    toggle,
    getDialogProps,
    getTitleProps: () => ({ id: titleId }),
    getDescriptionProps: () => ({ id: descriptionId }),
    attachDOM,
    destroy: cleanupActiveDOM,
  };
}
