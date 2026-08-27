/**
 * Form Research F10 — Competitor Version Evidence & Landscape Metadata
 *
 * Records official packages, exact tested versions, release stability,
 * official documentation sources, runtime requirements, and evaluation roles.
 */

export interface CompetitorMetadata {
  readonly package: string;
  readonly testedVersion: string;
  readonly status: "stable" | "alpha" | "beta" | "research-prototype";
  readonly retrievalDate: string;
  readonly officialDocsUrl: string;
  readonly selectionRationale: string;
  readonly runtimePrerequisites: readonly string[];
  readonly packageDependencies: readonly string[];
  readonly license: string;
  readonly isPrimaryComparison: boolean;
  readonly evaluationRole: string;
}

export const COMPETITOR_VERSIONS: Record<string, CompetitorMetadata> = {
  viiForm: {
    package: "@vii-labs/form (research prototype)",
    testedVersion: "0.0.0-f10-research",
    status: "research-prototype",
    retrievalDate: "2026-08-27",
    officialDocsUrl: "https://github.com/kas-labs/vii/blob/main/docs/roadmap/FORM_RESEARCH.md",
    selectionRationale:
      "Vii Form research track candidate undergoing graduation evaluation at F10.",
    runtimePrerequisites: ["@vii-labs/core >=0.1.0-experimental.2", "Node.js >=22.0.0"],
    packageDependencies: ["@vii-labs/core"],
    license: "Apache-2.0",
    isPrimaryComparison: true,
    evaluationRole: "Candidate framework-neutral headless form engine for Vii ecosystem.",
  },
  tanStackFormStable: {
    package: "@tanstack/react-form",
    testedVersion: "1.33.5",
    status: "stable",
    retrievalDate: "2026-08-27",
    officialDocsUrl: "https://tanstack.com/form/v1",
    selectionRationale:
      "Primary production baseline. Latest stable 1.33.x release on npm as of 2026-08-27.",
    runtimePrerequisites: ["React >=18.0.0 || >=19.0.0", "@tanstack/form-core >=1.33.5"],
    packageDependencies: ["@tanstack/form-core", "@tanstack/store"],
    license: "MIT",
    isPrimaryComparison: true,
    evaluationRole: "Primary headless multi-framework comparator in production React applications.",
  },
  tanStackFormV2Alpha: {
    package: "@tanstack/react-form",
    testedVersion: "2.0.0-alpha.2",
    status: "alpha",
    retrievalDate: "2026-08-27",
    officialDocsUrl: "https://tanstack.com/form/latest",
    selectionRationale:
      "Forward-looking horizon check. Announced alpha on 2026-08-06; evaluated strictly as preview software.",
    runtimePrerequisites: ["React >=18.0.0 || >=19.0.0", "@tanstack/form-core >=2.0.0-alpha.2"],
    packageDependencies: ["@tanstack/form-core", "@tanstack/store"],
    license: "MIT",
    isPrimaryComparison: false,
    evaluationRole: "Secondary forward-looking architecture horizon check.",
  },
  reactHookForm: {
    package: "react-hook-form",
    testedVersion: "7.86.0",
    status: "stable",
    retrievalDate: "2026-08-27",
    officialDocsUrl: "https://react-hook-form.com",
    selectionRationale:
      "Primary production baseline. Most widely adopted React form library, latest stable 7.x line.",
    runtimePrerequisites: ["React >=16.8.0 || >=18.0.0 || >=19.0.0"],
    packageDependencies: [],
    license: "MIT",
    isPrimaryComparison: true,
    evaluationRole: "Dominant React-specific uncontrolled ref-first form library comparator.",
  },
  angularSignalForms: {
    package: "@angular/forms",
    testedVersion: "22.1.4",
    status: "stable",
    retrievalDate: "2026-08-27",
    officialDocsUrl: "https://angular.dev/guide/forms/signals",
    selectionRationale:
      "Primary Angular baseline. Angular Signal Forms is stable and production-ready in Angular 22.",
    runtimePrerequisites: ["@angular/core 22.1.4", "rxjs 7.8.2"],
    packageDependencies: ["@angular/core", "@angular/common", "rxjs"],
    license: "MIT",
    isPrimaryComparison: true,
    evaluationRole: "Framework-native signal-first form model comparator for Angular applications.",
  },
};
