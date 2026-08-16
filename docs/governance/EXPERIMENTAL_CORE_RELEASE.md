# Experimental Core Release Decision

Status: accepted for release preparation; publication requires a separate explicit approval.

## Decision

Vii is licensed under Apache-2.0. The first public package candidate is `@vii-labs/core` only, at
`0.1.0-experimental.1`, published to npm's `next` channel. It replaces the unpublishable
`@vii/core` candidate after confirming that `@vii` is not project-owned. It is experimental and is not a
production-support promise or a `latest` release.

React, Angular, Vue, and CLI Core remain private workspace packages for this release candidate.
They need their own consumer, compatibility, and release decisions.

## Preconditions

- keep `@vii-labs/core` runtime-neutral, value-free in diagnostics, and free of hidden network or
  telemetry behavior;
- maintain the Core reference consumer that installs the packed Core artifact rather than a
  workspace alias;
- maintain the adopted changeset workflow and completed public Core package metadata; prepare the
  Core release changeset, changelog entry, known limitations, and support statement;
- validate the candidate package contents, public exports, Node compatibility, performance baseline,
  security scan, and clean-consumer installation;
- configure protected npm trusted publishing and provenance; do not store long-lived registry
  credentials in the repository; follow `CORE_EXPERIMENTAL_RELEASE_SECURITY.md` for evidence and
  external maintainer setup;
- obtain explicit approval for the release commit, tag, and npm publication.

## Release preparation record

The Core changeset records a `minor` base release. The namespace correction uses the next experimental
candidate, `0.1.0-experimental.1`; it must not be applied as a
stable `0.1.0` release. npm distribution remains the separately configured `next` tag. Changeset
application, generated changelog changes, removal of `private`, tag creation, and publication remain
protected release actions.

The first candidate uses the one-time bootstrap exception in
`CORE_EXPERIMENTAL_RELEASE_SECURITY.md` because npm requires an existing package before it accepts a
Trusted Publisher configuration. That exception is limited to the protected manual candidate workflow
and must be replaced with OIDC Trusted Publishing immediately after the first publication.

## Non-goals

- publishing any package now;
- removing `private` from a package now;
- making APIs, diagnostics protocols, or adapters Stable;
- adding terminal CLI, telemetry, transport, or new security diagnostics producers.
