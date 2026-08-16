# Angular consumer fixture

This fixture models an external Angular package consumer. The packed-artifact validation installs
`@vii-labs/angular` and `@vii-labs/core` from tarballs, typechecks the fixture, and verifies a server-safe signal
read without importing workspace source files.
