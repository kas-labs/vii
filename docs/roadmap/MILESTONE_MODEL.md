# Milestone Model

## Purpose

Milestones group work by verifiable outcomes rather than arbitrary dates.

## Initial milestones

### M0: Documentation foundation

Outcome:

- product, architecture, quality, governance, and roadmap documentation accepted.

### M1: Repository bootstrap

Outcome:

- pnpm and Nx workspace operational;
- validation commands and CI baseline available;
- package artifact validated through a clean Vanilla consumer.

### M2: State prototype

Outcome:

- stores, subscriptions, and derived values implemented behind Experimental APIs;
- behavior tests define notification semantics.

### M3: Scope and diagnostics prototype

Outcome:

- resource ownership and disposal implemented;
- diagnostics events available in development mode;
- memory behavior measured.

### M4: State Alpha

Outcome:

- first installable alpha package;
- API documentation and examples;
- package validation and migration notes;
- real consumer feedback begins.

### M5: Framework adapters and CLI Alpha

Outcome:

- React, Angular, Vue, and Vanilla fixtures;
- adapter compliance suite;
- initial deterministic CLI workflow.

## Milestone rules

A milestone must contain:

- a user or contributor outcome;
- explicit scope;
- exit criteria;
- dependencies;
- named owner;
- unresolved risks;
- documentation requirement.

A milestone must not be closed solely because code was merged. Validation, documentation, and clean-consumer evidence are part of completion.

## Date policy

Dates may be added for coordination, but scope is not silently reduced to meet a date. Any scope change must be visible in the milestone description and roadmap.
