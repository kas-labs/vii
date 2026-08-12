# @vii/cli-core

Experimental read-only project detection engine for the Vii CLI foundation.

`detectProject(root)` inspects package manifests, lockfiles, workspace markers, framework
dependencies/configuration names, TypeScript configuration, source file extensions, and runtime
markers. It returns evidence and conflicts alongside each conclusion so callers can require an
explicit project or package-manager choice when detection is ambiguous.

`initProject(root, { dryRun: true })` uses that detection result and returns the deterministic
Analyze → Plan → Preview → Apply → Validate → Report lifecycle. The minimal init plan creates only
`vii.config.ts` with the detected framework marker. Dry-runs never write files; an existing changed
config, an escaping symlink, or ambiguous detection blocks Apply and reports the conflict.

Detection does not install dependencies, execute project configuration, read secret values, mutate
files, invoke shell commands, or access the network. The package is private and experimental while
RFC 0006 and RFC 0007 remain Draft; its result shape may change before a terminal CLI or machine
