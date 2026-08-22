/**
 * Vii HTTP Client & Transport Research — Standard Schema v1 Boundary (H4 Baseline)
 *
 * Research Prototype: Not a production package.
 */

import { HttpValidationError } from "./errors.js";

/**
 * Standard Schema v1 specification types.
 * @see https://github.com/standard-schema/standard-schema
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) => StandardSchemaV1.Result<Output> | Promise<StandardSchemaV1.Result<Output>>;
    readonly types?: {
      readonly input: Input;
      readonly output: Output;
    };
  };
}

export namespace StandardSchemaV1 {
  export type Result<Output> = SuccessResult<Output> | FailureResult;

  export interface SuccessResult<Output> {
    readonly value: Output;
    readonly issues?: undefined;
  }

  export interface FailureResult {
    readonly issues: ReadonlyArray<Issue>;
  }

  export interface Issue {
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  export interface PathSegment {
    readonly key: PropertyKey;
  }

  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
    Schema["~standard"]["types"]
  >["input"];

  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema["~standard"]["types"]
  >["output"];
}

/**
 * Validate a decoded payload against a Standard Schema v1 provider.
 */
export async function validatePayload<T>(
  schema: StandardSchemaV1<unknown, T>,
  data: unknown,
  response: Response,
  request: Request,
): Promise<T> {
  const result = await schema["~standard"].validate(data);
  if (result.issues) {
    throw new HttpValidationError(
      `Validation failed: ${result.issues.map((i) => i.message).join("; ")}`,
      {
        issues: result.issues,
        data,
        response,
        request,
      },
    );
  }
  return result.value;
}
