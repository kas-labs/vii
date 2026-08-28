---
title: Core overview
description: Understand the current experimental Vii Core model and its five public primitives.
---

Vii Core is the current public runtime foundation of Vii. It is experimental and focused on five primitives: `State`, `Computed`, `Batch`, `Scope`, and bounded opt-in `Diagnostics`.

This section documents how the current Core behaves. It does not describe private adapters, Form, Query, HTTP, Schema, Flow, or planned framework-level APIs as though they were already part of Core.

## The model

- **State** stores mutable reactive values.
- **Computed** derives lazy cached values from reactive dependencies.
- **Batch** groups synchronous writes into one notification boundary.
- **Scope** owns resources and disposes them deterministically.
- **Diagnostics** observes bounded structural runtime events without becoming hidden telemetry.

The central idea is explicitness: state changes are synchronous, lifecycle ownership is visible, and cleanup is deterministic.

## Start here

If you have not used Vii before, begin with [Getting Started](/docs/getting-started/). Then continue with:

- [State](/docs/core/state/)
- [Computed](/docs/core/computed/)
- [Batch](/docs/core/batch/)
- [Scope](/docs/core/scope/)

Diagnostics receives its own deeper documentation in D7.

## Current availability

`@vii-labs/core` is still experimental. Follow the acquisition instructions in Getting Started rather than assuming normal registry installation is available.
