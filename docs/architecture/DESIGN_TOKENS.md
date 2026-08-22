# Vii Design Token Architecture

Status: Draft / Research

## Purpose

Vii design tokens provide a portable source of truth for visual decisions across source components, packaged components, Custom Elements, documentation, design-tool integrations, and future platform targets.

## Principles

- canonical tokens are platform-neutral;
- semantic tokens are preferred in component code;
- themes override semantic values without changing component semantics;
- component tokens are introduced only when semantic tokens are insufficient;
- consumers may replace the Vii theme without forking component behavior;
- generated outputs are build artifacts, not canonical sources;
- Vii should not build a general-purpose token engine when a mature DTCG implementation can satisfy the validated need behind a replaceable boundary.

## Token layers

### Primitive tokens

Raw scales without application meaning.

```text
color.violet.500
color.gray.950
space.2
radius.md
font.size.sm
motion.duration.fast
```

### Semantic tokens

Purpose-driven values used by most components.

```text
color.background
color.foreground
color.primary
color.muted
color.danger
border.default
focus.ring
surface.elevated
```

### Component tokens

Narrow overrides for a specific component when general semantic tokens are insufficient.

```text
button.height.md
dialog.maxWidth
input.borderColor
toast.shadow
```

Component tokens must not become an uncontrolled duplicate design system.

## Canonical format baseline

The Phase 6 prototype targets the published DTCG 2025.10 format.

DTCG is a W3C Community Group specification, not a W3C Recommendation or Standards Track specification. The implementation must therefore keep the format boundary versioned and replaceable even while targeting the stable published report.

A color token uses a typed structured color value rather than treating an arbitrary CSS color string as the canonical DTCG value.

Illustrative 2025.10-style shape:

```json
{
  "$schema": "https://www.designtokens.org/schemas/2025.10/format.json",
  "color": {
    "primary": {
      "$type": "color",
      "$value": {
        "colorSpace": "srgb",
        "components": [0.47, 0.46, 0.96],
        "alpha": 1
      }
    }
  }
}
```

Exact canonical brand components are established and tested by P6.1 rather than inferred from an old CSS-string example.

The application-level CSS representation remains replaceable and may use modern CSS color syntax when generated.

## Aliases and resolution

Aliases are first-class token relationships. Resolution must:

- preserve the canonical source;
- detect unresolved aliases;
- detect cycles;
- reject invalid type substitutions;
- remain deterministic across repeated runs;
- avoid mutating input token objects.

The prototype must document whether generated outputs contain resolved values, preserved references, or both.

## Generated outputs

The first bounded Phase 6 prototype evaluates only:

- CSS Custom Properties;
- TypeScript constants or typed data;
- JSON/tooling output.

Later optional integrations may include:

- Tailwind theme bridges;
- Sass variables;
- design-tool adapters;
- React Native theme objects;
- platform resources.

Later outputs are not prerequisites for P6.1 and are not public support promises.

## Theme model

Initial web research covers:

- light;
- dark.

High-contrast and forced-colors behavior must not be reduced to a normal color-theme override. Forced-colors is a platform accessibility mode and is validated separately at the component/browser boundary.

Optional future dimensions include:

- compact or comfortable density;
- web, touch, and desktop profiles;
- reduced motion;
- brand themes.

A theme changes visual decisions, not component semantics.

## Naming rules

Token names describe meaning rather than current appearance.

Prefer:

```text
color.action.primary.background
```

Avoid:

```text
purpleButtonBackground
```

Names should remain valid if a brand or theme changes the rendered value.

Generated output names must also be collision-safe after escaping and normalization.

## CSS variable boundary

CSS Custom Properties are the primary web delivery candidate.

Packaged Custom Elements may consume semantic variables through the host cascade where the selected Shadow DOM policy permits it. Source components may consume the same generated variables through plain CSS, CSS Modules, Sass, Tailwind integration, or another application-owned styling strategy.

The token model must not require Shadow DOM or a specific CSS framework.

## Tailwind boundary

Tailwind support, if retained, is generated from canonical tokens.

Tailwind is not the canonical source and is not a required Vii UI runtime dependency.

## Accessibility validation

Token tooling can validate declared contrast relationships, but tokens alone cannot certify component accessibility.

P6.1 should distinguish at least:

- normal text contrast requirements;
- large text contrast requirements;
- non-text UI/component contrast where applicable;
- focus indicator relationships where applicable.

A generic `AA: pass` flag without the criterion and semantic pair is insufficient.

Component-level accessibility still requires rendered-state, forced-colors, reduced-motion, keyboard, and assistive-technology evidence in later slices.

## Validation and hostile input

Token research should cover:

- unsupported token types;
- malformed typed values;
- unresolved aliases;
- reference cycles;
- required semantic-token coverage;
- duplicate generated names;
- deterministic output;
- excessive nesting and node counts;
- oversized strings or metadata;
- prototype-pollution-shaped keys;
- non-mutating processing.

Production limits are set only after representative fixtures establish realistic requirements.

## Versioning

Removing or renaming a stable semantic token is breaking once a token contract becomes stable.

Adding a primitive token is normally non-breaking.

Changing a token value may be visually breaking even when structurally compatible and requires release-note visibility once a public token contract exists.

No token names or generated APIs are stable merely because they appear in Phase 6 research fixtures.

## Relationship with the registry

Registry items may declare semantic and component tokens they consume so tooling can detect missing visual dependencies and explain installation requirements.

Registry tooling must treat canonical token data as declarative input. It must not execute token-provided code or scripts.

## P6.1 build-vs-reuse gate

Before Vii owns a production token compiler, compare:

1. direct deterministic transformation of the narrow Vii fixture;
2. a mature DTCG-capable transformation tool;
3. the Vii throwaway prototype if one is built.

A thin validation/configuration layer around mature tooling is a valid and preferred outcome when it preserves Vii semantics with less maintenance cost.
