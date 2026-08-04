# RFC 0012: Platform Capabilities

- Status: Draft
- Area: Platform

## Summary

Introduce explicit capability contracts for platform services such as storage, filesystem, networking, notifications, lifecycle, secure storage, and shell access.

## Proposal

Application and domain logic should depend on Vii capability contracts rather than importing platform globals throughout the codebase.

Capabilities are:

- explicitly provided
- replaceable in tests
- scoped where they create resources
- observable through privacy-safe diagnostics
- permission-aware
- allowed to differ by platform

## Security rules

Sensitive capabilities are never enabled implicitly.

The following require explicit configuration and platform permission review:

- shell execution
- unrestricted filesystem access
- secret access
- microphone
- camera
- location
- biometrics
- arbitrary native commands

## Permission manifest

Vii may define a portable permission-intent manifest. It does not replace Tauri, Deno, operating-system, browser, or mobile permission systems.

Adapters may use it to validate or generate platform-specific configuration.

## Scope integration

Capabilities that create listeners, watchers, sessions, or other disposable resources must integrate with Vii scope ownership.

## Alternatives rejected

### Direct platform imports everywhere

Rejected because it reduces portability and makes testing and permission review harder.

### Universal fake capability parity

Rejected because platforms have real differences that should remain visible.

## Open questions

- final capability interface boundaries
- synchronous versus asynchronous capability lookup
- permission manifest format
- capability discovery and optionality
- diagnostics redaction rules
