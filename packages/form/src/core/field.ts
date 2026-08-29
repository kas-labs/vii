import { createParsedField } from "./field-parsed.js";
import { createParserlessField } from "./field-parserless.js";
import { isParsedOptions } from "./field-validation-runtime.js";
import type {
  CreateFieldOptions,
  FieldState,
  ParsedCreateFieldOptions,
  ParserlessCreateFieldOptions,
} from "./types.js";

export function createField<TValue>(
  options: ParserlessCreateFieldOptions<TValue>,
): FieldState<TValue, TValue>;
export function createField<TValue, TRaw>(
  options: ParsedCreateFieldOptions<TRaw, TValue>,
): FieldState<TValue, TRaw>;
export function createField(
  options: CreateFieldOptions<unknown, unknown>,
): FieldState<unknown, unknown> {
  if (isParsedOptions(options)) {
    return createParsedField(options);
  }
  return createParserlessField(options);
}
