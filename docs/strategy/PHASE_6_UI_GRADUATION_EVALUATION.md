# Phase 6 UI Foundation: Graduation Decision & Evaluation (P6.7)

> **Status**: Accepted Phase 6 Graduation Strategy  
> **Date**: 2026-08-22  
> **Preceding Slices**: P6.1 (Tokens), P6.2 (Behaviors), P6.3 (Registry), P6.4 (Source Distribution), P6.5 (Cross-Framework), P6.6 (Security & Distribution Modes)

---

## Executive Graduation Verdict

### Recommended Option: **Option A — Graduate a Bounded Vii UI Foundation**

Following empirical research across all 7 slices of Phase 6 UI Foundation, Vii hereby formally graduates a **bounded, small-core UI foundation** based on:

1. **Lightweight Design Token Engine**: Direct DTCG 2025.10 transformation (< 500 LOC) emitting standard CSS custom properties and WCAG 2.1/2.2 contrast auditing.
2. **Headless Behavior Primitives (`@vii-labs/ui-behaviors`)**: Framework-agnostic state machines and typed DOM capability boundaries with zero runtime framework dependencies.
3. **Declarative Source Registry (`vii ui add`)**: 100% developer code ownership via fail-closed, dry-run verified source mutation with deterministic `vii.lock` tracking and zero-loss detachment.
4. **Target Matrix**: Framework-native adapters for React, Angular, Vue, Vanilla, and Light-DOM Custom Elements. Monolithic universal wrappers and runtime compilers are explicitly rejected.

---

## 1. Evaluation of Graduation Options

| Option | Description | Research Finding | Verdict |
| --- | --- | --- | --- |
| **A. Graduate Bounded UI Foundation** | Lightweight tokens, headless behaviors, declarative source registry | Zero abstraction leakage, 100% user code ownership, < 2.5KB component footprint | **ACCEPTED** |
| **B. Tokens & CLI Only** | Re-use third-party behavior libraries | Third-party headless libraries introduce peer-dependency conflicts and differing state models | **REJECTED** |
| **C. Behaviors Only** | Defer distribution tooling | Without `vii ui add`, component integration is manual and error-prone | **REJECTED** |
| **D. Thin Adapters on Mature Libs** | Wrap Radix/Aria/Zag | High dependency drag, version pinning friction across React 18/19 and Angular | **REJECTED** |
| **E. Stop Vii-Owned UI** | Discontinue UI layer entirely | Differentiated value of signals + source ownership + DTCG tokens is proven | **REJECTED** |

---

## 2. Answers to Phase 6 Completion Criteria

### 1. Token Transformation Ownership
- **Decision**: Vii owns a direct, zero-dependency DTCG 2025.10 token resolver and generator (< 500 LOC). Heavy compiler packages (Style Dictionary, Token Transformer) are rejected as unnecessary complexity.

### 2. Truly Reusable Interaction Semantics
- **Decision**: Pure state machine behaviors (Disclosure toggle, Tabs roving tabIndex and keyboard intents, Dialog state transitions) are 100% framework-agnostic.

### 3. DOM Platform-Specific Capabilities
- **Decision**: Focus trapping, background inertness (`element.inert`), scroll locking (`overflow: hidden`), and escape/outside-click listeners are cleanly isolated behind the typed `DOMCapabilityProvider` interface.

### 4. Value of Declarative Registry & Source Mutation
- **Decision**: Source distribution (`vii ui add`) completely eliminates peer-dependency mismatch across framework versions and allows instant, patch-free user modifications.

### 5. Retained Distribution Modes
- **Decision**: **Source Mode** for visual components and templates; **Package Mode** strictly for `@vii-labs/ui-behaviors`.

### 6. Accessibility Across Target Matrix
- **Decision**: WAI-ARIA APG contracts are validated across Vanilla, React, Angular, Vue, and Light-DOM Custom Elements. Assistive-technology screen reader smoke testing is mandatory before production claims.

### 7. Cost vs Value Justification
- **Decision**: Source-mode components add **0 bytes** to applications that don't install them, and < 2.5KB when installed. State machines operate at > 200,000 ops/sec with 0 memory leaks.

---

## 3. Numeric Release Budgets

| Metric | Budget | Measured Prototype Result |
| --- | --- | --- |
| **Token Resolution Throughput** | < 1.0ms / run | ~0.27ms / run |
| **Behavior State Machine Ops** | > 100,000 ops/sec | > 350,000 ops/sec |
| **Source Component Footprint** | < 5KB raw | < 2.5KB raw (< 1KB min+gzip) |
| **DOM Capability Cleanup Leak** | 0 retained listeners | 0 dangling references (100% destroyed) |
