import type { FieldState } from "./types.js";

/**
 * Explicit domain and raw presentation baseline for parser-aware fields.
 */
export type FieldBaseline<TValue, TRaw> = {
  readonly value: TValue;
  readonly rawValue: TRaw;
};

/**
 * Accepted field-level baseline input for whole-form reinitialization.
 * Parserless fields (TRaw = TValue) may use a domain shorthand; cross-type parsed fields require FieldBaseline.
 */
export type FieldReinitializeInput<TValue, TRaw> = [TRaw] extends [TValue]
  ? [TValue] extends [TRaw]
    ? TValue | FieldBaseline<TValue, TRaw>
    : FieldBaseline<TValue, TRaw>
  : FieldBaseline<TValue, TRaw>;

/**
 * Recursively maps a form node to its accepted reinitialize baseline shape.
 */
export type FormReinitializeBaselineFor<T> =
  T extends FieldState<infer V, infer R>
    ? FieldReinitializeInput<V, R>
    : T extends { readonly kind: "group"; readonly fields: infer F }
      ? FormReinitializeBaseline<F extends Record<string, unknown> ? F : never>
      : never;

/**
 * Whole-form reinitialize baseline object keyed by direct child field names.
 */
export type FormReinitializeBaseline<TFields extends Record<string, unknown>> = {
  readonly [K in keyof TFields]: FormReinitializeBaselineFor<TFields[K]>;
};

export function isFieldBaseline<TValue, TRaw>(
  input: unknown,
): input is FieldBaseline<TValue, TRaw> {
  return (
    input !== null &&
    typeof input === "object" &&
    "value" in input &&
    "rawValue" in (input as Record<string, unknown>)
  );
}

/**
 * Normalizes accepted reinitialize input into explicit value/raw baselines without cross-domain synthesis.
 */
export function normalizeFieldReinitializeInput<TValue, TRaw>(
  input: FieldReinitializeInput<TValue, TRaw>,
  options: {
    readonly hasParser: boolean;
    readonly requiresExplicitRawBaseline: boolean;
  },
): FieldBaseline<TValue, TRaw> {
  if (isFieldBaseline<TValue, TRaw>(input)) {
    return input;
  }

  if (options.requiresExplicitRawBaseline) {
    throw new TypeError(
      "Parsed field with distinct Raw and Value types requires a baseline object " +
        "with { value, rawValue }; domain value cannot synthesize raw presentation.",
    );
  }

  if (options.hasParser && (input === null || typeof input === "object")) {
    throw new TypeError(
      "Invalid field reinitialize baseline: expected a domain value shorthand or { value, rawValue }",
    );
  }

  const value = input as TValue;
  const rawValue = input as TRaw;
  return { value, rawValue };
}
