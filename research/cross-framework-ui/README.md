# Vii Cross-Framework UI Compliance Research (P6.5)

> **Throwaway research only.** This directory is not a package, public API, support fixture, or production implementation.

This directory contains research prototypes proving semantic equivalence and framework-native adaptation for Phase 6 UI Foundation (P6.5):

- **Vertical Slice**: Proves the component model using **Button** and **Disclosure** across 5 framework-native targets.
- **Target Matrix**:
  1. **Vanilla**: Pure JS/DOM classes with explicit `mount()`, `update()`, and `destroy()`.
  2. **React**: Idiomatic hooks (`useDisclosure`) and component props.
  3. **Angular**: Idiomatic `@Input()`, `@Output()`, and Signal-based state.
  4. **Vue**: Idiomatic composables (`useDisclosure`) and reactive refs.
  5. **Custom Elements**: Standards-based Web Components (`<vii-button>`, `<vii-disclosure>`).
- **Shared Compliance Suite**: Evaluates all 5 targets against identical behavioral, ARIA, and accessibility assertions without forcing a monolithic universal wrapper or compromising framework-native idioms.

---

## Verification Commands

Run the focused test suite and type check:

```bash
pnpm exec vitest run research/cross-framework-ui/*.test.ts
pnpm exec tsc --noEmit -p research/cross-framework-ui/tsconfig.json
```

---

## 1. Compliance Matrix

| Target | Native Convention | State Model | Lifecycle / Cleanup |
| --- | --- | --- | --- |
| **Vanilla** | Direct DOM elements | Pure functions | `destroy()` removes event listeners |
| **React** | Hooks & JSX props | `useDisclosure` | React unmount cleanup |
| **Angular** | Class adapters / Signals | Angular Signals | `DestroyRef` / component destroy |
| **Vue** | Composables / Refs | `ref(isExpanded)` | `onScopeDispose` |
| **Custom Elements** | HTML Attributes & Custom Events | Internal state | `disconnectedCallback` |

---

## 2. Shared Semantic Assertions

- **Button Semantics**: Correct `type="button|submit|reset"`, `disabled` state handling, `aria-disabled="true"`, and guaranteed click blocking when disabled.
- **Disclosure Semantics**: Proper `role="button"` and `role="region"`, `aria-expanded="true|false"`, `aria-controls` matching `panel.id`, `aria-labelledby` matching `trigger.id`, `hidden` panel state, and deterministic toggle transitions across all targets.
