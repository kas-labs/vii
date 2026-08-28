export type ExampleKind = "snippet" | "example" | "tutorial" | "reference-application";

export interface ExampleEntry {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly kind: ExampleKind;
  readonly capabilityId: string;
  readonly href: string;
  readonly sourceHref?: string;
  readonly framework: "Core" | "Vanilla" | "React" | "Angular" | "Vue";
}

export const examples: readonly ExampleEntry[] = [
  {
    id: "state-counter",
    title: "State counter",
    summary: "Create mutable reactive state and update it synchronously.",
    kind: "snippet",
    capabilityId: "core",
    href: "/docs/core/state/",
    framework: "Core",
  },
  {
    id: "computed-counter",
    title: "Computed value",
    summary: "Derive a cached value from reactive dependencies.",
    kind: "snippet",
    capabilityId: "core",
    href: "/docs/core/computed/",
    framework: "Core",
  },
  {
    id: "batched-updates",
    title: "Batched updates",
    summary: "Group synchronous writes behind one propagation boundary.",
    kind: "snippet",
    capabilityId: "core",
    href: "/docs/core/batch/",
    framework: "Core",
  },
  {
    id: "scope-lifecycle",
    title: "Scope lifecycle",
    summary: "Own subscriptions and disposable resources with deterministic cleanup.",
    kind: "example",
    capabilityId: "core",
    href: "/docs/lifecycle/",
    framework: "Core",
  },
  {
    id: "diagnostics-trace",
    title: "Diagnostics trace",
    summary: "Capture bounded runtime events and export a vii.trace snapshot.",
    kind: "example",
    capabilityId: "core",
    href: "/docs/diagnostics/traces/",
    framework: "Core",
  },
  {
    id: "vanilla-integration",
    title: "Vanilla integration",
    summary: "Use Vii Core directly without a framework adapter.",
    kind: "example",
    capabilityId: "vanilla",
    href: "/docs/integrations/vanilla/",
    framework: "Vanilla",
  },
  {
    id: "react-integration",
    title: "React integration",
    summary: "Bridge ReadableState into React through the private experimental adapter.",
    kind: "example",
    capabilityId: "react",
    href: "/docs/integrations/react/",
    sourceHref: "https://github.com/kas-labs/vii/tree/main/packages/react",
    framework: "React",
  },
  {
    id: "angular-integration",
    title: "Angular integration",
    summary: "Bridge ReadableState into Angular Signals with lifecycle ownership.",
    kind: "example",
    capabilityId: "angular",
    href: "/docs/integrations/angular/",
    sourceHref: "https://github.com/kas-labs/vii/tree/main/packages/angular",
    framework: "Angular",
  },
  {
    id: "vue-integration",
    title: "Vue integration",
    summary: "Expose Vii state as a readonly shallow ref with effect-scope cleanup.",
    kind: "example",
    capabilityId: "vue",
    href: "/docs/integrations/vue/",
    sourceHref: "https://github.com/kas-labs/vii/tree/main/packages/vue",
    framework: "Vue",
  },
];
