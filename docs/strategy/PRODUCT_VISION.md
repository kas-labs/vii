# Vii Product Vision

## Purpose

Vii exists to help developers build applications whose behavior remains understandable as they grow.

Modern applications often accumulate separate systems for local state, server state, forms, routing, UI, platform capabilities, and diagnostics. Each tool may work well alone, but the complete execution path becomes difficult to explain.

Vii aims to provide a small set of compatible TypeScript foundations that preserve causality, lifecycle ownership, and framework freedom.

## Current product definition

> Vii is a lightweight, observable TypeScript foundation for state, data, and application behavior across frameworks.

## Long-term direction

> Vii may evolve into a modular TypeScript application ecosystem for web, mobile, desktop, and server development.

The long-term direction is not a commitment to replace every framework, runtime, or platform. Vii will integrate with existing ecosystems first and only create new infrastructure where a validated need exists.

## Primary users

Initial users are TypeScript developers who:

- maintain React, Angular, Vue, or Vanilla applications
- need predictable state and lifecycle behavior
- want gradual adoption instead of framework migration
- value diagnostics, memory ownership, and reproducible performance
- build libraries or applications that span multiple environments

## Product promise

Vii should make it possible to answer:

- What changed?
- Why did it change?
- Which action caused it?
- Which selector, query, or subscriber reacted?
- Which scope owns the resource?
- Why is the resource still alive?
- Which framework or runtime adapter handled the operation?

## Differentiator

The primary differentiator is **understandable execution**.

Framework independence, small bundle size, CLI tooling, and optional AI are supporting qualities. They are not sufficient differentiators by themselves.

## Adoption model

Vii must support progressive adoption:

1. Use Vii State alone.
2. Add a framework adapter.
3. Add Query or Devtools when needed.
4. Use Vii UI independently from State.
5. Adopt platform or server contracts only where they provide value.

No application should be required to adopt the whole ecosystem.

## Relationship to AI

Vii Runtime must remain deterministic, local, and usable without AI.

Vii Assistant may later analyze structured diagnostics, suggest migrations, explain execution, and help create tests. It must not become a hidden production dependency or a requirement for using Vii.

## Success criteria

Vii succeeds when:

- basic concepts are learnable quickly
- framework adapters preserve one mental model
- lifecycle ownership is explicit and testable
- diagnostics explain meaningful execution chains
- package and runtime claims are reproducible
- external applications validate the APIs
- users can adopt or remove modules gradually
