# Feature Acceptance Gate Summary

The canonical policy is `docs/governance/FEATURE_ACCEPTANCE_GATE.md`.

For every behavior-changing implementation, completion requires proportionate evidence for correctness, regression safety, integration behavior, relevant lifecycle/failure paths, changed security/privacy attack surfaces, compatibility claims, and any affected accessibility/performance/bundle/memory characteristics.

Coding agents must identify the required evidence during preflight, add or update tests together with behavior, run focused checks while iterating, run repository validation before publication, inspect the complete diff, and report unresolved verification gaps truthfully.

Passing automated tests does not prove the absence of vulnerabilities. Security completion means applicable adversarial tests pass, the changed threat surface is reviewed, known exploitable findings are resolved or explicitly accepted under governance, and unsupported security claims are avoided.
