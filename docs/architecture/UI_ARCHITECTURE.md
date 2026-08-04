# Vii UI Architecture

Status: Draft

## Purpose

Vii UI is an open, accessible, cross-framework component system for React, Angular, Vue, Web Components, and Vanilla projects.

Its defining principle is ownership: developers may add source code to their projects, install maintained packages, or use framework-agnostic Custom Elements without being forced into one distribution model.

## Product position

> Accessible primitives. Open components. Any framework. Your code.

Vii UI is inspired by the source-ownership model popularized by shadcn, but it is not React-only, Tailwind-only, or tied to one primitive engine.

## Non-goals

Vii UI is not:

- a mandatory dependency of Vii State, Query, or Server;
- a universal native renderer for every platform;
- a Tailwind-only component library;
- exclusively a Web Components library;
- a guarantee that identical DOM is appropriate for every framework;
- a reason to place all component logic inside Shadow DOM;
- a replacement for platform accessibility semantics.

## Layered model

```text
Vii UI Contracts
→ Vii UI Behaviors
→ Vii UI Primitives
→ Framework or Element targets
→ Styled components
→ Compositions and application blocks
```

### Contracts

Framework-neutral definitions for:

- component state;
- events;
- variants and sizes;
- accessibility requirements;
- form behavior;
- overlay behavior;
- keyboard interactions;
- capability metadata.

### Behaviors

Renderless TypeScript logic for components such as:

- disclosure;
- tabs;
- dialog;
- menu;
- selection;
- listbox;
- combobox;
- tooltip;
- toast.

Behaviors must not require Vii State. An optional Vii adapter may expose diagnostics and lifecycle integration.

### Primitives

Minimal accessible building blocks with little or no visual identity.

### Targets

Vii UI may produce multiple targets:

- React source components;
- Angular source components;
- Vue source components;
- packaged framework components;
- Web Components;
- Vanilla compositions.

A target is a distribution and integration decision, not a separate product philosophy.

## Distribution modes

### Source mode

The CLI adds component source code to the consumer repository.

```bash
vii ui add dialog
```

The application owns and may modify the files.

Source mode is the default long-term experience because it provides maximum control and minimizes vendor lock-in.

### Package mode

The application imports maintained components from versioned npm packages.

```ts
import { Button } from '@kas-labs/vii-ui-react';
```

Package mode is useful for prototypes, centralized enterprise systems, and teams that prefer managed updates.

### Elements mode

The application uses standards-based Custom Elements.

```html
<vii-button>Save</vii-button>
```

Elements mode is useful for Vanilla, mixed-framework products, microfrontends, embedded widgets, and gradual migrations.

## Framework-native experience

Shared behavior does not justify awkward public APIs.

Examples of expected native conventions:

```tsx
<ViiDialog open={open} onOpenChange={setOpen} />
```

```html
<vii-dialog [(open)]="open" />
```

```vue
<ViiDialog v-model:open="open" />
```

Generated wrappers may cover simple elements. Complex components may require dedicated framework adapters to preserve lifecycle, forms, slots, events, and typing.

## Stencil boundary

Stencil is a candidate implementation for the Web Components target because it provides Custom Elements tooling and framework wrapper generation.

Stencil is not part of Vii UI's public architecture contract.

The following must remain portable:

- registry schema;
- behavior contracts;
- design tokens;
- accessibility requirements;
- framework source templates;
- component metadata.

Vii must be able to replace or supplement Stencil without invalidating the registry or product model.

## Shadow DOM policy

Shadow DOM is selected per component.

### Good candidates

- button;
- checkbox;
- switch;
- badge;
- avatar;
- spinner;
- progress.

### Prefer Light DOM or source-owned markup

- typography;
- layout;
- table;
- form layouts;
- navigation structures;
- data table;
- command palette;
- date picker;
- editor;
- complex application blocks.

Selection criteria include composition, CSS cascade requirements, SSR, accessibility, performance, and consumer ownership.

## Styling

Packaged Web Components use regular component CSS and semantic design tokens.

Tailwind is an optional source-generation and consumer integration target. It is not a required runtime or internal styling engine.

Supported source strategies may include:

- plain CSS;
- CSS Modules;
- Sass;
- Tailwind;
- unstyled primitives.

## Native platform APIs

Vii UI should prefer standards where they improve reliability, while retaining abstraction boundaries and fallbacks.

Candidates include:

- ElementInternals for form-associated elements;
- the Popover API;
- the dialog element;
- CSS Anchor Positioning;
- Container Queries;
- Declarative Shadow DOM.

Native availability does not remove the need for accessibility and compatibility testing.

## Initial component scope

The first validation set should remain small:

1. Button
2. Input
3. Checkbox
4. Switch
5. Dialog
6. Tabs
7. Tooltip

Foundation utilities:

- visually hidden;
- focus management;
- layer or portal abstraction;
- tokens;
- test utilities.

Complex components such as Data Table, Date Picker, Rich Text Editor, and Scheduler are explicitly deferred.

## Accessibility

Each component must define:

- semantic role and element strategy;
- keyboard contract;
- focus behavior;
- labeling requirements;
- screen-reader behavior;
- disabled and readonly semantics;
- reduced-motion behavior;
- forced-colors behavior;
- RTL considerations.

Accessibility is a contract, not a final audit added after implementation.

## Performance principles

- component-level imports;
- no mandatory all-components bundle;
- no mandatory icon bundle;
- no mandatory Vii State dependency;
- no telemetry by default;
- lazy registration where appropriate;
- wrapper overhead measured independently;
- package and source modes tested separately.

## Relationship with Vii diagnostics

UI behaviors may emit structured development diagnostics through an optional adapter.

Examples:

- dialog opened because trigger was activated;
- focus moved to initial target;
- selection changed through keyboard input;
- invalid form value prevented submission.

Diagnostics must never be required for correct UI behavior.
