# Package Lifecycle

Every official Vii package must have a clear purpose, owner, maturity level, compatibility target, and exit strategy.

## Lifecycle states

### Proposed

The package exists only as an RFC or design proposal.

### Experimental

The package may be published for validation. Public APIs can change in minor releases and production use is not recommended without review.

### Preview

The package has real consumers and documented goals. Breaking changes are still possible but require migration notes.

### Stable

The package follows semantic versioning, compatibility policy, release gates, and deprecation rules.

### Maintenance

The package remains supported but receives only fixes, compatibility updates, and security work.

### Deprecated

A replacement or removal path is documented. New adoption is discouraged.

### Archived

The package is no longer actively maintained. Its repository history and final support status remain documented.

## Requirements for a new package

A proposal must define:

- user problem
- why the feature cannot live in an existing package
- package classification
- dependency direction
- public API surface
- owner
- test and compatibility plan
- bundle and type-check impact
- security considerations
- expected first consumer
- removal or merge strategy if the package fails validation

## Promotion criteria

Promotion depends on evidence, not time alone. Evidence may include:

- successful use in reference applications
- external consumer feedback
- stable compliance fixtures
- measured performance
- documented migration experience
- package ownership capacity

## Deprecation

Deprecation must include:

- reason
- replacement or alternative
- migration guide
- planned support window
- release notes
- diagnostic or type-level warnings where appropriate

Packages must not be abandoned silently.
