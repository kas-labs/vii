/**
 * Custom Elements DOM Boundary Decision Evaluator (P6.6)
 */

export type DomBoundaryDecision = "light-dom" | "shadow-dom";

export interface DomBoundaryEvaluation {
  boundary: DomBoundaryDecision;
  reasons: readonly string[];
}

export function evaluateDomBoundary(
  capabilities: readonly string[],
  formAssociated = false,
): DomBoundaryEvaluation {
  const reasons: string[] = [];

  if (formAssociated) {
    reasons.push(
      "Form-associated elements participate directly in native form submission via Light DOM",
    );
  }

  const crossRootAria = capabilities.some((cap) =>
    ["aria-controls", "aria-labelledby", "aria-describedby", "focus-trap", "dialog-modal"].includes(
      cap,
    ),
  );

  if (crossRootAria) {
    reasons.push(
      "Cross-element ARIA attributes (aria-controls, aria-labelledby, modal dialogs) fail across Shadow Root boundaries in browser accessibility trees",
    );
  }

  if (reasons.length > 0) {
    return {
      boundary: "light-dom",
      reasons,
    };
  }

  return {
    boundary: "shadow-dom",
    reasons: [
      "Self-contained visual component with no external ARIA references or form associations",
    ],
  };
}
