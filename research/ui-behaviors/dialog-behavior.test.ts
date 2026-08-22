import { describe, expect, it, vi } from "vitest";
import { createDialogBehavior } from "./dialog.js";
import type { DOMCapabilityProvider } from "./types.js";

describe("Dialog Behavior (APG Pattern & DOM Capability Boundary)", () => {
  it("operates in pure Node / headless environments without DOM dependencies", () => {
    const dialog = createDialogBehavior({ defaultOpen: false });
    expect(dialog.isOpen()).toBe(false);
    expect(dialog.isModal()).toBe(true);
    expect(dialog.getRole()).toBe("dialog");

    dialog.open();
    expect(dialog.isOpen()).toBe(true);

    const dialogProps = dialog.getDialogProps();
    const titleProps = dialog.getTitleProps();
    const descProps = dialog.getDescriptionProps();

    expect(dialogProps.role).toBe("dialog");
    expect(dialogProps["aria-modal"]).toBe(true);
    expect(dialogProps["aria-labelledby"]).toBe(titleProps.id);
    expect(dialogProps["aria-describedby"]).toBe(descProps.id);
    expect(dialogProps.tabIndex).toBe(-1);

    dialog.close();
    expect(dialog.isOpen()).toBe(false);
  });

  it("supports alertdialog role and controlled open state", () => {
    const onChange = vi.fn();
    const dialog = createDialogBehavior({
      isOpen: true,
      role: "alertdialog",
      onOpenChange: onChange,
    });

    expect(dialog.getRole()).toBe("alertdialog");
    expect(dialog.getDialogProps().role).toBe("alertdialog");

    dialog.close();
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("wires DOM capabilities (focus trap, inert, scroll lock, escape, outside-click) when attached", () => {
    const trapActivate = vi.fn();
    const trapDestroy = vi.fn();
    const inertRestore = vi.fn();
    const scrollUnlock = vi.fn();
    const escapeCleanup = vi.fn();
    const outsideCleanup = vi.fn();

    let escapeHandler: (() => void) | null = null;

    const mockDOM: DOMCapabilityProvider = {
      trapFocus: vi.fn().mockReturnValue({
        activate: trapActivate,
        deactivate: vi.fn(),
        destroy: trapDestroy,
      }),
      setInert: vi.fn().mockReturnValue({
        restore: inertRestore,
      }),
      lockScroll: vi.fn().mockReturnValue({
        unlock: scrollUnlock,
      }),
      onEscape: vi.fn().mockImplementation((cb) => {
        escapeHandler = cb;
        return escapeCleanup;
      }),
      onOutsideClick: vi.fn().mockReturnValue(outsideCleanup),
    };

    const dialog = createDialogBehavior({
      defaultOpen: true,
      domCapabilities: mockDOM,
    });

    const mockContainer = {} as HTMLElement;
    const mockSiblings = [{} as HTMLElement];

    const detach = dialog.attachDOM(mockContainer, mockSiblings);

    expect(mockDOM.trapFocus).toHaveBeenCalledWith(mockContainer);
    expect(trapActivate).toHaveBeenCalled();
    expect(mockDOM.setInert).toHaveBeenCalledWith(mockSiblings);
    expect(mockDOM.lockScroll).toHaveBeenCalled();
    expect(mockDOM.onEscape).toHaveBeenCalled();
    expect(mockDOM.onOutsideClick).toHaveBeenCalled();

    // Trigger escape key dismissal
    expect(escapeHandler).not.toBeNull();
    escapeHandler!();
    expect(dialog.isOpen()).toBe(false);

    // Detach and verify complete cleanup
    detach();
    expect(trapDestroy).toHaveBeenCalled();
    expect(inertRestore).toHaveBeenCalled();
    expect(scrollUnlock).toHaveBeenCalled();
    expect(escapeCleanup).toHaveBeenCalled();
    expect(outsideCleanup).toHaveBeenCalled();
  });
});
