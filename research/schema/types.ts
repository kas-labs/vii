export interface SchemaIssue {
  readonly code: string;
  readonly path: readonly (string | number)[];
  readonly expected?: string;
  readonly message?: string;
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T; readonly issues?: undefined }
  | { readonly ok: false; readonly issues: readonly SchemaIssue[]; readonly value?: undefined };

export class SchemaError extends Error {
  readonly issues: readonly SchemaIssue[];

  constructor(issues: readonly SchemaIssue[]) {
    super(`Schema validation failed with ${issues.length} issue(s)`);
    this.name = "SchemaError";
    this.issues = issues;
  }
}

export interface Schema<TInput, TOutput> {
  readonly kind: string;
  check(input: unknown, path?: readonly (string | number)[]): ValidationResult<TOutput>;
  parse(input: unknown): TOutput;
  optional(): Schema<TInput | undefined, TOutput | undefined>;
  nullable(): Schema<TInput | null, TOutput | null>;
  refine(
    predicate: (value: TOutput) => boolean,
    options?: { readonly code?: string; readonly message?: string },
  ): Schema<TInput, TOutput>;
}

export type InferInput<T> = T extends Schema<infer TIn, any> ? TIn : never;
export type InferOutput<T> = T extends Schema<any, infer TOut> ? TOut : never;

export abstract class BaseSchema<TInput, TOutput> implements Schema<TInput, TOutput> {
  abstract readonly kind: string;

  abstract check(input: unknown, path?: readonly (string | number)[]): ValidationResult<TOutput>;

  parse(input: unknown): TOutput {
    const result = this.check(input);
    if (result.ok) {
      return result.value;
    }
    throw new SchemaError(result.issues);
  }

  optional(): Schema<TInput | undefined, TOutput | undefined> {
    return new OptionalSchema(this);
  }

  nullable(): Schema<TInput | null, TOutput | null> {
    return new NullableSchema(this);
  }

  refine(
    predicate: (value: TOutput) => boolean,
    options?: { readonly code?: string; readonly message?: string },
  ): Schema<TInput, TOutput> {
    return new RefinedSchema(this, predicate, options);
  }
}

class OptionalSchema<TIn, TOut> extends BaseSchema<TIn | undefined, TOut | undefined> {
  readonly kind = "optional";

  constructor(private readonly inner: Schema<TIn, TOut>) {
    super();
  }

  check(
    input: unknown,
    path: readonly (string | number)[] = [],
  ): ValidationResult<TOut | undefined> {
    if (input === undefined) {
      return { ok: true, value: undefined };
    }
    return this.inner.check(input, path);
  }
}

class NullableSchema<TIn, TOut> extends BaseSchema<TIn | null, TOut | null> {
  readonly kind = "nullable";

  constructor(private readonly inner: Schema<TIn, TOut>) {
    super();
  }

  check(input: unknown, path: readonly (string | number)[] = []): ValidationResult<TOut | null> {
    if (input === null) {
      return { ok: true, value: null };
    }
    return this.inner.check(input, path);
  }
}

class RefinedSchema<TIn, TOut> extends BaseSchema<TIn, TOut> {
  readonly kind = "refined";

  constructor(
    private readonly inner: Schema<TIn, TOut>,
    private readonly predicate: (value: TOut) => boolean,
    private readonly options?: { readonly code?: string; readonly message?: string },
  ) {
    super();
  }

  check(input: unknown, path: readonly (string | number)[] = []): ValidationResult<TOut> {
    const innerResult = this.inner.check(input, path);
    if (!innerResult.ok) {
      return innerResult;
    }
    let isValid = false;
    try {
      isValid = this.predicate(innerResult.value);
    } catch {
      isValid = false;
    }
    if (!isValid) {
      return {
        ok: false,
        issues: [
          {
            code: this.options?.code ?? "custom_refinement",
            path,
            message: this.options?.message ?? "Value failed custom refinement predicate",
          },
        ],
      };
    }
    return innerResult;
  }
}
