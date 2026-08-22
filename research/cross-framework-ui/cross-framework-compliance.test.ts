import { describe, expect, it, vi } from "vitest";
import { AngularButtonAdapter } from "./angular/button.js";
import { AngularDisclosureAdapter } from "./angular/disclosure.js";
import { CustomElementButtonAdapter } from "./custom-elements/button.js";
import { CustomElementDisclosureAdapter } from "./custom-elements/disclosure.js";
import { ReactButtonAdapter } from "./react/button.js";
import { useReactDisclosureAdapter } from "./react/disclosure.js";
import type { ButtonContractProps, DisclosureContractProps } from "./types.js";
import { createVanillaButton } from "./vanilla/button.js";
import { createVanillaDisclosure } from "./vanilla/disclosure.js";
import { createVueButtonAdapter } from "./vue/button.js";
import { useVueDisclosureAdapter } from "./vue/disclosure.js";

describe("Cross-Framework Semantic Compliance Suite (P6.5)", () => {
  const targets = [
    {
      name: "Vanilla",
      createButton: (props: ButtonContractProps) => {
        const btn = createVanillaButton(props);
        return { getSnapshot: btn.getSnapshot, click: btn.click };
      },
      createDisclosure: (props: DisclosureContractProps) => createVanillaDisclosure(props),
    },
    {
      name: "React",
      createButton: (props: ButtonContractProps) => {
        const btn = ReactButtonAdapter(props);
        return { getSnapshot: btn.getSnapshot, click: () => btn.onClick?.() };
      },
      createDisclosure: (props: DisclosureContractProps) => useReactDisclosureAdapter(props),
    },
    {
      name: "Angular",
      createButton: (props: ButtonContractProps) => {
        const btn = new AngularButtonAdapter(props);
        return { getSnapshot: () => btn.getSnapshot(), click: () => btn.handleClick() };
      },
      createDisclosure: (props: DisclosureContractProps) => new AngularDisclosureAdapter(props),
    },
    {
      name: "Vue",
      createButton: (props: ButtonContractProps) => {
        const btn = createVueButtonAdapter(props);
        return { getSnapshot: btn.getSnapshot, click: btn.onClick };
      },
      createDisclosure: (props: DisclosureContractProps) => useVueDisclosureAdapter(props),
    },
    {
      name: "Custom Elements",
      createButton: (props: ButtonContractProps) => {
        const btn = new CustomElementButtonAdapter(props);
        return { getSnapshot: () => btn.getSnapshot(), click: () => btn.click() };
      },
      createDisclosure: (props: DisclosureContractProps) =>
        new CustomElementDisclosureAdapter(props),
    },
  ];

  for (const target of targets) {
    describe(`Target: ${target.name}`, () => {
      it("Button: conforms to semantic disabled state and type", () => {
        const enabledBtn = target.createButton({ type: "button" });
        expect(enabledBtn.getSnapshot()).toEqual({
          type: "button",
          disabled: false,
          ariaDisabled: undefined,
        });

        const disabledBtn = target.createButton({ type: "submit", disabled: true });
        expect(disabledBtn.getSnapshot()).toEqual({
          type: "submit",
          disabled: true,
          ariaDisabled: true,
        });
      });

      it("Button: fires onClick when enabled and blocks when disabled", () => {
        const onClick = vi.fn();
        const enabledBtn = target.createButton({ onClick });
        enabledBtn.click();
        expect(onClick).toHaveBeenCalledTimes(1);

        const disabledClick = vi.fn();
        const disabledBtn = target.createButton({ disabled: true, onClick: disabledClick });
        disabledBtn.click();
        expect(disabledClick).not.toHaveBeenCalled();
      });

      it("Disclosure: initializes collapsed and conforms to ARIA contracts", () => {
        const disclosure = target.createDisclosure({ defaultExpanded: false });
        expect(disclosure.isExpanded()).toBe(false);

        const snapshot = disclosure.getSnapshot();
        expect(snapshot.trigger.role).toBe("button");
        expect(snapshot.trigger.ariaExpanded).toBe(false);
        expect(snapshot.panel.role).toBe("region");
        expect(snapshot.panel.hidden).toBe(true);
      });

      it("Disclosure: toggles state deterministically across frameworks", () => {
        const onChange = vi.fn();
        const disclosure = target.createDisclosure({
          defaultExpanded: false,
          onExpandedChange: onChange,
        });

        disclosure.toggle();
        expect(disclosure.isExpanded()).toBe(true);
        expect(disclosure.getSnapshot().trigger.ariaExpanded).toBe(true);
        expect(disclosure.getSnapshot().panel.hidden).toBe(false);
        expect(onChange).toHaveBeenCalledWith(true);

        disclosure.toggle();
        expect(disclosure.isExpanded()).toBe(false);
        expect(disclosure.getSnapshot().trigger.ariaExpanded).toBe(false);
        expect(disclosure.getSnapshot().panel.hidden).toBe(true);
        expect(onChange).toHaveBeenCalledWith(false);
      });

      it("Disclosure: blocks toggle when disabled", () => {
        const onChange = vi.fn();
        const disclosure = target.createDisclosure({
          disabled: true,
          defaultExpanded: false,
          onExpandedChange: onChange,
        });

        disclosure.toggle();
        expect(disclosure.isExpanded()).toBe(false);
        expect(onChange).not.toHaveBeenCalled();
        expect(disclosure.getSnapshot().trigger.ariaDisabled).toBe(true);
      });
    });
  }
});
