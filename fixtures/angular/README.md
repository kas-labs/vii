# Angular consumer fixture

This fixture models an external Angular package consumer. The packed-artifact validation installs
`@vii/angular` and `@vii/core` from tarballs, typechecks the fixture, and verifies a server-safe signal
read without importing workspace source files.
