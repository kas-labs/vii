import type { InferInput, InferOutput, Schema } from "./types.js";

export interface StandardSchemaV1Issue {
  readonly message: string;
  readonly path?: readonly (string | number | symbol)[] | undefined;
}

export type StandardSchemaV1Result<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: readonly StandardSchemaV1Issue[]; readonly value?: undefined };

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: "vii";
    readonly validate: (
      value: unknown,
    ) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>;
    readonly types?: {
      readonly input: Input;
      readonly output: Output;
    };
  };
}

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
    },
  };
}
