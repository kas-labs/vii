# Vii UI Architecture

Status: Draft / Research

## Purpose

Vii UI is a candidate open, accessible, cross-framework UI foundation for React, Angular, Vue, Custom Elements, and Vanilla projects.

Its defining principle is ownership: developers may add source code to their projects, consume maintained packages, or use standards-based Custom Elements without being forced into one distribution model.

No distribution mode, package name, component API, registry protocol, or implementation engine is stable while the governing RFCs remain Draft.

## Product position

> Accessible primitives. Open components. Any framework. Your code.

Vii UI is inspired by source-ownership systems such as shadcn, but it is not React-only, Tailwind-only, Web-Components-only, or tied to one primitive engine.

## Non-goals

Vii UI is not:

- a mandatory dependency of Vii State, Query, Form, Flow, HTTP, or Server;
- a universal native renderer;
- a Tailwind-only component library;
- exclusively a Custom Elements library;
- a guarantee that identical DOM is appropriate across frameworks;
- a reason to hide all behavior inside Shadow DOM;
- a replacement for semantic HTML, browser accessibility APIs, or assistive-technology testing;
- a universal cross-framework component compiler;
- a registry service that can execute arbitrary installation code.

## Layered model

```text
UI contracts
-> behavior state machines / interaction intent
-> DOM and platform capabilities
-> primitives
-> framework / Vanilla / Custom Element targets
-> styling and tokens
-> compositions and application blocks
```

### UI contracts

Framework-neutral definitions for:

- state and transitions;
- controlled/uncontrolled ownership where relevant;
- accessibility requirements;
- keyboard intent;
- form semantics;
- overlay semantics;
- capabilities and lifecycle requirements;
- shared test cases.

Contracts describe semantics. They must not be shaped as React props, Angular directives, Vue emits, DOM Event objects, or framework callbacks.

### Behaviors

Renderless behavior may model deterministic interaction state such as:

- disclosure expanded state;
- tabs selection and navigation intent;
- selection models;
- menu/listbox state;
- dialog open/close intent.

Behaviors must not require Vii State. An optional Vii integration may add Scope ownership or diagnostics only when it does not change behavior semantics.

### DOM and platform capabilities

Not all accessible UI behavior is framework-neutral pure state.

The following belong behind explicit DOM/platform seams:

- focus placement and restoration;
- tabbable discovery and focus containment;
- background inertness;
- scroll locking;
- portals and layering;
- pointer, keyboard, and document/window event wiring;
- geometry and positioning;
- ResizeObserver / IntersectionObserver where needed;
- form-associated Custom Element integration;
- browser-specific compatibility behavior.

A pure Node behavior test cannot prove Dialog focus trapping or browser accessibility.

### Primitives

Minimal accessible building blocks with little or no visual identity.

### Targets

Research targets may include:

- React source components;
- Angular source components;
- Vue source components;
- Vanilla compositions;
- Custom Elements;
- maintained framework packages only if evidence justifies package mode.

A target is an integration/distribution choice, not a separate semantic product.

## Distribution modes

RFC 0008 remains Draft. The following modes are research candidates.

### Source mode

The CLI may add component source files to the consumer repository.

```bash
vii ui add dialog
```

The application owns and may modify installed source. Source mode is the default research direction because it maximizes control and provides an explicit exit path.

### Package mode

Maintained npm packages may be evaluated for teams that prefer centralized upgrades.

Exact package names and package boundaries are intentionally not selected here. Package naming is a governed public-contract decision.

### Elements mode

Standards-based Custom Elements may provide framework-independent consumption for suitable components.

```html
<vii-button>Save</vii-button>
```

Custom Elements are not assumed to be the universal implementation source for React, Angular, Vue, or complex compositions.

## Framework-native experience

Shared semantics do not justify awkward public APIs.

Each target may expose native conventions for:

- props/inputs;
- events/outputs;
- controlled state;
- slots/content projection;
- forms;
- lifecycle;
- typing.

Generated wrappers are evaluated against dedicated framework implementations. Neither approach is assumed correct for every component.

## Stencil boundary

Stencil is a candidate implementation tool for Custom Element research.

Stencil is not a Vii public architecture contract and must not become a hidden requirement for source React, Angular, Vue, or Vanilla components.

Portable assets include:

- behavior contracts;
- design tokens;
- accessibility requirements;
- component metadata;
- registry data;
- shared semantic test cases.

## Shadow DOM policy

Shadow DOM is selected per component after evidence.

Good research candidates include simple encapsulated controls such as Button, Checkbox, Switch, Badge, Spinner, and Progress.

Light DOM or source-owned markup may be preferable for typography, layout, tables, navigation, form compositions, command palettes, date pickers, editors, and larger application blocks.

Selection criteria include:

- composition and slots;
- CSS cascade and consumer theming;
- forms;
- SSR/hydration;
- accessibility and assistive-technology behavior;
- performance;
- consumer ownership.

## Styling

Semantic design tokens are the portable styling boundary.

Tailwind is an optional source/template integration, not the canonical token source or a required runtime dependency.

Source strategies may include:

- plain CSS;
- CSS Modules;
- Sass;
- Tailwind;
- unstyled primitives.

## Native platform APIs

Vii UI should prefer semantic HTML and native platform capabilities when they improve correctness and reduce code, while retaining compatibility seams.

Research candidates include:

- `<dialog>`;
- Popover API;
- `inert`;
- ElementInternals;
- CSS Anchor Positioning;
- Container Queries;
- Declarative Shadow DOM.

Native availability does not remove the need for browser and assistive-technology testing.

## Initial validation strategy

Do not implement the complete component list in parallel.

Use progressive vertical slices:

1. Button or another simple semantic control for token/styling/distribution evidence.
2. Disclosure for simple interactive behavior.
3. Tabs for composite keyboard behavior.
4. Dialog only after the DOM focus/layer capability boundary is explicit.

Checkbox, Switch, Input, Tooltip, and later primitives may follow when they exercise a new boundary.

Complex components such as Data Table, Date Picker, Rich Text Editor, Scheduler, Combobox, and Command Palette are deferred until the foundation demonstrates clear value.

## Accessibility contract

Every interactive component must define:

- native element/ARIA strategy;
- accessible-name requirements;
- keyboard contract;
- focus entry, movement, and restoration;
- disabled and readonly semantics where relevant;
- state relationships such as `aria-expanded`, `aria-selected`, or `aria-controls` where appropriate;
- reduced-motion behavior when motion exists;
- forced-colors/high-contrast behavior;
- RTL behavior for directional interaction;
- assistive-technology test expectations.

WAI-ARIA Authoring Practices are reference guidance for common patterns. APG examples are not production certification and automated audits alone cannot establish full accessibility support.

Accessibility evidence should combine:

- deterministic semantic/unit tests;
- browser keyboard tests;
- accessibility-tree or axe-style automated checks;
- focus lifecycle tests;
- forced-colors and reduced-motion checks where applicable;
- manual assistive-technology smoke tests before public support claims.

## Security model

Security begins before registry or CLI writes.

Research must address:

- declarative-only registry content;
- path traversal and absolute-path rejection;
- symlink/root escape prevention;
- duplicate destination handling;
- integrity mismatch behavior;
- prototype-pollution-shaped metadata;
- generated content/template injection;
- dependency-plan safety;
- CSP / Trusted Types compatibility;
- provenance and registry origin;
- no hidden installation scripts.

Security review is continuous across P6.1-P6.6, not a late final audit.

## Performance principles

- component-level imports;
- no mandatory all-components bundle;
- no mandatory icon bundle;
- no mandatory Vii State dependency;
- no telemetry by default;
- wrapper overhead measured independently;
- source/package/elements modes measured separately;
- lifecycle disposal and retained-memory risk included where applicable.

Numeric budgets are adopted only after reproducible baselines exist. Phase planning must not invent release thresholds first and measure later.

## Relationship with Vii diagnostics

UI integrations may emit structured development diagnostics through an optional adapter.

Diagnostics must remain value-safe and observational. They must never be required for correct UI behavior or grant mutation authority.

Possible structural events include focus ownership changes, interaction causes, selection transitions, and blocked invalid operations, but exact event schemas require separate evidence and governance.

## Relationship with Registry and CLI

Registry items are declarative data plus files. CLI mutation follows the existing Analyze/Plan/Preview/Apply/Validate/Report safety model with registry-specific Resolve and integrity validation before mutation.

The first source-distribution slice should use local fixtures before introducing remote registry transport. Dependency installation, force-overwrite behavior, remote trust, update merging, and signatures are separate decisions.

## Phase 6 evidence gate

See `docs/roadmap/PHASE_6_UI.md` for the bounded sequence.

Research may graduate only when evidence supports the actual retained surface. Valid outcomes include a smaller Vii UI, reuse of mature accessibility primitives, a tokens/registry-only foundation, thin adapters, or stopping Vii-owned UI implementation when maintenance cost exceeds differentiated value.
