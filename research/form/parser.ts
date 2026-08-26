import type { FieldPathSegment } from "./form-core.js";

// ---------------------------------------------------------------------------
// Parse Issue & Types
// ---------------------------------------------------------------------------

export type IssueSource = "validation" | "parse";

export interface FormIssueBase {
  readonly code: string;
  readonly message?: string | undefined;
  readonly path?: readonly FieldPathSegment[] | undefined;
  readonly source: IssueSource;
}

export interface ValidationIssue extends FormIssueBase {
  readonly source: "validation";
  readonly ruleId?: string | undefined;
}

export interface ParseIssue extends FormIssueBase {
  readonly source: "parse";
}

export type ParseStatus = "unparsed" | "parsed" | "invalid";

export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issue?: string | Partial<ParseIssue> | undefined };

export type FieldParser<Raw, Value> = (raw: Raw) => ParseResult<Value>;

export type OutputTransform<Value, Output> = (value: Value) => Output;

// ---------------------------------------------------------------------------
// Parse Issue Sanitization & Prototype Defense
// ---------------------------------------------------------------------------

export function sanitizeParseIssue(
  raw: unknown,
  defaultPath?: readonly FieldPathSegment[],
): ParseIssue {
  let code = "parse.invalid";
  let message: string | undefined = undefined;
  let path: readonly FieldPathSegment[] | undefined = defaultPath;

  if (typeof raw === "string" && raw.trim() !== "") {
    message = raw;
  } else if (raw !== null && typeof raw === "object") {
    const rawObj = raw as any;
    if (typeof rawObj.code === "string" && rawObj.code.trim() !== "") {
      if (
        rawObj.code === "__proto__" ||
        rawObj.code === "constructor" ||
        rawObj.code === "prototype"
      ) {
        throw new Error(
          `Security error: Prototype pollution attempt blocked on parse issue code "${rawObj.code}"`,
        );
      }
      code = rawObj.code;
    }
    if (typeof rawObj.message === "string") {
      message = rawObj.message;
    }
    if (rawObj.path !== undefined && rawObj.path !== null) {
      if (!Array.isArray(rawObj.path)) {
        throw new TypeError(`Parse issue "path" must be an array`);
      }
      const segments: FieldPathSegment[] = [];
      for (const seg of rawObj.path) {
        if (typeof seg === "string" || typeof seg === "number") {
          segments.push(seg);
        } else {
          throw new TypeError(
            `Parse issue path segment must be string or number, received ${typeof seg}`,
          );
        }
      }
      path = Object.freeze(segments);
    }
  }

  return Object.freeze({
    code,
    message,
    path,
    source: "parse",
  });
}

// ---------------------------------------------------------------------------
// Standard Built-in Research Parsers
// ---------------------------------------------------------------------------

const DECIMAL_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

export interface NumberParserOptions {
  readonly allowEmpty?: boolean | undefined;
  readonly emptyValue?: number | undefined;
  readonly trim?: boolean | undefined;
}

export function createNumberParser(options?: {
  readonly allowEmpty?: false | undefined;
  readonly emptyValue?: undefined;
  readonly trim?: boolean | undefined;
}): FieldParser<string, number>;
export function createNumberParser(options: {
  readonly allowEmpty: true;
  readonly emptyValue?: number | undefined;
  readonly trim?: boolean | undefined;
}): FieldParser<string, number | undefined>;
export function createNumberParser(options: NumberParserOptions = {}): FieldParser<string, any> {
  const { allowEmpty = false, emptyValue = undefined, trim = true } = options;

  return (raw: string): ParseResult<any> => {
    if (typeof raw !== "string") {
      return { ok: false, issue: { code: "parse.type_error", message: "Expected string input" } };
    }
    const str = trim ? raw.trim() : raw;
    if (str === "") {
      if (allowEmpty) {
        return { ok: true, value: emptyValue };
      }
      return { ok: false, issue: { code: "parse.empty", message: "Number is required" } };
    }
    // Disallow trailing decimals or partial negative signs
    if (str === "-" || str.endsWith(".")) {
      return { ok: false, issue: { code: "parse.invalid_number", message: "Incomplete number" } };
    }
    // Number() also accepts the hex, binary and octal literal grammars, so "0x10"
    // silently parsed to 16 for text a user typed into a decimal input. Restrict
    // the accepted grammar to decimal, with an optional sign and exponent.
    if (!DECIMAL_NUMBER.test(str)) {
      return { ok: false, issue: { code: "parse.invalid_number", message: "Invalid number" } };
    }
    const num = Number(str);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      return { ok: false, issue: { code: "parse.invalid_number", message: "Invalid number" } };
    }
    return { ok: true, value: num };
  };
}

export function createBooleanParser(): FieldParser<boolean | string, boolean> {
  return (raw: boolean | string): ParseResult<boolean> => {
    if (typeof raw === "boolean") {
      return { ok: true, value: raw };
    }
    if (typeof raw === "string") {
      if (raw === "true" || raw === "on" || raw === "1") {
        return { ok: true, value: true };
      }
      if (raw === "false" || raw === "off" || raw === "0" || raw === "") {
        return { ok: true, value: false };
      }
      return {
        ok: false,
        issue: { code: "parse.invalid_boolean", message: "Invalid boolean string" },
      };
    }
    return {
      ok: false,
      issue: { code: "parse.type_error", message: "Expected boolean or string" },
    };
  };
}

export function createOptionalStringParser(): FieldParser<string, string | undefined> {
  return (raw: string): ParseResult<string | undefined> => {
    if (typeof raw !== "string") {
      return { ok: false, issue: { code: "parse.type_error", message: "Expected string input" } };
    }
    const trimmed = raw.trim();
    if (trimmed === "") {
      return { ok: true, value: undefined };
    }
    return { ok: true, value: raw };
  };
}
