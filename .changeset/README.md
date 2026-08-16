# Changesets

Create a changeset for a user-visible package change with `pnpm changeset`. The first release
candidate is Core-only and experimental; do not include private adapters, CLI Core, fixtures, or
examples until a separate package-release decision accepts them.

`pnpm version:packages` changes versions and changelogs, so it requires the release approval
defined in `docs/governance/EXPERIMENTAL_CORE_RELEASE.md`. There is intentionally no publish script.
