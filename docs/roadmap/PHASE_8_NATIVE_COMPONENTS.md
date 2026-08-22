# Phase 8: Vii Native Component Research

Status: Research / Deferred until explicitly authorized

## Purpose

This roadmap records the future research sequence for Vii Native component authoring and runtime semantics without starting Phase 8 today.

The current project priority remains the active HTTP Client & Transport research track. Phase 8 must not begin merely because this roadmap exists.

The governing principle is:

> One Vii runtime. One semantic component model. Multiple authoring forms may exist only when they lower to equivalent runtime behavior.

This roadmap builds on:

- `docs/architecture/AUTHORING_PROFILES.md`;
- `docs/style-guide/VII_NATIVE.md`;
- `docs/architecture/TEMPLATE_CONTROL_FLOW.md`;
- the existing State, Scope, Diagnostics, adapter, and real-application evidence.

## Hard gates before Phase 8 execution

Phase 8 may begin only after an explicitly approved task confirms that the current higher-priority roadmap work permits it.

At minimum, the preflight must verify:

- current repository governance and project state;
- State and Scope semantics remain sufficiently stable;
- framework adapters remain valid references for integration semantics;
- real-application evidence still supports the Core lifecycle model;
- no newer RFC/ADR supersedes the authoring-profile direction;
- the task defines a bounded slice and stop condition;
- no production native renderer, compiler, package, or syntax is inferred from documentation alone.

Completion of one P8 slice does not authorize the next slice.

## Research invariants

Every Phase 8 experiment must preserve these invariants:

1. State, Computed, Batch, Scope, Query, HTTP, and Diagnostics semantics do not fork by authoring profile.
2. Component authoring syntax is a source/tooling concern, not a second reactive runtime.
3. Vii Native remains framework-agnostic and must not require React, Angular, or Vue runtimes.
4. Accessibility, security, lifecycle, and diagnostics semantics are shared across equivalent authoring forms.
5. A simpler source form may win. `.vii` is a candidate, not a predetermined outcome.
6. TSX, split templates, or programmatic TypeScript remain valid candidates until evidence rejects them.
7. No syntax graduates because it looks attractive. Tooling, source maps, diagnostics, performance, and migration ergonomics must be demonstrated.
8. SSR, hydration, streaming, and server functions remain optional higher layers and must not be required by the component baseline.
9. A valid research outcome is to reduce scope or stop native component work if existing framework adapters provide better value.

## P8.0: Authoring Model Gate

### Question

Which source-authoring model should become the recommended Vii Native default, if any?

Compare the same bounded component fixture in at least these candidate forms:

- `.vii` Single-File Component;
- split TypeScript + template + style files;
- TSX;
- programmatic TypeScript.

### Fixture requirements

Do not use a trivial Hello World fixture. The same semantic component should exercise enough behavior to expose authoring trade-offs, for example:

- local State;
- Computed value;
- input/prop;
- output/event;
- child component;
- conditional branch;
- keyed repetition;
- accessible interaction;
- Scope creation and disposal;
- colocated styling.

### Evaluation dimensions

Compare:

- readability and cognitive load;
- boilerplate and source locality;
- TypeScript inference;
- refactoring ergonomics;
- parser complexity;
- formatter feasibility;
- syntax highlighting and editor implications;
- source-map quality;
- diagnostics precision;
- control-flow readability;
- styling ergonomics;
- testability;
- generated representation size;
- compile cost;
- migration familiarity for Angular, React, and Vue developers.

### Valid outcomes

- `.vii` becomes the preferred research direction;
- split authoring becomes the preferred direction;
- TSX becomes the preferred direction;
- multiple first-class forms remain justified;
- evidence is insufficient and no default is selected;
- native authoring scope is reduced or stopped.

Stop after the authoring decision matrix. Do not continue automatically to P8.1.

## P8.1: Minimal Component IR

Define the smallest framework-neutral Component IR or equivalent semantic representation needed to compare authoring forms honestly.

Research only what is required for the bounded fixture:

- element/component creation;
- static text/attributes;
- dynamic bindings;
- event attachment;
- child ownership;
- conditional regions;
- keyed repeated regions;
- source-location provenance.

The IR must not encode React, Angular, or Vue-specific public concepts.

A source form is not first-class if it requires different runtime semantics for equivalent behavior.

Stop after the IR contract and fixtures are reviewed.

## P8.2: Static Rendering and Reactive Bindings

Research the minimal client rendering path for:

- text;
- attributes;
- properties;
- classes;
- styles;
- State and Computed dependencies.

Evidence must show targeted updates rather than unnecessary subtree recreation where the architecture claims fine-grained behavior.

No SSR requirement is introduced in this slice.

## P8.3: Events and Local Interaction

Research:

- event handler attachment/removal;
- event typing;
- listener ownership;
- handler replacement;
- disabled/read-only semantics where applicable;
- Scope cleanup;
- diagnostics without recording application values.

The event model must not leak listeners after component disposal.

## P8.4: Conditional Control Flow

Validate the semantic operations defined in `docs/architecture/TEMPLATE_CONTROL_FLOW.md`:

- conditional branch;
- else/else-if behavior;
- switch or discrete branching where justified;
- empty-state branch behavior;
- branch Scope creation/disposal;
- type narrowing feasibility;
- focus/accessibility implications.

Source token choice remains separate from semantic correctness.

## P8.5: Keyed Repetition

Research collection rendering with stable identity:

- insert;
- remove;
- reorder;
- retained child/local state;
- nested item Scopes;
- duplicate keys;
- unstable keys;
- empty to non-empty transitions;
- minimal DOM movement.

Index identity must not be presented as universally safe.

## P8.6: Component Lifecycle and Scope

Prove lifecycle ownership for:

- component Scope creation;
- child Scope ownership;
- subscriptions;
- effects/resources where introduced;
- event listeners;
- observers;
- request cancellation at explicit boundaries;
- idempotent disposal;
- stale-emission cutoff.

Include repeated mount/dispose and retained-memory evidence before lifecycle claims graduate.

## P8.7: Composition Contract

Research the shared semantic contract for:

- inputs/props;
- outputs/events;
- children/content/slots;
- default values;
- controlled/uncontrolled ownership where relevant;
- component public/private boundaries;
- composition over inheritance.

Angular-style, React-style, Vue-style, and Vii Native authoring may use familiar source vocabulary only when they map cleanly to one semantic contract.

No profile-only runtime capability is allowed.

## P8.8: Accessibility and Security Gate

Accessibility evidence should cover, where applicable:

- semantic HTML;
- accessible naming;
- keyboard behavior;
- focus entry/movement/restoration;
- disabled and readonly behavior;
- ARIA relationships;
- reduced motion;
- forced colors/high contrast;
- RTL interaction;
- browser-level accessibility checks.

Security research should include:

- raw HTML sinks;
- URL sinks;
- attribute/property injection;
- event-handler code generation;
- CSP compatibility;
- Trusted Types where relevant;
- no `eval` or `new Function` for template expressions;
- source/compiler hostile-input fixtures;
- diagnostics privacy.

Automated checks do not constitute accessibility or security certification.

## P8.9: Tooling Feasibility

Evaluate the tooling burden of the retained authoring candidates:

- parser;
- formatter;
- syntax highlighting;
- TypeScript expression integration;
- language-service/LSP feasibility;
- source maps;
- compiler diagnostics;
- rename/refactor support;
- test tooling;
- editor error recovery;
- generated-code inspection.

A syntax with materially worse tooling may lose even if its source examples are shorter.

## P8.10: SSR and Hydration Compatibility Gate

This slice does not make SSR mandatory.

Prove only that the retained Component IR/runtime direction does not prevent future optional server rendering and hydration.

Research:

- deterministic render representation;
- client/server identity boundaries;
- hydration ownership;
- mismatch diagnostics;
- request isolation;
- serialization safety;
- no cross-request state leakage.

The baseline remains CSR. If SSR adds excessive conceptual/runtime cost, keep it separate or defer it.

## P8.11: Performance and Memory Evidence

Measure the retained prototype rather than relying on architectural claims.

Evidence should include, where meaningful:

- component creation cost;
- targeted update cost;
- conditional switching;
- keyed insertion/removal/reorder;
- listener/subscription cleanup;
- post-disposal retained memory;
- generated JavaScript size;
- compiler output size;
- compile time;
- authoring-profile overhead;
- bundle impact of unused profiles.

Benchmarks must document environment, methodology, warmup/repetition strategy, and limitations.

Do not establish numeric release budgets before reproducible baselines exist.

## P8.12: Authoring and Native Component Graduation Gate

After P8.0-P8.11 evidence, decide the retained product surface.

Possible decisions include:

- one recommended Vii Native source form;
- one default plus one or more advanced alternate forms;
- Component IR/runtime only, with reduced syntax scope;
- adapters remain the primary product and native components are deferred;
- stop native component development.

The final gate must explicitly decide:

- default Vii Native authoring form, if any;
- supported alternate forms, if any;
- whether familiarity profiles require generated native syntax or documentation conventions only;
- Component IR maturity;
- tooling feasibility;
- accessibility/security readiness;
- performance/memory evidence;
- migration and compatibility implications;
- whether Phase 9 native runtime/build research is justified.

No production package, stable `.vii` syntax, application generator, or Phase 9 work is authorized merely by completing the research document.

## Suggested evidence fixture

A future P8.0 task should prefer one medium-small fixture rather than several trivial demos.

A useful candidate is a task/list component with:

```text
TaskList
  -> filter State
  -> filteredTasks Computed
  -> conditional empty state
  -> keyed task list
  -> TaskItem child components
  -> toggle/remove events
  -> accessible controls
  -> child Scope cleanup
```

The exact fixture is not frozen. The important requirement is semantic equivalence across authoring candidates.

## Relationship to authoring profiles

Vii Native is the recommended product identity only if evidence supports it.

Angular-style, React-style, and Vue-style profiles are familiarity layers. They may influence source organization, terminology, examples, and generated templates, but they must not fork runtime semantics.

A likely long-term model is:

```text
                    shared Vii semantics
                           |
                    Component IR/runtime
                           |
        +------------------+------------------+
        |                  |                  |
   Vii Native         Angular-style      React-style
        |                                     |
        +---------------- Vue-style ----------+
```

This is a research model, not a compatibility promise.

## Current stop condition

Phase 8 is not active now.

The repository should continue the current higher-priority roadmap work, including completion of the HTTP Client & Transport research track, before an explicitly approved Phase 8 task begins.

When Phase 8 is eventually authorized, start at P8.0, restore current repository truth, re-run canonical triage, and stop after the approved slice.