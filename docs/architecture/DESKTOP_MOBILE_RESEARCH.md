# Desktop and Mobile Research Boundaries

## Purpose

Vii should be able to support desktop and mobile applications without claiming universal UI portability or creating new native runtimes.

This document defines research boundaries rather than committed implementation.

## Shared foundation

The following layers should be reusable across web, desktop, mobile, and server where their contracts are platform-neutral:

- State
- Query core
- Form core
- validation
- contracts
- diagnostics
- design tokens
- domain logic
- testing utilities

## Desktop direction

Tauri is the primary desktop research target because it allows Vii applications to retain a web frontend while accessing controlled native capabilities.

Research areas:

- application and window scopes
- filesystem capabilities
- secure storage
- native menus and notifications
- command transport
- permission validation
- desktop diagnostics
- packaging and update integration boundaries

Vii must not replace Tauri tooling, Rust commands, signing, bundling, or operating-system security.

## Mobile directions

Mobile work is divided into two distinct categories.

### Web-based mobile

Potential targets:

- Capacitor
- Tauri Mobile
- Progressive Web Apps

These can reuse web UI and framework adapters while adding explicit native capability adapters.

### Native UI mobile

Potential targets:

- React Native and Expo
- later platform-native integrations if justified

Native UI is a separate rendering target. Vii Web Components and DOM-based UI cannot be assumed to run unchanged.

## UI reuse policy

Reusable across targets:

- semantic design tokens
- behavior contracts where platform-appropriate
- validation and application logic
- component naming and interaction intent

Not guaranteed to be shared unchanged:

- rendered component implementation
- navigation
- focus behavior
- gestures
- accessibility semantics
- keyboard and safe-area behavior

## Platform profiles

Vii UI may research profiles such as:

```text
web
compact-desktop
touch
native
```

Profiles may affect density, touch targets, interaction assumptions, and composition. They do not create a universal renderer.

## Research sequence

1. Validate runtime-neutral Core in browser and Node.js.
2. Validate framework adapters and resource ownership.
3. Prototype one small Tauri application.
4. Prototype one small Capacitor application.
5. Evaluate native mobile only after shared logic and diagnostics are stable.

## Prototype criteria

A platform prototype must test:

- installation and build
- state lifecycle
- capability injection
- scope disposal
- diagnostics
- offline or reconnect behavior where relevant
- secure permission boundaries
- packaging constraints

## Non-goals

Vii will not initially create:

- a desktop runtime
- a mobile bridge
- a native rendering engine
- an alternative to Tauri or Capacitor CLI
- a promise of one UI implementation for all platforms
- native mobile components before a validated consumer exists
