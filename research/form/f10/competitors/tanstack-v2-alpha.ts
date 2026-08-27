/**
 * Form Research F10 — TanStack Form v2 Alpha Forward-Looking Assessment
 *
 * Evaluates the architectural horizon of TanStack Form v2 (v2.0.0-alpha.x)
 * against Vii Form research contracts.
 *
 * Status: PREVIEW / ALPHA (Not a primary production benchmark target).
 */

export interface TanStackV2HorizonReport {
  status: "PREVIEW_ALPHA";
  evaluatedRelease: string;
  announcementDate: string;
  architecturalChanges: {
    standardSchemaSupport: string;
    errorModel: string;
    arrayIdentity: string;
    serverValidation: string;
    signalStoreIntegration: string;
    bundleFootprintEstimate: string;
    frameworkParity: string;
  };
  impactOnViiFormJustification: string;
}

export const TANSTACK_V2_HORIZON_REPORT: TanStackV2HorizonReport = {
  status: "PREVIEW_ALPHA",
  evaluatedRelease: "2.0.0-alpha.2",
  announcementDate: "2026-08-06",
  architecturalChanges: {
    standardSchemaSupport:
      "TanStack Form v2 introduces native Standard Schema v1 (~standard) spec adapter support directly in core validators, reducing custom adapter boilerplate.",
    errorModel:
      "Transitioning from flat string errors to structured error objects with map-based field routing, though error codes and severity levels remain user-defined rather than standardized.",
    arrayIdentity:
      "Field array management continues to rely on React keys and index mapping. Does not introduce internal immutable item identity tokens for server error re-routing during in-flight reorders.",
    serverValidation:
      "Server errors can be set via form.setFieldMeta or form.setErrorMap, but positional server issue snapshots across in-flight reordering still require consumer-owned glue.",
    signalStoreIntegration:
      "Continues using @tanstack/store (custom event-emitter store) rather than framework-native signals (Angular Signals, Preact signals, Vue shallowRef, or Vii State). Requires framework-specific adapter bindings for reactivity.",
    bundleFootprintEstimate:
      "Core + store estimated at ~11-15 kB minified (similar to v1). Does not provide zero-dependency tree-shaking with external signal systems.",
    frameworkParity: "Maintains multi-framework strategy (React, Vue, Solid, Svelte, Angular).",
  },
  impactOnViiFormJustification:
    "TanStack Form v2 alpha narrows the DX gap in Standard Schema validation and structured error maps, but maintains an external store model disconnected from Vii Core's push-pull lazy computed reactivity and Scope lifecycle. A future stable v2 improves standard ecosystem compatibility, but does not provide zero-glue Vii State/Scope integration, automatic array identity snapshotting, or sub-4 kB standalone tree-shaking.",
};
