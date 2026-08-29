import type {
  FieldParser,
  NumberParserOptions,
  ParseIssue,
  ParseResult,
  StringParserOptions,
} from "./types.js";

const DECIMAL_NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * Sanitizes and normalizes a parse issue candidate into a structured, frozen ParseIssue.
 * Defends against prototype pollution on issue code and validates structural path integrity.
 */
export function sanitizeParseIssue(
  raw: unknown,
  defaultPath?: readonly (string | number)[],
): ParseIssue {
  let code = "parse.invalid";
  let message: string | undefined = undefined;
  let path: readonly (string | number)[] | undefined = defaultPath;

  if (typeof raw === "string" && raw.trim() !== "") {
    message = raw;
  } else if (raw !== null && typeof raw === "object") {
    const rawObj = raw as Record<string, unknown>;
    if (typeof rawObj["code"] === "string" && rawObj["code"].trim() !== "") {
      const candidateCode = rawObj["code"];
      if (
        candidateCode === "__proto__" ||
        candidateCode === "constructor" ||
        candidateCode === "prototype"
      ) {
        throw new Error(
          `Security error: Prototype pollution attempt blocked on parse issue code "${candidateCode}"`,
        );
      }
      code = candidateCode;
    }
    if (typeof rawObj["message"] === "string") {
      message = rawObj["message"];
    }
    if (rawObj["path"] !== undefined && rawObj["path"] !== null) {
      if (!Array.isArray(rawObj["path"])) {
        throw new TypeError(`Parse issue "path" must be an array`);
      }
      const segments: (string | number)[] = [];
      for (let i = 0; i < rawObj["path"].length; i++) {
        const seg = rawObj["path"][i];
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

/**
 * Creates a built-in string-to-number parser with strict decimal grammar validation.
 * Retains raw presentation input on parse failure without mutating domain value.
 */
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
export function createNumberParser(
  options?: NumberParserOptions,
): FieldParser<string, number | undefined>;
export function createNumberParser(
  options: NumberParserOptions = {},
): FieldParser<string, number | undefined> {
  const { allowEmpty = false, emptyValue = undefined, trim = true } = options;

  return (raw: string): ParseResult<number | undefined> => {
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
    if (str === "-" || str.endsWith(".")) {
      return { ok: false, issue: { code: "parse.invalid_number", message: "Incomplete number" } };
    }
    if (!DECIMAL_NUMBER_PATTERN.test(str)) {
      return { ok: false, issue: { code: "parse.invalid_number", message: "Invalid number" } };
    }
    const num = Number(str);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      return { ok: false, issue: { code: "parse.invalid_number", message: "Invalid number" } };
    }
    return { ok: true, value: num };
  };
}

/**
 * Creates a built-in string parser supporting optional whitespace trimming.
 */
export function createStringParser(options: StringParserOptions = {}): FieldParser<string, string> {
  const { trim = false } = options;
  return (raw: string): ParseResult<string> => {
    if (typeof raw !== "string") {
      return { ok: false, issue: { code: "parse.type_error", message: "Expected string input" } };
    }
    return { ok: true, value: trim ? raw.trim() : raw };
  };
}

/**
 * Creates a built-in string parser mapping empty/whitespace strings to undefined.
 */
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

/**
 * Creates a built-in boolean parser handling boolean and common string representations ("true", "false", "1", "0", "on", "off").
 */
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
