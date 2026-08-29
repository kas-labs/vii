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
 * Defends against prototype pollution on issue codes and sanitizes structural path keys.
 */
export function normalizeStandardSchemaIssue(raw: StandardSchemaV1.Issue): ValidationIssue {
  if (raw === null || typeof raw !== "object") {
    throw new TypeError("Standard Schema issue must be an object");
  }

  const rawObj = raw as unknown as Record<string, unknown>;
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

  const message = typeof raw.message === "string" ? raw.message : undefined;

  const issue: ValidationIssue = {
    code,
    message,
    path: sanitizedPath,
    source: "validation",
  };
  return Object.freeze(issue);
}

/**
 * Provider-neutral adapter bridging any Standard Schema v1 schema (e.g. Zod 4, Valibot, ArkType)
 * into a Vii ValidationRule with fail-closed boundary enforcement.
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

    // Asynchronous Standard Schema execution
    if (
      validateResult !== null &&
      typeof validateResult === "object" &&
      typeof (validateResult as Promise<unknown>).then === "function"
    ) {
      return (validateResult as Promise<StandardSchemaV1.Result<TOutput>>).then((result) => {
        if (context.signal?.aborted) {
          return null;
        }
        if (!result || typeof result !== "object") {
          throw new TypeError("Standard Schema validate returned an invalid result object");
        }
        if (result.issues !== undefined && result.issues !== null) {
          if (!Array.isArray(result.issues)) {
            throw new TypeError(
              `Standard Schema provider "${vendor}" returned a non-array "issues" property`,
            );
          }
          return Object.freeze(
            result.issues.map((iss: StandardSchemaV1.Issue) => normalizeStandardSchemaIssue(iss)),
          );
        }
        return null;
      });
    }

    // Synchronous Standard Schema execution
    const syncResult = validateResult as StandardSchemaV1.Result<TOutput>;
    if (!syncResult || typeof syncResult !== "object") {
      throw new TypeError("Standard Schema validate returned an invalid result object");
    }
    if (syncResult.issues !== undefined && syncResult.issues !== null) {
      if (!Array.isArray(syncResult.issues)) {
        throw new TypeError(
          `Standard Schema provider "${vendor}" returned a non-array "issues" property`,
        );
      }
      return Object.freeze(
        syncResult.issues.map((iss: StandardSchemaV1.Issue) => normalizeStandardSchemaIssue(iss)),
      );
    }

    return null;
  };
}
