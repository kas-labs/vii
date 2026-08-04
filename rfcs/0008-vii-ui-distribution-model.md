# RFC 0008: Vii UI Distribution Model

Status: Draft

## Summary

Vii UI supports three complementary distribution modes:

1. source mode;
2. package mode;
3. elements mode.

No single mode is mandatory for all components or teams.

## Motivation

A source-only system maximizes ownership but makes centralized upgrades harder.

A package-only system simplifies upgrades but reduces control and increases lock-in.

A Web Components-only system improves framework independence but may create awkward framework integration and styling boundaries for complex compositions.

Vii UI should allow developers to choose the appropriate tradeoff without abandoning one design language and accessibility contract.

## Decision

### Source mode

The Vii CLI copies framework-appropriate source files into the application.

Source mode is the recommended default for reusable application components and compositions.

Properties:

- application owns the code;
- local modification is expected;
- registry tracking is optional and detachable;
- updates use three-way comparison;
- styling strategy may be selected by the consumer.

### Package mode

Components are imported from versioned npm packages.

Properties:

- centralized maintenance;
- normal semantic versioning;
- package-level tree shaking;
- consumer does not own internal source;
- suitable for organizations that prioritize managed consistency.

### Elements mode

Components are delivered as standards-based Custom Elements.

Properties:

- framework-agnostic consumption;
- useful for Vanilla, microfrontends, embedded interfaces, and mixed stacks;
- selective Shadow DOM policy;
- generated wrappers may improve framework ergonomics;
- complex components may still use source or native framework targets.

## Shared contracts

All modes should derive from shared definitions where practical:

- behavior contracts;
- accessibility requirements;
- design tokens;
- component metadata;
- test cases;
- registry identity.

Shared contracts do not require identical implementation or DOM.

## Framework support

Initial targets:

- React;
- Angular;
- Vue;
- Web Components;
- Vanilla examples.

Each target must preserve its native conventions for lifecycle, forms, events, and composition.

## Stencil

Stencil is approved for prototype evaluation of the Elements target.

Stencil is not approved as a mandatory implementation for source React, Angular, or Vue components, nor as a permanent public architecture dependency.

## Shadow DOM

Shadow DOM usage is decided per component.

The implementation must document why a component uses Shadow DOM, Light DOM, or source-owned framework markup.

## Tailwind

Tailwind may be offered as a source template and token integration.

Tailwind is not required in Vii UI runtime packages or as the canonical design token source.

## First validation set

- Button
- Input
- Checkbox
- Switch
- Dialog
- Tabs
- Tooltip

The set intentionally covers controls, forms, overlays, keyboard behavior, focus, and multiple composition models.

## Deferred

- Data Table;
- Date Picker;
- Rich Text Editor;
- native mobile renderer;
- a universal cross-framework component compiler;
- automatic AI component generation.

## Success criteria

The model is validated when:

- one component can be delivered in at least two modes;
- React, Angular, Vue, and Vanilla examples are usable;
- source mode can be detached without breaking the component;
- package and elements modes remain tree-shakable;
- accessibility contracts pass across supported targets;
- local styling can be replaced without modifying shared behavior.

## Open questions

- Which components justify dedicated framework implementations?
- What exact package boundaries minimize duplicated code?
- How are tests shared without forcing identical markup?
- Which source styling templates are included in the first public release?
- How are generated wrappers versioned against element packages?
