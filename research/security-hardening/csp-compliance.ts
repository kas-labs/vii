/**
 * Content Security Policy & Safe DOM Manipulation Evaluator (P6.6)
 */

export interface CSPComplianceReport {
  isSafe: boolean;
  violations: readonly string[];
}

/**
 * Decodes CSS escape sequences so the pattern checks below see the payload the
 * way a CSS parser would: "java\73cript:" and "java\\script:" both reconstruct
 * "javascript:". Hex escapes (1-6 digits plus one optional trailing whitespace)
 * are decoded first, then single-character literal escapes are unwrapped.
 */
function decodeCssEscapes(payload: string): string {
  return payload
    .replace(/\\([0-9a-fA-F]{1,6})[\t\n\f\r ]?/g, (_, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      if (codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
        return "�";
      }
      return String.fromCodePoint(codePoint);
    })
    .replace(/\\([\s\S])/g, "$1");
}

export function evaluateCspSafety(codePayload: string): CSPComplianceReport {
  const violations: string[] = [];
  // Evaluate the decoded form so escape sequences cannot smuggle a pattern
  // past the checks; an escape-free payload is unchanged by decoding.
  codePayload = decodeCssEscapes(codePayload);
  // URL parsers additionally strip tabs and newlines inside URLs, so a scheme
  // check must see the collapsed form ("java\tscript:" is "javascript:").
  const collapsedPayload = codePayload.replace(/[\t\n\r]/g, "");

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

  if (/javascript:|vbscript:/i.test(collapsedPayload)) {
    violations.push("Inline javascript: URI detected");
  }

  return {
    isSafe: violations.length === 0,
    violations,
  };
}

export function createSafeStylesheet(cssContent: string): { type: "stylesheet"; css: string } {
  const check = evaluateCspSafety(cssContent);
  const violations = [...check.violations];

  // Stylesheet-specific vectors: @import pulls arbitrary external CSS, and
  // legacy expression() executes script. Checked on the decoded form so CSS
  // escapes cannot hide them.
  const decoded = decodeCssEscapes(cssContent);
  if (/@import\b/i.test(decoded)) {
    violations.push("External @import in stylesheet detected");
  }
  if (/\bexpression\s*\(/i.test(decoded)) {
    violations.push("CSS expression() detected");
  }

  if (violations.length > 0) {
    throw new Error(`Unsafe CSS payload rejected: ${violations.join(", ")}`);
  }
  return { type: "stylesheet", css: cssContent };
}
