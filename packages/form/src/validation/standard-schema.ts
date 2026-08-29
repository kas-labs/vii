import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  FieldPathSegment,
  ValidationIssue,
  ValidationRule,
  ValidationRuleContext,
} from "./types.js";

export type { StandardSchemaV1 };

/**
 * Type guard verifying whether an object conforms to the Standard Schema v1 specification.
 * Internal helper for the standardSchema adapter factory.
 */
export function isStandardSchema(value: unknown): value is StandardSchemaV1<unknown, unknown> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    "~standard" in value &&
    typeof (value as Record<string, unknown>)["~standard"] === "object" &&
    (value as Record<string, unknown>)["~standard"] !== null &&
    (value as { "~standard": { version: unknown } })["~standard"].version === 1 &&
    typeof (value as { "~standard": { validate: unknown } })["~standard"].validate === "function"
  );
}

/**
 * Normalizes a provider-specific Standard Schema issue into a safe, frozen Vii ValidationIssue.
 * Standard Schema v1 requires issue.message to be a string; malformed issues fail closed.
 */
export function normalizeStandardSchemaIssue(raw: StandardSchemaV1.Issue): ValidationIssue {
  if (raw === null || typeof raw !== "object") {
    throw new TypeError("Standard Schema issue must be an object");
  }

  const rawObj = raw as unknown as Record<string, unknown>;
  if (typeof rawObj["message"] !== "string") {
    throw new TypeError("Standard Schema issue message must be a string");
  }

  let code = "schema.validation";
  if (typeof rawObj["code"] === "string" && rawObj["code"].trim() !== "") {
    code = rawObj["code"];
  }

  let sanitizedPath: readonly FieldPathSegment[] | undefined = undefined;
  if (raw.path !== undefined && raw.path !== null) {
    if (!Array.isArray(raw.path)) {
      throw new TypeError("Standard Schema issue path must be an array");
    }
    const segments: FieldPathSegment[] = [];
    for (let i = 0; i < raw.path.length; i++) {
      const seg = raw.path[i];
      if (typeof seg === "string" || typeof seg === "number") {
        segments.push(seg);
      } else if (
        seg !== null &&
        typeof seg === "object" &&
        "key" in (seg as Record<string, unknown>)
      ) {
        const key = (seg as Record<string, unknown>)["key"];
        if (typeof key === "string" || typeof key === "number") {
          segments.push(key);
        } else {
          throw new TypeError(
            `Standard Schema issue path key must be string or number, received ${typeof key}`,
          );
        }
      } else {
        throw new TypeError(
          `Standard Schema issue path segment must be string, number, or object with key, received ${typeof seg}`,
        );
      }
    }
    sanitizedPath = Object.freeze(segments);
  }

  const issue: ValidationIssue = {
    code,
    message: rawObj["message"],
    path: sanitizedPath,
    source: "validation",
  };
  return Object.freeze(issue);
}

/**
 * Parses a Standard Schema v1 Result into validation issues or success (null).
 * Accepts only `{ value }` success or `{ issues: Issue[] }` failure shapes per spec v1.
 * Transformed TOutput is ignored; parser remains responsible for Raw -> Value.
 */
function parseStandardSchemaResult(
  result: unknown,
  vendor: string,
): readonly ValidationIssue[] | null {
  if (!result || typeof result !== "object") {
    throw new TypeError("Standard Schema validate returned an invalid result object");
  }

  const obj = result as Record<string, unknown>;
  const hasIssues = obj["issues"] !== undefined && obj["issues"] !== null;
  const hasValue = "value" in obj;

  if (hasIssues) {
    if (!Array.isArray(obj["issues"])) {
      throw new TypeError(
        `Standard Schema provider "${vendor}" returned a non-array "issues" property`,
      );
    }
    return Object.freeze(
      (obj["issues"] as StandardSchemaV1.Issue[]).map((iss) => normalizeStandardSchemaIssue(iss)),
    );
  }

  if (hasValue) {
    return null;
  }

  throw new TypeError(
    `Standard Schema provider "${vendor}" returned a malformed result: expected { value } or { issues }`,
  );
}

/**
 * Provider-neutral adapter bridging any Standard Schema v1 schema (e.g. Zod 4, Valibot, ArkType)
 * into a Vii ValidationRule with fail-closed boundary enforcement.
 *
 * Validation bridge only: schema TOutput does not replace field TValue.
 */
export function standardSchema<TInput, TOutput = TInput>(
  schema: StandardSchemaV1<TInput, TOutput>,
): ValidationRule<TInput> {
  if (!isStandardSchema(schema)) {
    throw new TypeError("standardSchema adapter requires a valid Standard Schema v1 object");
  }

  const vendor = schema["~standard"].vendor;

  return (
    value: TInput,
    context: ValidationRuleContext & { readonly signal?: AbortSignal | undefined },
  ) => {
    const validateResult = schema["~standard"].validate(value);

    if (
      validateResult !== null &&
      typeof validateResult === "object" &&
      typeof (validateResult as Promise<unknown>).then === "function"
    ) {
      return (validateResult as Promise<StandardSchemaV1.Result<TOutput>>).then((result) => {
        if (context.signal?.aborted) {
          return null;
        }
        return parseStandardSchemaResult(result, vendor);
      });
    }

    return parseStandardSchemaResult(validateResult, vendor);
  };
}
