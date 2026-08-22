/**
 * Content Security Policy & Safe DOM Manipulation Evaluator (P6.6)
 */

export interface CSPComplianceReport {
  isSafe: boolean;
  violations: readonly string[];
}

export function evaluateCspSafety(codePayload: string): CSPComplianceReport {
  const violations: string[] = [];

  if (/\beval\s*\(/.test(codePayload)) {
    violations.push("Direct eval() execution detected");
  }

  if (/\bnew\s+Function\s*\(/.test(codePayload)) {
    violations.push("Dynamic Function constructor detected");
  }

  if (/\.innerHTML\s*=/.test(codePayload)) {
    violations.push("Unsafe innerHTML assignment detected");
  }

  if (/\.outerHTML\s*=/.test(codePayload)) {
    violations.push("Unsafe outerHTML assignment detected");
  }

  if (/javascript:/i.test(codePayload)) {
    violations.push("Inline javascript: URI detected");
  }

  return {
    isSafe: violations.length === 0,
    violations,
  };
}

export function createSafeStylesheet(cssContent: string): { type: "stylesheet"; css: string } {
  const check = evaluateCspSafety(cssContent);
  if (!check.isSafe) {
    throw new Error(`Unsafe CSS payload rejected: ${check.violations.join(", ")}`);
  }
  return { type: "stylesheet", css: cssContent };
}
