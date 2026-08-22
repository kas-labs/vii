/**
 * Phase 6 UI Foundation: Behavior & Platform Capability Types (P6.2)
 */

export type Orientation = "horizontal" | "vertical";

export type ActivationMode = "automatic" | "manual";

export type KeyboardIntent =
  | "NEXT"
  | "PREV"
  | "FIRST"
  | "LAST"
  | "ACTIVATE"
  | "DISMISS"
  | "EXPAND"
  | "COLLAPSE"
  | "TOGGLE"
  | "NONE";

export interface KeyDownEventLike {
  key: string;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
}

export interface FocusTrapOptions {
  initialFocus?: HTMLElement | (() => HTMLElement | null) | null;
  returnFocus?: boolean;
}

export interface FocusTrapHandle {
  activate: () => void;
  deactivate: () => void;
  destroy: () => void;
}

export interface InertHandle {
  restore: () => void;
}

export interface ScrollLockHandle {
  unlock: () => void;
}

export interface DOMCapabilityProvider {
  trapFocus: (container: HTMLElement, options?: FocusTrapOptions) => FocusTrapHandle;
  setInert: (elements: HTMLElement[]) => InertHandle;
  lockScroll: (target?: HTMLElement) => ScrollLockHandle;
  onEscape: (callback: () => void) => () => void;
  onOutsideClick: (container: HTMLElement, callback: () => void) => () => void;
}
