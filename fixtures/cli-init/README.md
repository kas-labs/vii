# CLI core consumer fixture

This fixture is copied into a clean temporary consumer by package validation. It imports the packed
`@vii/cli-core` artifact, runs `initProject` and `addState` in dry-run mode, and runs the read-only
`doctorProject` analysis. It verifies that exact planned file lists are returned without applying
them and that the clean consumer has a healthy doctor report.
