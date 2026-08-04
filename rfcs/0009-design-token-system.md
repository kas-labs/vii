# RFC 0009: Design Token System

Status: Draft

## Summary

Vii UI adopts a platform-neutral design token source as the canonical representation of visual decisions.

CSS variables, Tailwind themes, TypeScript constants, and future platform outputs are generated artifacts.

## Motivation

Vii UI must support multiple frameworks, styling strategies, themes, and future platform targets without making one CSS framework the source of truth.

A canonical token model provides consistent naming, deterministic generation, theme portability, and tooling integration.

## Decision

The initial token system contains three layers:

1. primitive tokens;
2. semantic tokens;
3. limited component tokens.

Component implementations consume semantic tokens by default.

The canonical format should follow the Design Tokens Community Group model unless implementation work demonstrates a blocking incompatibility.

## Initial brand token

```text
color.primary = hsl(240 85.1% 71%)
```

The Vii default theme uses this value, but consumer themes may replace it.

## Initial themes

- light;
- dark;
- high contrast.

## Initial generated output

Committed for prototype evaluation:

- CSS custom properties;
- TypeScript constants;
- JSON manifest.

Planned adapters:

- Tailwind theme bridge;
- Sass variables;
- Figma-oriented output.

Research:

- React Native theme objects;
- native platform resources.

## Naming

Names describe purpose rather than current visual appearance.

Semantic names should remain valid across brand themes.

## Validation

Build validation must detect:

- unresolved references;
- reference cycles;
- missing required semantic tokens;
- incomplete themes;
- non-deterministic generated output;
- invalid token types.

Accessibility validation should report contrast concerns for relevant semantic pairs.

## Versioning

Removing or renaming a stable semantic token is breaking.

Visual value changes require release-note visibility even when structurally compatible.

## Tailwind boundary

Tailwind is an optional generated integration and source-template target.

Vii UI does not place Tailwind inside the architectural core or require it for Web Components.

## Open questions

- Which exact DTCG version is targeted at implementation time?
- How are color values normalized across CSS and non-CSS targets?
- Which semantic tokens are mandatory for a valid theme?
- How are component token additions reviewed?
- Should density and platform profiles be token themes or separate configuration dimensions?
