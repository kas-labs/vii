# Vii UI Benchmarks & Graduation Gate Research (P6.7)

> **Throwaway research only.** This directory is not a package, public API, support fixture, or production implementation.

This directory contains research prototypes evaluating performance benchmarks, accessibility matrix conformance, and graduation criteria for Phase 6 UI Foundation (P6.7):

- **Performance Benchmarks (`ui-benchmarks.test.ts`)**:
  - DTCG token compilation throughput (~0.27ms per 100+ tokens).
  - Behavior state machine transition throughput (> 350,000 ops/sec).
  - DOM capability attachment and deterministic disposal lifecycle.
- **Accessibility Matrix (`a11y-matrix.test.ts`)**:
  - WAI-ARIA APG keyboard navigation contracts (Enter, Space, Tab, Home, End, Escape).
  - WCAG 2.1/2.2 contrast validation (4.5:1 text, 3.0:1 non-text).
  - Assistive Technology smoke-testing gating policy.
- **Graduation Decision**:
  - Formally accepts **Option A (Graduate a Bounded Vii UI Foundation)**.
  - See full evaluation in [`docs/strategy/PHASE_6_UI_GRADUATION_EVALUATION.md`](../../docs/strategy/PHASE_6_UI_GRADUATION_EVALUATION.md).

---

## Verification Commands

Run the focused test suite and type check:

```bash
pnpm exec vitest run research/benchmarks-graduation/*.test.ts
pnpm exec tsc --noEmit -p research/benchmarks-graduation/tsconfig.json
```
