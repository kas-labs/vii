# Core Experimental Release Security Readiness

Status: release-preparation evidence only. It does not authorize versioning, tag creation, package
publication, or workflow execution.

## Purpose

This record defines the minimum supply-chain evidence and maintainer-controlled setup for the first
public `@vii-labs/core@0.1.0-experimental.2` candidate on npm's `next` tag. It is deliberately a runbook,
not a publishing workflow: a workflow capable of external publication must be reviewed in the
separately approved release change.

## Current repository evidence

| Control | Current evidence | Release-time requirement |
| --- | --- | --- |
| Source review | GitHub CodeQL scans JavaScript/TypeScript and Actions on pull requests and `main`. | Pass on the release commit. |
| Dependency review | GitHub Dependency Review fails pull requests for high-severity dependency changes. | Pass on the release pull request. |
| Repository policy | Governance validates branch names, Conventional Commit subjects, and forbidden attribution. | Pass on the release pull request. |
| Build and consumer proof | `pnpm validate` includes tests, builds, and packed clean consumers. | Re-run from the intended release commit. |
| Production dependency audit | `pnpm audit --prod --json` on 2026-08-16 reported 0 info, low, moderate, high, and critical findings across 44 production dependencies. | Re-run immediately before publication and retain the result with the release record. |
| Artifact boundary | Packed validation asserts allowed files and Core's exported manifest metadata. | Inspect the versioned candidate tarball before publication. |
| Registry preflight | The original `@vii` namespace is owned by an unrelated npm user; `@vii-labs` was created on 2026-08-16 and `npm org ls @vii-labs` confirms `vitalii.kas` as owner. `npm view @vii-labs/core` returns `E404` because it is not published. | Confirm the `@vii-labs` ownership result immediately before publication; an `E404` neither reserves a name nor proves authorization. |
| Publisher toolchain | Local preflight used Node.js 22.17.0 and npm 10.9.2. Node meets the trusted-publishing minimum; npm does not. | Provision npm 11.5.1+ on the protected release runner and record the exact versions. |

The audit is a point-in-time registry result, not a claim that future dependency resolution is safe.
It must never be fixed automatically as part of a release.

## Current external setup

On 2026-08-16, the repository gained a protected `npm-publish` GitHub Environment. It requires the
sole maintainer `vitala89` to approve and, by explicit maintainer decision, permits self-approval
because no independent reviewer is available. Custom deployment policy permits only the exact
`v0.1.0-experimental.1` tag. The `.0` bootstrap failed before publication because `@vii` is not
project-owned. The `.1` direct bootstrap for `@vii-labs` also failed before publication when npm required
interactive 2FA; its token remains only in the protected Environment. The Environment must be restricted
to the new `v0.1.0-experimental.2` tag only after the reviewed staged candidate is merged. No package
has been published and no npm Trusted Publisher exists.

## External maintainer setup

The following controls require npm and GitHub maintainer authority and cannot be proven from this
repository alone:

1. Confirm that the `@vii-labs` npm scope remains owned by the intended maintainers and that
   `@vii-labs/core` is available for this publication.
2. Create a protected GitHub Environment named `npm-publish` with required human reviewers and rules
   restricting it to the release tag or protected `main` as approved by maintainers.
3. After the first package exists and the reviewed future publish workflow is prepared, configure npm
   Trusted Publisher with GitHub owner
   `kas-labs`, repository `vii`, that exact workflow filename, the `npm-publish` environment, and the
   `npm stage publish` allowed action only. The workflow must not receive permission for direct
   publication; npm 2FA approval remains the separate human release gate.
4. Remove or restrict any automation npm write tokens. The release workflow must use OIDC and must not
   receive a long-lived `NODE_AUTH_TOKEN`.
5. Record the GitHub environment protection and npm Trusted Publisher configuration in the release PR
   without copying credentials, OIDC tokens, or sensitive account information into the repository.

npm Trusted Publishing uses short-lived OIDC identity rather than a long-lived npm token and generates
provenance automatically for public packages published from public repositories. It requires npm CLI
11.5.1+ and Node.js 22.14+; the release runner must meet those minimums even though ordinary repository
CI currently uses Node 22. See [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) and
[npm provenance](https://docs.npmjs.com/generating-provenance-statements/).

## First-publication bootstrap exception

npm requires a package to exist before a Trusted Publisher or staged publication can be configured. The
first Core candidate therefore requires one maintainer-run direct publication of the reviewed `.2`
artifact with npm's interactive 2FA. Run it locally as `vitalii.kas` from the exact release tag; do not
put an OTP in the repository, a GitHub secret, an issue, a pull request, or chat. The protected `.2`
workflow attempted staged publication and failed closed with npm E404 because the package did not yet
exist; it must not be retried for `.2`. After the manual bootstrap creates `@vii-labs/core`, prepare a
new reviewed candidate workflow using OIDC and `npm stage publish --provenance`, approve that staged
candidate with 2FA, and revoke the bootstrap token. This exception does not permit future token-based
publications.

The existing short-lived token remains confined to the protected `npm-publish` Environment until the
manual bootstrap is complete, then must be revoked. Do not place the token in a repository secret, local
file, issue, pull request, or chat.

## Future publish workflow contract

The separately reviewed workflow must be manual and protected, not triggered by ordinary pushes or
pull requests. It must:

- run only on a GitHub-hosted runner after the protected `npm-publish` environment approval;
- grant only `contents: read` and `id-token: write`; the latter can mint an OIDC token but does not by
  itself grant write access to a resource;
- check out the approved immutable release tag and verify it is the intended commit;
- use a clean install with the locked dependency graph, build, test, pack, inspect the Core tarball,
  and re-run the production dependency audit before `npm stage publish`;
- stage only `@vii-labs/core`, only with `--tag next`, and only after verifying the applied version is
  `0.1.0-experimental.2`; require a separate npm 2FA approval before it becomes public;
- fail closed if the package is still private, the version/tag differs, release evidence is missing,
  npm authentication falls back to a token, or any validation fails;
- write no secrets, package contents, diagnostics values, source uploads, telemetry, or arbitrary
  executable project configuration to external services.

GitHub documents that `id-token: write` only permits requesting the OIDC token; resource access is
still defined by the receiving service's trust policy. See [GitHub OIDC permissions](https://docs.github.com/en/actions/reference/security/oidc).

## Release approval order

1. Approve a dedicated release change containing the workflow, the prerelease changeset application,
   generated Core changelog, version update, and removal of `private`.
2. Configure the external GitHub Environment and npm Trusted Publisher against the reviewed workflow.
3. Re-run all release-time evidence at the immutable candidate commit and review the tarball.
4. Obtain explicit maintainer approval for the tag and the one-time publish run.
5. Verify the npm `next` artifact, version, provenance, and public package contents after publication;
   record the result and any incident/rollback action.

No step authorizes `latest`, adapters, CLI packages, telemetry, transport, or automatic future
publications. A failed or partial publication follows the corrective-release policy in
`RELEASE_POLICY.md`; published versions are never rewritten.
