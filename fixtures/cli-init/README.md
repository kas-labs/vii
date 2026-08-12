# CLI init consumer fixture

This fixture is copied into a clean temporary consumer by package validation. It imports the packed
`@vii/cli-core` artifact, runs `initProject` in dry-run mode, and verifies that the exact planned file
list is returned without applying it.
