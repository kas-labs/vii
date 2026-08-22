import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { InferInput, InferOutput, Schema } from "./types.js";

export type { StandardSchemaV1 };

/**
 * Generic consumer boundary: validates untrusted input using ANY Standard Schema v1 conforming schema
 * (Zod, Valibot, ArkType, TypeBox, or Vii prototype).
 */
export async function validateStandardSchema<TOutput>(
  schema: StandardSchemaV1<any, TOutput>,
  input: unknown,
): Promise<
  { ok: true; value: TOutput } | { ok: false; issues: readonly StandardSchemaV1.Issue[] }
> {
  const result = await schema["~standard"].validate(input);
  if (!result.issues) {
    return { ok: true, value: result.value };
  }
  return { ok: false, issues: result.issues };
}

/**
 * Converts a Vii research schema into an official Standard Schema v1 object.
 */
export function toStandardSchema<TSchema extends Schema<any, any>>(
  schema: TSchema,
): StandardSchemaV1<InferInput<TSchema>, InferOutput<TSchema>> {
  return {
    "~standard": {
      version: 1,
      vendor: "vii",
      validate: (value: unknown) => {
        const result = schema.check(value);
        if (result.ok) {
          return { value: result.value };
        }
        return {
          issues: result.issues.map((issue) => ({
            message: issue.message ?? `Validation failed: ${issue.code}`,
            path: issue.path,
          })),
        };
      },
      types: {
        input: undefined as any as InferInput<TSchema>,
        output: undefined as any as InferOutput<TSchema>,
      },
    },
  };
}
