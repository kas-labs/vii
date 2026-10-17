# Project Horizon: Application Framework Architecture Review

Status: Research only
Scope: Vii Application Framework, Router, Server Foundation, Query, Rendering and Build System

## Purpose
Evaluate contemporary full-stack application architecture patterns against Vii's canonical contracts. Horizon is an internal research codename, not a new product, package, public API or implementation commitment.

## Architecture preflight
- Ownership: Application Framework coordinates Router, Server, Query and Build; each capability retains its own invariants.
- Canonical authority: ROADMAP.md, docs/architecture/{APPLICATION_FRAMEWORK,ROUTER_ARCHITECTURE,RENDERING_STRATEGY,SERVER_FOUNDATION,QUERY_ARCHITECTURE,BUILD_SYSTEM,DOMAIN_DRIVEN_ARCHITECTURE}.md, accepted RFCs/ADRs, and docs/governance/ARCHITECTURE_PREFLIGHT.md.
- Ubiquitous language: Route, Navigation, Loader, Request Scope, Server Function, Rendering Mode, Hydration, Query Client, Build Adapter.
- Dependencies: Core must never depend on application, framework, transport, platform or build layers.
- Stability: no public API or release promises are made here.
- Security: external URL/input is untrusted; request isolation, validation, authorization, CSRF/SSRF controls, secret-safe serialization and cancellation are mandatory.

## Candidate evaluation matrix

| Capability | Vii owner | Evaluation question | Evidence gate |
| --- | --- | --- | --- |
| Typed route tree and search params | Router | Can type inference remain fast for large route trees while runtime validation remains explicit? | Type tests, compiler benchmarks, malformed URL fixtures |
| Route-local loading and prefetch | Router | Can loader dependency identity be deterministic without duplicating Query cache? | Reload/invalidation and cancellation tests |
| CSR / SSG / SSR / data-only server loading | Application Framework | Can each rendering mode be opted into per route without hidden server requirements? | Two reference apps, browser/SSR tests |
| Streaming and hydration | Rendering + Server | Is streamed output safe, deterministic and measurably useful? | Request isolation, serialization, hydration and performance tests |
| Typed server functions | Server Foundation | Can calls be explicitly authorized, validated and separated from client bundles? | Client bundle inspection, auth and malicious-input tests |
| Composable middleware | Server Foundation | Can context and error semantics be typed with explicit order and ownership? | Middleware order, failure and disposal fixtures |
| Portable build outputs | Build System | Can a standard build engine remain replaceable and runtime targets explicit? | Node plus one additional deployment target |
| Diagnostics | Diagnostics | Can navigation/request causes be explained without sensitive URL or payload capture? | Redaction and lifecycle tests |

## Decisions proposed for investigation
1. Preserve CSR as the simple baseline; SSR and streaming remain opt-in.
2. Separate route-local loader results from retained shared Query state.
3. Require request-scoped ownership and disposal for server rendering and server functions.
4. Prefer standard Request, Response, URL, AbortSignal and ReadableStream boundaries.
5. Keep framework adapters, compiler engines and hosting adapters replaceable.
6. Avoid mandatory React-specific server protocols or implicit application backend ownership.
7. Benchmark both runtime and TypeScript compiler cost before selecting a router API.
8. Do not introduce a package until a consumer fixture demonstrates a clear benefit.

## Research deliverables
- Gap inventory against existing canonical architecture documents.
- Candidate alternatives and explicit accept/defer/reject decision matrix.
- Two disposable consumer fixtures proposed on paper: authenticated CSR dashboard and SEO-oriented hybrid content application.
- Threat-model checklist for URL parsing, auth, server boundaries, hydration and streaming.
- Measurable graduation criteria and a proposed ADR only if a real decision changes.

## Constraints
No copied third-party source, branding or public API. Preserve attribution and license obligations for any material reused later. Internal codename must not be used to conceal provenance of third-party code or to bypass license requirements.

No implementation, dependency upgrades, publication, release, or roadmap status changes in this review.
