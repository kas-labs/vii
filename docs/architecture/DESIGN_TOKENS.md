# Vii Design Token Architecture

Status: Draft

## Purpose

Vii design tokens provide a portable source of truth for visual decisions across source components, packaged components, Web Components, documentation, Figma integrations, and future mobile or desktop targets.

## Principles

- canonical tokens are platform-neutral;
- semantic tokens are preferred in component code;
- themes override semantic values without changing component structure;
- component tokens are introduced only when semantic tokens are insufficient;
- consumers may replace the Vii theme without forking component behavior;
- generated outputs are build artifacts, not canonical sources.

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

## Canonical format

The canonical token source should follow the Design Tokens Community Group format unless prototype work identifies a material incompatibility.

Example:

```json
{
  "color": {
    "primary": {
      "$type": "color",
      "$value": "hsl(240 85.1% 71%)"
    }
  }
}
```

The initial Vii accent is:

```css
--vii-color-primary: hsl(240 85.1% 71%);
```

The brand value must remain replaceable at application level.

## Generated outputs

Potential generators:

- CSS custom properties;
- TypeScript constants;
- Sass variables;
- Tailwind theme bridge;
- JSON for tooling;
- Figma-compatible token files;
- React Native theme objects;
- platform resources in later research phases.

Not every output is committed for the first release.

## Theme model

Initial themes:

- light;
- dark;
- high contrast.

Optional dimensions:

- compact or comfortable density;
- web, touch, and desktop profiles;
- reduced motion;
- brand themes.

A theme changes tokens, not component semantics.

## Naming rules

Token names must describe meaning rather than current appearance.

Prefer:

```text
color.action.primary.background
```

Avoid:

```text
purpleButtonBackground
```

Names should remain valid if a theme changes the value from purple to another color.

## CSS variable boundary

CSS custom properties are the primary web delivery mechanism.

Packaged Web Components read semantic variables through the host cascade. Source components may consume the same variables through plain CSS, CSS Modules, Sass, or Tailwind integration.

## Tailwind integration

Tailwind support is generated from canonical tokens.

Tailwind is not the canonical source and is not required inside Shadow DOM components.

A consumer may select a Tailwind source template through the CLI without affecting users of plain CSS or packaged elements.

## Validation

Token builds should validate:

- references resolve;
- cycles do not exist;
- required semantic tokens are present;
- light, dark, and high-contrast themes are complete;
- color contrast requirements are testable;
- generated names are stable;
- generated outputs are deterministic.

## Versioning

Removing or renaming a stable semantic token is a breaking change.

Adding a primitive token is normally non-breaking.

Changing a token value may be visually breaking even when the TypeScript or CSS API remains compatible and must be documented in release notes.

## Relationship with the registry

Registry items declare the semantic and component tokens they consume.

This allows the CLI to:

- detect missing tokens;
- install required theme files;
- explain visual dependencies;
- generate theme previews;
- validate custom themes before applying components.
