import { createFieldCore } from "./field-parserless.js";
import type { FieldState, ParsedCreateFieldOptions } from "./types.js";

export function createParsedField<TRaw, TValue>(
  options: ParsedCreateFieldOptions<TRaw, TValue>,
): FieldState<TValue, TRaw> {
  return createFieldCore<TValue, TRaw>({
    ...options,
    parseStatus: "parsed",
  });
}
