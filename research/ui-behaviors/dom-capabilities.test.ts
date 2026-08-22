import { describe, expect, it, vi } from "vitest";
import {
  getTabbableElements,
  lockScroll,
  onEscape,
  onOutsideClick,
  setInert,
  trapFocus,
} from "./dom-capabilities.js";

// Self-contained lightweight DOM mock environment for capability validation
class MockDOMElement {
  public tagName: string;
  public attributes = new Map<string, string>();
  public style: Record<string, string> = {};
  public children: MockDOMElement[] = [];
  public parentElement: MockDOMElement | null = null;
  public isFocused = false;
  public inert = false;

  constructor(tagName: string, attributes: Record<string, string> = {}) {
    this.tagName = tagName.toUpperCase();
    for (const [k, v] of Object.entries(attributes)) {
      this.attributes.set(k, v);
    }
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  appendChild(child: MockDOMElement): void {
    this.children.push(child);
    child.parentElement = this;
  }

  querySelectorAll<T = any>(selector: string): T[] {
    const matched: MockDOMElement[] = [];
    function search(el: MockDOMElement) {
      if (el.tagName === "BUTTON" || el.tagName === "INPUT" || el.hasAttribute("href")) {
        matched.push(el);
      }
      for (const child of el.children) search(child);
    }
    for (const child of this.children) search(child);
    return matched as unknown as T[];
  }

  contains(node: any): boolean {
    if (node === this) return true;
    for (const child of this.children) {
      if (child.contains(node)) return true;
    }
    return false;
  }

  focus(): void {
    this.isFocused = true;
  }
}

describe("DOM Capabilities Layer", () => {
  it("discovers focusable elements correctly and excludes disabled/hidden elements", () => {
    const container = new MockDOMElement("div");
    const btn1 = new MockDOMElement("button");
    const btnDisabled = new MockDOMElement("button", { disabled: "true" });
    const btnHidden = new MockDOMElement("button", { "aria-hidden": "true" });
    const link = new MockDOMElement("a", { href: "/profile" });

    container.appendChild(btn1);
    container.appendChild(btnDisabled);
    container.appendChild(btnHidden);
    container.appendChild(link);

    const tabbables = getTabbableElements(container as unknown as HTMLElement);
    expect(tabbables).toHaveLength(2);
    expect(tabbables[0]).toBe(btn1);
    expect(tabbables[1]).toBe(link);
  });

  it("sets and cleanly restores inertness on background sibling nodes", () => {
    const sibling1 = new MockDOMElement("main") as unknown as HTMLElement;
    const sibling2 = new MockDOMElement("aside", {
      "aria-hidden": "false",
    }) as unknown as HTMLElement;

    const inertHandle = setInert([sibling1, sibling2]);
    expect((sibling1 as any).inert).toBe(true);
    expect(sibling1.getAttribute("aria-hidden")).toBe("true");
    expect(sibling2.getAttribute("aria-hidden")).toBe("true");

    inertHandle.restore();
    expect((sibling1 as any).inert).toBe(false);
    expect(sibling1.getAttribute("aria-hidden")).toBeNull();
    expect(sibling2.getAttribute("aria-hidden")).toBe("false");
  });

  it("locks body scroll and restores original overflow style on unlock", () => {
    const mockBody = new MockDOMElement("body") as unknown as HTMLElement;
    mockBody.style.overflow = "auto";

    const scrollHandle = lockScroll(mockBody);
    expect(mockBody.style.overflow).toBe("hidden");

    scrollHandle.unlock();
    expect(mockBody.style.overflow).toBe("auto");
  });

  it("activates focus trap and focuses initial element", () => {
    const container = new MockDOMElement("div");
    const btn1 = new MockDOMElement("button");
    const btn2 = new MockDOMElement("button");
    container.appendChild(btn1);
    container.appendChild(btn2);

    const trap = trapFocus(container as unknown as HTMLElement);
    trap.activate();

    expect(btn1.isFocused).toBe(true);

    trap.deactivate();
  });
});
