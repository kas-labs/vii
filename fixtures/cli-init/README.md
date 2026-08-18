# CLI core consumer fixture

This fixture is copied into a clean temporary consumer by package validation. It imports the packed
`@vii-labs/cli-core` artifact, runs `initProject` and `addState` in dry-run mode, and runs the read-only
`doctorProject` analysis. It verifies exact planned file lists without applying them, applied and
idempotent mutation results, blocked local-change reporting, a healthy doctor report, and JSON
round-trips through the versioned machine-output envelope.
