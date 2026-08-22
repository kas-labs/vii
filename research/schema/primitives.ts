import { BaseSchema, type Schema, type ValidationResult } from "./types.js";

export class StringSchema extends BaseSchema<string, string> {
  readonly kind = "string";

  constructor(
    private readonly constraints: {
      readonly min?: number;
      readonly max?: number;
      readonly regex?: RegExp;
      readonly isEmail?: boolean;
    } = {},
  ) {
    super();
  }

  check(input: unknown, path: readonly (string | number)[] = []): ValidationResult<string> {
    if (typeof input !== "string") {
      return {
        ok: false,
        issues: [{ code: "invalid_type", expected: "string", path }],
      };
    }

    if (this.constraints.min !== undefined && input.length < this.constraints.min) {
      return {
        ok: false,
        issues: [{ code: "string_too_short", expected: `>= ${this.constraints.min}`, path }],
      };
    }

    if (this.constraints.max !== undefined && input.length > this.constraints.max) {
      return {
        ok: false,
        issues: [{ code: "string_too_long", expected: `<= ${this.constraints.max}`, path }],
      };
    }

    if (this.constraints.regex !== undefined && !this.constraints.regex.test(input)) {
      return {
        ok: false,
        issues: [{ code: "invalid_format", expected: "matching regex pattern", path }],
      };
    }

    if (this.constraints.isEmail && !EMAIL_REGEX.test(input)) {
      return {
        ok: false,
        issues: [{ code: "invalid_email", expected: "valid email format", path }],
      };
    }

    return { ok: true, value: input };
  }

  min(length: number): StringSchema {
    return new StringSchema({ ...this.constraints, min: length });
  }

  max(length: number): StringSchema {
    return new StringSchema({ ...this.constraints, max: length });
  }

  regex(pattern: RegExp): StringSchema {
    return new StringSchema({ ...this.constraints, regex: pattern });
  }

  email(): StringSchema {
    return new StringSchema({ ...this.constraints, isEmail: true });
  }
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export class NumberSchema extends BaseSchema<number, number> {
  readonly kind = "number";

  constructor(
    private readonly constraints: {
      readonly min?: number;
      readonly max?: number;
      readonly isInteger?: boolean;
      readonly isFinite?: boolean;
    } = {},
  ) {
    super();
  }

  check(input: unknown, path: readonly (string | number)[] = []): ValidationResult<number> {
    if (typeof input !== "number" || Number.isNaN(input)) {
      return {
        ok: false,
        issues: [{ code: "invalid_type", expected: "number", path }],
      };
    }

    if (this.constraints.isFinite && !Number.isFinite(input)) {
      return {
        ok: false,
        issues: [{ code: "not_finite", expected: "finite number", path }],
      };
    }

    if (this.constraints.isInteger && !Number.isInteger(input)) {
      return {
        ok: false,
        issues: [{ code: "not_integer", expected: "integer number", path }],
      };
    }

    if (this.constraints.min !== undefined && input < this.constraints.min) {
      return {
        ok: false,
        issues: [{ code: "number_too_small", expected: `>= ${this.constraints.min}`, path }],
      };
    }

    if (this.constraints.max !== undefined && input > this.constraints.max) {
      return {
        ok: false,
        issues: [{ code: "number_too_large", expected: `<= ${this.constraints.max}`, path }],
      };
    }

    return { ok: true, value: input };
  }

  min(value: number): NumberSchema {
    return new NumberSchema({ ...this.constraints, min: value });
  }

  max(value: number): NumberSchema {
    return new NumberSchema({ ...this.constraints, max: value });
  }

  int(): NumberSchema {
    return new NumberSchema({ ...this.constraints, isInteger: true });
  }

  finite(): NumberSchema {
    return new NumberSchema({ ...this.constraints, isFinite: true });
  }
}

export class BooleanSchema extends BaseSchema<boolean, boolean> {
  readonly kind = "boolean";

  check(input: unknown, path: readonly (string | number)[] = []): ValidationResult<boolean> {
    if (typeof input !== "boolean") {
      return {
        ok: false,
        issues: [{ code: "invalid_type", expected: "boolean", path }],
      };
    }
    return { ok: true, value: input };
  }
}

export class LiteralSchema<T extends string | number | boolean> extends BaseSchema<T, T> {
  readonly kind = "literal";

  constructor(readonly literalValue: T) {
    super();
  }

  check(input: unknown, path: readonly (string | number)[] = []): ValidationResult<T> {
    if (input !== this.literalValue) {
      return {
        ok: false,
        issues: [{ code: "invalid_literal", expected: String(this.literalValue), path }],
      };
    }
    return { ok: true, value: input as T };
  }
}

export class NullSchema extends BaseSchema<null, null> {
  readonly kind = "null";

  check(input: unknown, path: readonly (string | number)[] = []): ValidationResult<null> {
    if (input !== null) {
      return {
        ok: false,
        issues: [{ code: "invalid_type", expected: "null", path }],
      };
    }
    return { ok: true, value: null };
  }
}

export class UndefinedSchema extends BaseSchema<undefined, undefined> {
  readonly kind = "undefined";

  check(input: unknown, path: readonly (string | number)[] = []): ValidationResult<undefined> {
    if (input !== undefined) {
      return {
        ok: false,
        issues: [{ code: "invalid_type", expected: "undefined", path }],
      };
    }
    return { ok: true, value: undefined };
  }
}

export class UnknownSchema extends BaseSchema<unknown, unknown> {
  readonly kind = "unknown";

  check(input: unknown): ValidationResult<unknown> {
    return { ok: true, value: input };
  }
}

export const string = (): StringSchema => new StringSchema();
export const number = (): NumberSchema => new NumberSchema();
export const boolean = (): BooleanSchema => new BooleanSchema();
export const literal = <T extends string | number | boolean>(val: T): LiteralSchema<T> =>
  new LiteralSchema(val);
export const nullSchema = (): NullSchema => new NullSchema();
export const undefinedSchema = (): UndefinedSchema => new UndefinedSchema();
export const unknown = (): UnknownSchema => new UnknownSchema();
