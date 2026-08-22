# Vii UI Behaviors & DOM Capabilities Research (P6.2)

> **Throwaway research only.** This directory is not a package, public API, support fixture, or production implementation.

This directory contains research prototypes validating the foundational interaction and accessibility architecture of Phase 6 UI Foundation (P6.2):

- **Architectural Seam**: Proves that interaction semantics can be shared without pretending browser focus, layout, and scrolling are pure state machines.
- **Framework-Neutral Behaviors**: Headless state machines for **Disclosure**, **Tabs**, and **Dialog** managing controlled/uncontrolled state, navigation, keyboard intent, and structural ARIA attributes.
- **Explicit DOM Capabilities Boundary**: Isolates browser-dependent features (`trapFocus`, `setInert`, `lockScroll`, `onEscape`, `onOutsideClick`) behind a typed capability provider with strict lifecycle disposal.
- **WAI-ARIA APG Alignment**: Evaluates and asserts compliance with official W3C WAI-ARIA Authoring Practices Guide (APG) patterns while explicitly noting that automated checks do not substitute for production Assistive Technology (screen reader) verification.

---

## Verification Commands

Run the focused test suite and type check:

```bash
pnpm exec vitest run research/ui-behaviors/*.test.ts
pnpm exec tsc --noEmit -p research/ui-behaviors/tsconfig.json
```

---

## 1. Separation of Responsibilities

| Responsibility Layer | Owned Capabilities | Execution Environment |
| --- | --- | --- |
| **Framework-Neutral Behavior** | Controlled/uncontrolled state, active/selected/expanded transitions, orientation, navigation intent, structural ARIA props, keyboard intent mapping. | Pure JavaScript / Node / Headless / SSR / Browser |
| **DOM Capabilities Boundary** | Focus movement, initial focus, focus trap & wrapping, background inertness (`inert` / `aria-hidden`), scroll lock (`overflow: hidden`), portal layering, browser event listeners. | Browser / DOM Only |

---

## 2. Implemented Patterns

### Disclosure (APG Pattern)
- **State**: `expanded`, `defaultExpanded`, `disabled`, `onExpandedChange`.
- **Keyboard**: `Enter` and `Space` toggle expanded state.
- **ARIA**: `aria-expanded="true|false"`, `aria-controls="panel-id"`, `role="region"`, `aria-labelledby="trigger-id"`, `hidden`.

### Tabs (APG Pattern)
- **Orientation**: `horizontal` (ArrowRight/ArrowLeft) vs `vertical` (ArrowDown/ArrowUp), `Home`, `End`.
- **Activation Modes**: `automatic` (selection follows focus) vs `manual` (Enter/Space selection).
- **Roving tabIndex**: Active tab has `tabIndex="0"`; inactive tabs have `tabIndex="-1"`.
- **Navigation Safety**: Skips disabled tabs and wraps around endpoints deterministically.

### Dialog (APG Modal Pattern & DOM Boundary)
- **Headless Node Support**: Deterministic open/close/toggle state with ARIA attributes (`role="dialog"|"alertdialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`).
- **DOM Attachment**: Integrates with `DOMCapabilityProvider` to activate focus containment, inert background siblings, body scroll locking, escape dismissal, and outside-click handling.
- **Leak-Free Disposal**: Explicit lifecycle cleanup (`destroy()`) restoring all styles, attributes, and removing event listeners.
