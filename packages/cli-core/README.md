# @vii/cli-core

Experimental read-only project detection engine for the Vii CLI foundation.

`detectProject(root)` inspects package manifests, lockfiles, workspace markers, framework
dependencies/configuration names, TypeScript configuration, source file extensions, and runtime
markers. It returns evidence and conflicts alongside each conclusion so callers can require an
explicit project or package-manager choice when detection is ambiguous.

Detection does not install dependencies, execute project configuration, read secret values, mutate
files, invoke shell commands, or access the network. The package is private and experimental while
RFC 0006 and RFC 0007 remain Draft; its result shape may change before a terminal CLI or machine
readable protocol is stabilized.
