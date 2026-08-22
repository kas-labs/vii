import {
  BaseSchema,
  type InferInput,
  type InferOutput,
  type Schema,
  type SchemaIssue,
  type ValidationResult,
} from "./types.js";

const FORBIDDEN_KEYS: ReadonlySet<string> = new Set(["__proto__", "prototype", "constructor"]);

export class ObjectSchema<TShape extends Record<string, Schema<any, any>>> extends BaseSchema<
  { [K in keyof TShape]: InferInput<TShape[K]> },
  { [K in keyof TShape]: InferOutput<TShape[K]> }
> {
  readonly kind = "object";

  constructor(readonly shape: TShape) {
    super();
  }

  check(
    input: unknown,
    path: readonly (string | number)[] = [],
  ): ValidationResult<{ [K in keyof TShape]: InferOutput<TShape[K]> }> {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return {
        ok: false,
        issues: [{ code: "invalid_type", expected: "object", path }],
      };
    }

    const inputRecord = input as Record<string, unknown>;
    const issues: SchemaIssue[] = [];

    // Check for prototype pollution attempt
    for (const key of Object.getOwnPropertyNames(inputRecord)) {
      if (FORBIDDEN_KEYS.has(key)) {
        issues.push({
          code: "forbidden_property",
          expected: "safe property name",
          path: [...path, key],
        });
      }
    }

    // Validate declared fields in shape
    for (const [key, schema] of Object.entries(this.shape)) {
      let fieldValue: unknown;
      try {
        fieldValue = inputRecord[key];
      } catch {
        // Getter throw or proxy trap
        issues.push({
          code: "unreadable_property",
          expected: "readable property",
          path: [...path, key],
        });
        continue;
      }

      const fieldResult = schema.check(fieldValue, [...path, key]);
      if (!fieldResult.ok) {
        issues.push(...fieldResult.issues);
      }
    }

    if (issues.length > 0) {
      return { ok: false, issues };
    }

    // Zero-copy guarantee for validation-only success path
    return { ok: true, value: input as { [K in keyof TShape]: InferOutput<TShape[K]> } };
  }
}

export class ArraySchema<TItemSchema extends Schema<any, any>> extends BaseSchema<
  Array<InferInput<TItemSchema>>,
  Array<InferOutput<TItemSchema>>
> {
  readonly kind = "array";

  constructor(readonly elementSchema: TItemSchema) {
    super();
  }

  check(
    input: unknown,
    path: readonly (string | number)[] = [],
  ): ValidationResult<Array<InferOutput<TItemSchema>>> {
    if (!Array.isArray(input)) {
      return {
        ok: false,
        issues: [{ code: "invalid_type", expected: "array", path }],
      };
    }

    const issues: SchemaIssue[] = [];

    for (let i = 0; i < input.length; i++) {
      let itemValue: unknown;
      try {
        itemValue = input[i];
      } catch {
        issues.push({
          code: "unreadable_element",
          expected: "readable array element",
          path: [...path, i],
        });
        continue;
      }

      const itemResult = this.elementSchema.check(itemValue, [...path, i]);
      if (!itemResult.ok) {
        issues.push(...itemResult.issues);
      }
    }

    if (issues.length > 0) {
      return { ok: false, issues };
    }

    // Zero-copy guarantee for validation-only success path
    return { ok: true, value: input as Array<InferOutput<TItemSchema>> };
  }
}

export class UnionSchema<
  TOptions extends readonly [Schema<any, any>, ...Schema<any, any>[]],
> extends BaseSchema<InferInput<TOptions[number]>, InferOutput<TOptions[number]>> {
  readonly kind = "union";

  constructor(readonly options: TOptions) {
    super();
  }

  check(
    input: unknown,
    path: readonly (string | number)[] = [],
  ): ValidationResult<InferOutput<TOptions[number]>> {
    const allBranchIssues: SchemaIssue[] = [];

    for (const option of this.options) {
      const result = option.check(input, path);
      if (result.ok) {
        return result as ValidationResult<InferOutput<TOptions[number]>>;
      }
      allBranchIssues.push(...result.issues);
    }

    return {
      ok: false,
      issues: [
        {
          code: "invalid_union",
          expected: `one of ${this.options.length} union branches`,
          path,
        },
      ],
    };
  }
}

export const object = <TShape extends Record<string, Schema<any, any>>>(
  shape: TShape,
): ObjectSchema<TShape> => new ObjectSchema(shape);

export const array = <TItemSchema extends Schema<any, any>>(
  elementSchema: TItemSchema,
): ArraySchema<TItemSchema> => new ArraySchema(elementSchema);

export const union = <TOptions extends readonly [Schema<any, any>, ...Schema<any, any>[]]>(
  ...options: TOptions
): UnionSchema<TOptions> => new UnionSchema(options);
