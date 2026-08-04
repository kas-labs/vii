# Platform Capabilities

## Purpose

Vii applications may run in browsers, desktop shells, mobile containers, native environments, servers, workers, and tests.

Application logic should request explicit capabilities instead of importing platform globals throughout the codebase.

## Capability model

```ts
interface ViiPlatformCapabilities {
  storage?: ViiStorage;
  secureStorage?: ViiSecureStorage;
  filesystem?: ViiFilesystem;
  network?: ViiNetwork;
  clipboard?: ViiClipboard;
  notifications?: ViiNotifications;
  deepLinks?: ViiDeepLinks;
  lifecycle?: ViiLifecycle;
  shell?: ViiShell;
}
```

This is an architectural sketch, not a stable public API.

## Design principles

### Explicit

Code should declare required capabilities.

### Replaceable

Tests can provide deterministic in-memory implementations.

### Least privilege

An application receives only capabilities it needs.

### Observable

Capability use can emit privacy-safe diagnostic events.

### Platform honest

Adapters expose real differences instead of emulating every feature everywhere.

## Example

```ts
const app = createViiApp({
  capabilities: {
    storage: browserStorage(),
    network: browserNetwork(),
  },
});
```

A Tauri application could provide filesystem and window capabilities, while a server request scope could provide environment and request metadata capabilities.

## Capability categories

### Universal or common

- network state
- lifecycle
- clocks and scheduling
- storage abstraction

### Browser

- DOM integration
- browser storage
- visibility state
- history and navigation

### Desktop

- filesystem
- application windows
- native menus
- system notifications
- secure storage
- controlled shell access

### Mobile

- app lifecycle
- safe areas
- deep links
- notifications
- biometrics
- camera and location through explicit adapters

### Server

- environment variables
- request context
- process lifecycle
- filesystem where available
- workers and background execution where available

## Permissions

Vii may define a portable permission intent manifest, but it does not replace platform security systems.

Adapters may validate or generate platform-specific configuration for systems such as Tauri or Deno.

```yaml
permissions:
  filesystem:
    read:
      - "$APP_DATA/**"
  network:
    connect:
      - "api.example.com"
```

## Security boundaries

Sensitive capabilities must never be enabled implicitly.

Especially sensitive:

- shell execution
- unrestricted filesystem access
- secret access
- microphone and camera
- location
- biometric authentication
- arbitrary native commands

## Ownership

Capabilities that create resources must integrate with Vii scopes.

Examples:

- a network listener belongs to an application scope
- a file watcher belongs to a desktop window scope
- a request connection belongs to a server request scope

## Non-goals

The capability layer is not:

- a universal operating system abstraction
- a substitute for native SDKs
- permission bypass tooling
- a promise that all capabilities exist on all targets
