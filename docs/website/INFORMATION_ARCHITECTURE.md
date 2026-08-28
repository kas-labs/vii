# Vii Public Information Architecture

Status: Accepted for D1
Canonical domain: `https://viijs.org`
Application: `apps/web`

## 1. Purpose

This document defines the public information architecture for the Vii website and user-facing documentation.

It intentionally does not mirror the repository-root `docs/` structure. The public site is organized around user intent, product maturity, and discoverability rather than maintainer workflow.

## 2. Primary navigation

The initial top-level navigation is:

```text
Home
Docs
Learn
Examples
Ecosystem
Status
Roadmap
Blog
Contributing
```

`Releases` MAY appear in primary or secondary navigation depending on release cadence and final layout, but its route is reserved from the beginning.

## 3. Canonical public routes

```text
/
/docs/
/learn/
/examples/
/ecosystem/
/status/
/roadmap/
/blog/
/releases/
/contributing/
```

The public URL structure SHALL remain human-readable and stable. Internal repository directory names MUST NOT leak into URLs merely because content is sourced from those directories.

## 4. Homepage hierarchy

The homepage should explain Vii quickly and prove its value technically.

Recommended hierarchy:

1. Hero
2. Small real Core example
3. What Vii is
4. What can be used today
5. Core primitives
6. Lifecycle ownership / Scope differentiator
7. Framework integrations
8. Ecosystem map with maturity
9. Diagnostics
10. Current project status
11. Examples
12. Public roadmap preview
13. GitHub / Docs call to action

The hero should be proof-oriented rather than generic marketing. The preferred direction combines product positioning with a compact real code example and diagnostics/runtime evidence.

The architecture/ecosystem visualization belongs below the first proof layer rather than replacing the main value proposition.

## 5. Positioning contract

The public site should position Vii as a framework-neutral TypeScript ecosystem, not as a replacement for all existing frameworks.

Current positioning direction:

> Vii is a lightweight TypeScript ecosystem for explicit reactive state, lifecycle ownership, diagnostics, and framework-neutral application primitives.

Short form:

> Framework-neutral reactive primitives for TypeScript applications.

Final marketing copy is a D3 deliverable and must be validated against current product truth before publication.

## 6. What Vii is not

Public positioning should avoid accidental overclaiming.

The website should make clear where useful that Vii is not inherently:

- a React replacement;
- an Angular replacement;
- a Vue replacement;
- a backend framework;
- a database;
- an all-in-one application framework today;
- a mandatory AI layer;
- a universal global application architecture.

Future capabilities may expand the ecosystem, but current public claims must match implemented or accepted maturity.

## 7. Documentation tree

The initial `/docs` structure is:

```text
Introduction
  What is Vii?
  Why Vii?
  Status & Stability
  Installation

Getting Started
  Your first State
  Derived state
  Batch updates
  Lifecycle with Scope
  Next steps

Core
  State
  Computed
  Batch
  Scope
  Lifecycle
  Diagnostics

Integrations
  Vanilla
  React
  Angular
  Vue

CLI

Ecosystem Capabilities
  Form
  Query
  HTTP
  Schema
  Flow

API Reference
Compatibility
Troubleshooting
```

This tree is maturity-sensitive. A route MAY exist as an overview page before a capability is installable, but the page must clearly state maturity and availability.

## 8. Getting Started policy

Getting Started SHALL be deliberately short and confidence-building.

Recommended flow:

```text
Install or obtain Vii
  -> State
  -> read and update
  -> subscribe
  -> Computed
  -> Batch
  -> Scope
  -> dispose
  -> choose an integration
```

Form, Query, HTTP, Schema, Flow, CLI internals, governance, and deep architecture MUST NOT be prerequisites for the first successful experience.

If public registry installation is not yet available, the installation page must say so explicitly and provide only supported acquisition/testing instructions.

## 9. Core documentation model

Each stable public Core concept SHOULD use a consistent structure:

1. purpose;
2. minimal example;
3. semantics;
4. lifecycle/ownership implications;
5. edge cases;
6. common mistakes;
7. related concepts;
8. API reference links;
9. version/status metadata.

Concept docs should teach behavior. Generated API reference should document signatures. These two surfaces should not duplicate each other unnecessarily.

## 10. Integrations

Framework integration documentation should explain Vii from the perspective of the host framework.

Initial integration sections:

- Vanilla;
- React;
- Angular;
- Vue.

Integration pages must not imply package publication or support level that is not actually true.

Example applications should remain framework-specific where that helps validate real usage.

## 11. Ecosystem section

`/ecosystem` explains the broader capability map and maturity of Vii.

It should have two complementary representations.

### 11.1 Conceptual map

A visual architecture/ecosystem graph may show how capabilities relate.

### 11.2 Truth-oriented capability cards

A concrete list/grid must show actual capability metadata such as:

- capability name;
- maturity status;
- package name if one exists;
- availability;
- documentation state;
- compatibility/support state where relevant;
- link to roadmap or research decision.

Visual diagrams must never substitute for the status facts.

## 12. Status page

`/status` is the public snapshot of current product maturity.

It must answer:

- what exists today;
- what is installable today;
- what is experimental;
- what is being built;
- what research has graduated but is not implemented;
- what remains research, planned, or vision;
- what support/compatibility constraints apply.

The status page must consume the public status model defined in `PUBLIC_STATUS_MODEL.md` rather than inventing page-local labels.

## 13. Public roadmap

`/roadmap` translates repository roadmap information into a user-readable product roadmap.

It SHALL NOT expose every internal slice, agent task, or research artifact.

It should communicate:

- currently usable areas;
- active production work;
- accepted research directions;
- planned areas;
- vision areas;
- important sequencing constraints.

Internal implementation roadmaps remain under repository documentation.

## 14. Learn

`/learn` is distinct from reference documentation.

Learn content is task-oriented and may include:

- tutorials;
- conceptual explanations;
- migration guides;
- architecture patterns;
- framework-specific walkthroughs;
- debugging and diagnostics learning paths.

A Learn article may span multiple APIs. It should link into `/docs` rather than reproduce API inventories.

## 15. Examples

The website SHALL distinguish four content levels:

### Snippet

Small inline code demonstrating one idea.

### Example

Runnable focused example demonstrating a small capability.

### Tutorial

Step-by-step learning sequence with explanation.

### Reference application

Larger realistic application used to demonstrate architecture, integration, or validation.

Initial example priorities:

1. State counter;
2. Computed counter;
3. batched updates;
4. Scope lifecycle;
5. Diagnostics;
6. Vanilla integration;
7. React integration;
8. Angular integration;
9. Vue integration.

Form, Query, HTTP, Schema, and Flow examples should appear only when their production maturity supports honest examples.

## 16. API reference

`/docs/api` is generated from current public TypeScript exports.

The API information architecture should group by public package/capability rather than by arbitrary source file layout.

Users should be able to navigate from:

```text
concept -> API
API -> concept
example -> API
API -> example
```

Private internals and research prototypes are excluded.

## 17. Blog and releases

The blog is a communication surface, not a canonical technical specification.

Suitable content includes:

- architectural explainers;
- release announcements;
- ecosystem direction;
- case studies;
- development lessons;
- community content.

Release notes should remain concise, factual, and linked to exact release/package information.

A blog article MUST NOT override current package behavior, accepted contracts, or status metadata.

## 18. Contributing

`/contributing` is the public gateway for people who want to contribute.

It may summarize and link to repository contributor material, but it should not dump the entire maintainer documentation tree into the user navigation.

Expected topics:

- repository setup;
- contributor workflow;
- testing expectations;
- architecture orientation;
- governance links;
- RFC/ADR process;
- issue/PR conventions;
- code of conduct if adopted.

## 19. Public vs contributor boundary

The rule is:

```text
/docs          = use Vii
/contributing  = build Vii
root docs/     = engineer/govern Vii
```

Some architecture explanations may be useful publicly, but they should be rewritten as product learning material rather than exposed as raw internal documents.

## 20. Documentation page layout

Desktop documentation pages SHOULD use a proven three-column model where appropriate:

```text
primary docs navigation | article | on-this-page navigation
```

Responsive behavior must collapse this structure accessibly.

The shared global website header, branding, search, theme controls, and primary navigation should make website pages and documentation feel like one product.

## 21. Search content model

Public search should index:

- Docs;
- API;
- Learn;
- Examples;
- optionally Blog and Releases as separate types.

It should exclude maintainer-only repository material by default.

Search result metadata should make content type and capability context clear.

## 22. Content metadata

Public content SHOULD support structured metadata such as:

```text
title
description
status
package
availability
version
lastVerified
contentType
capability
```

Not every field is required on every content type.

Status-bearing content must use the central status model rather than free-text labels.

## 23. Design-system mapping

The supplied Vii design system already distinguishes marketing website and documentation UI. The website implementation should preserve this distinction while sharing:

- global tokens;
- typography;
- navigation language;
- status badges;
- cards;
- code presentation;
- light/dark theming;
- interaction patterns.

The preferred public visual direction is the supplied restrained "Quiet Intelligence" approach.

Any placeholder product data from design mockups must be replaced with repository truth before implementation acceptance.

## 24. D3 design inputs

Before D3 homepage implementation, the project should freeze a website design contract covering at least:

- logo usage;
- brand relationship to Kas Labs;
- typography;
- colors;
- spacing;
- grid;
- breakpoints;
- radius;
- borders/shadows;
- navigation;
- buttons and links;
- cards;
- status badges;
- code blocks;
- callouts;
- diagrams;
- dark mode;
- motion;
- responsive behavior;
- accessibility constraints.

The supplied design system and UI mocks are the starting design evidence for that contract.

## 25. Information architecture non-goals

This D1 document does not:

- write final homepage copy;
- create website routes;
- create public docs files;
- expose unpublished packages as available;
- commit to a playground;
- define every future ecosystem capability page;
- define final blog taxonomy;
- replace engineering documentation.

These are handled by later D-series slices according to the website roadmap.
