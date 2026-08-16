# Experimental Core Release Decision

Status: accepted for release preparation; publication requires a separate explicit approval.

## Decision

Vii is licensed under Apache-2.0. The first public package candidate is `@vii/core` only, at
`0.1.0-experimental.0`, published to npm's `next` channel. It is experimental and is not a
production-support promise or a `latest` release.

React, Angular, Vue, and CLI Core remain private workspace packages for this release candidate.
They need their own consumer, compatibility, and release decisions.

## Preconditions

- keep `@vii/core` runtime-neutral, value-free in diagnostics, and free of hidden network or
  telemetry behavior;
- maintain the Core reference consumer that installs the packed Core artifact rather than a
  workspace alias;
- maintain the adopted changeset workflow and prepare the Core release changeset, changelog entry,
  package metadata, known limitations, and support statement;
- validate the candidate package contents, public exports, Node compatibility, performance baseline,
  security scan, and clean-consumer installation;
- configure protected npm trusted publishing and provenance; do not store long-lived registry
  credentials in the repository;
- obtain explicit approval for the release commit, tag, and npm publication.

## Non-goals

- publishing any package now;
- removing `private` from a package now;
- making APIs, diagnostics protocols, or adapters Stable;
- adding terminal CLI, telemetry, transport, or new security diagnostics producers.
