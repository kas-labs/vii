export const DEFAULT_MAX_DEPTH = 32;
export const DEFAULT_MAX_PROPERTIES = 1000;
export const DEFAULT_MAX_ITEMS = 10000;
export const MAX_REGEX_INPUT_LENGTH = 1000;

export interface ValidationContext {
  readonly depth: number;
  readonly maxDepth: number;
  readonly seenObjects: WeakSet<object>;
}

export function createValidationContext(maxDepth: number = DEFAULT_MAX_DEPTH): ValidationContext {
  return {
    depth: 0,
    maxDepth,
    seenObjects: new WeakSet<object>(),
  };
}

export function enterChildContext(context: ValidationContext): ValidationContext {
  return {
    depth: context.depth + 1,
    maxDepth: context.maxDepth,
    seenObjects: context.seenObjects,
  };
}

export function isObjectCycleDetected(obj: object, context: ValidationContext): boolean {
  if (context.seenObjects?.has(obj)) {
    return true;
  }
  context.seenObjects?.add(obj);
  return false;
}

// Marks `obj` as no longer on the current validation path. Must be called once
// validation of `obj`'s subtree finishes, or sibling branches that legitimately
// share a reference (a DAG, not a cycle) will be falsely flagged.
export function releaseObjectPath(obj: object, context: ValidationContext): void {
  context.seenObjects?.delete(obj);
}

export function isDepthExceeded(context: ValidationContext): boolean {
  return context.depth > context.maxDepth;
}

export function checkStructureSecurity(
  input: object,
  path: readonly (string | number)[],
  ctx: ValidationContext,
  kind: "object" | "array",
): { readonly ok: false; readonly issues: readonly any[] } | null {
  if (isDepthExceeded(ctx)) {
    return {
      ok: false,
      issues: [
        {
          code: "max_depth_exceeded",
          expected: `nesting depth <= ${ctx.maxDepth}`,
          path,
        },
      ],
    };
  }
  if (isObjectCycleDetected(input, ctx)) {
    return {
      ok: false,
      issues: [
        {
          code: "cyclic_reference",
          expected: `acyclic ${kind} structure`,
          path,
        },
      ],
    };
  }
  return null;
}

export function safeRegexTest(pattern: RegExp, input: string): boolean {
  // Pre-check maximum input length to prevent catastrophic ReDoS backtracking
  if (input.length > MAX_REGEX_INPUT_LENGTH) {
    return false;
  }
  return pattern.test(input);
}

export function auditCSPCompliance(sourceCode: string): {
  readonly compliant: boolean;
  readonly violations: readonly string[];
} {
  const violations: string[] = [];
  const evalPattern = new RegExp("\\b" + "eval" + "\\s*\\(");
  const newFuncPattern = new RegExp("\\bnew\\s+" + "Function" + "\\s*\\(");
  const setTimePattern = new RegExp("\\bset" + "Timeout\\s*\\(\\s*[\"']");
  const setIntervalPattern = new RegExp("\\bset" + "Interval\\s*\\(\\s*[\"']");

  if (evalPattern.test(sourceCode)) {
    violations.push("Contains direct dynamic evaluation call");
  }
  if (newFuncPattern.test(sourceCode)) {
    violations.push("Contains dynamic Function constructor");
  }
  if (setTimePattern.test(sourceCode)) {
    violations.push("Contains string setTimeout evaluation");
  }
  if (setIntervalPattern.test(sourceCode)) {
    violations.push("Contains string setInterval evaluation");
  }
  return {
    compliant: violations.length === 0,
    violations,
  };
}
