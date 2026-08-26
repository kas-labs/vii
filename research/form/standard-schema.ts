import type { StandardSchemaV1 } from "@standard-schema/spec";
import { getActiveDiagnostics } from "../../packages/core/src/diagnostics.js";
import type {
  AsyncValidationRule,
  FieldPathSegment,
  ValidationIssue,
  ValidationRule,
  ValidationRuleContext,
} from "./form-core.js";

export type { StandardSchemaV1 };

/**
 * Type guard for Standard Schema v1 compliant objects (e.g. Zod 4, Valibot, ArkType).
 */
export function isStandardSchema(value: unknown): value is StandardSchemaV1<any, any> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    "~standard" in value &&
    typeof (value as any)["~standard"] === "object" &&
    (value as any)["~standard"] !== null &&
    (value as any)["~standard"].version === 1 &&
    typeof (value as any)["~standard"].validate === "function"
  );
}

/**
 * Normalizes a provider-specific Standard Schema issue into a safe, frozen Vii ValidationIssue.
 * Defends against prototype pollution on code and path segments.
 */
export function normalizeStandardSchemaIssue(raw: StandardSchemaV1.Issue): ValidationIssue {
  if (raw === null || typeof raw !== "object") {
    throw new TypeError("Standard Schema issue must be an object");
  }

  let code = "schema.validation";
  if (typeof (raw as any).code === "string" && (raw as any).code.trim() !== "") {
    const rawCode = (raw as any).code;
    if (rawCode === "__proto__" || rawCode === "constructor" || rawCode === "prototype") {
      throw new Error(
        `Security error: Prototype pollution attempt blocked on issue code "${rawCode}"`,
      );
    }
    code = rawCode;
  }

  let sanitizedPath: readonly FieldPathSegment[] | undefined = undefined;
  if (raw.path !== undefined && raw.path !== null) {
    if (!Array.isArray(raw.path)) {
      throw new TypeError("Standard Schema issue path must be an array");
    }
    const segments: FieldPathSegment[] = [];
    for (const seg of raw.path) {
      if (typeof seg === "string" || typeof seg === "number") {
        if (
          typeof seg === "string" &&
          (seg === "__proto__" || seg === "constructor" || seg === "prototype")
        ) {
          throw new Error(
            `Security error: Prototype pollution attempt blocked on issue path segment "${seg}"`,
          );
        }
        segments.push(seg);
      } else if (seg !== null && typeof seg === "object" && "key" in (seg as any)) {
        const key = (seg as any).key;
        if (typeof key === "string" || typeof key === "number") {
          if (
            typeof key === "string" &&
            (key === "__proto__" || key === "constructor" || key === "prototype")
          ) {
            throw new Error(
              `Security error: Prototype pollution attempt blocked on issue path segment "${key}"`,
            );
          }
          segments.push(key);
        }
      }
    }
    sanitizedPath = Object.freeze(segments);
  }

  const issue: ValidationIssue = {
    code,
    message: typeof raw.message === "string" ? raw.message : undefined,
    path: sanitizedPath,
    source: "validation",
  };
  return Object.freeze(issue);
}

/**
 * Provider-neutral adapter bridging any Standard Schema v1 schema into a Vii ValidationRule.
 * Compatible with Zod 4, Valibot, ArkType, and any standard-compliant schema.
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
    const diag = getActiveDiagnostics();
    if (diag) {
      diag.record("field.schema.validation.started", { vendor });
    }

    const validateResult = schema["~standard"].validate(value);

    // Asynchronous Standard Schema
    if (
      validateResult !== null &&
      typeof validateResult === "object" &&
      typeof (validateResult as any).then === "function"
    ) {
      return (validateResult as Promise<StandardSchemaV1.Result<TOutput>>).then((result) => {
        if (context.signal?.aborted) {
          return null;
        }
        if (!result || typeof result !== "object") {
          throw new TypeError("Standard Schema validate returned an invalid result object");
        }
        if (result.issues !== undefined && result.issues !== null) {
          // Never fall through to "valid" on a malformed failure payload: a
          // provider that reports issues in a shape we cannot read must fail
          // closed, not silently certify the value.
          if (!Array.isArray(result.issues)) {
            throw new TypeError(
              `Standard Schema provider "${vendor}" returned a non-array "issues" property`,
            );
          }
          const mappedIssues = result.issues.map((iss: StandardSchemaV1.Issue) =>
            normalizeStandardSchemaIssue(iss),
          );
          if (diag) {
            diag.record("field.schema.validation.completed", {
              vendor,
              issueCount: mappedIssues.length,
              status: "invalid",
            });
          }
          return mappedIssues;
        }
        if (diag) {
          diag.record("field.schema.validation.completed", {
            vendor,
            issueCount: 0,
            status: "valid",
          });
        }
        return null;
      });
    }

    // Synchronous Standard Schema
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
      const mappedIssues = syncResult.issues.map((iss: StandardSchemaV1.Issue) =>
        normalizeStandardSchemaIssue(iss),
      );
      if (diag) {
        diag.record("field.schema.validation.completed", {
          vendor,
          issueCount: mappedIssues.length,
          status: "invalid",
        });
      }
      return mappedIssues;
    }

    if (diag) {
      diag.record("field.schema.validation.completed", {
        vendor,
        issueCount: 0,
        status: "valid",
      });
    }
    return null;
  };
}
