/**
 * Vii Form public root entrypoint.
 *
 * Exposes core reactive primitives for building fine-grained form trees:
 * - createField (leaf state with optional parser and validation rules)
 * - createFieldGroup (nested object state aggregating validation, dirty, and touched)
 * - createForm (root form coordinator managing tree lifecycle and reinitialization)
 * - standardSchema (provider-neutral Standard Schema v1 validation bridge)
 * - built-in parsers (createNumberParser, createStringParser)
 */
export { createField } from "./core/field.js";
export { createFieldGroup } from "./core/group.js";
export { createForm } from "./core/form.js";

export { createNumberParser, createStringParser } from "./parsers/builtins.js";

export { isStandardSchema, standardSchema } from "./validation/standard-schema.js";

export type {
  AnyValidationRule,
  AsyncValidationRule,
  CreateFieldGroupOptions,
  CreateFieldOptions,
  CreateFormOptions,
  FieldBaseline,
  FieldEqualityFn,
  FieldGroup,
  FieldIssue,
  FieldParser,
  FieldPathSegment,
  FieldReinitializeInput,
  FieldState,
  FormFieldsRecord,
  FormInstance,
  FormIssueBase,
  FormNode,
  FormRawValueFor,
  FormRawValues,
  FormReinitializeBaseline,
  FormReinitializeBaselineFor,
  FormValueFor,
  FormValues,
  IssueSource,
  NumberParserOptions,
  ParsedCreateFieldOptions,
  ParserlessCreateFieldOptions,
  ParseIssue,
  ParseResult,
  ParseStatus,
  StringParserOptions,
  SyncValidationRule,
  ValidationIssue,
  ValidationIssueInput,
  ValidationRule,
  ValidationRuleContext,
  ValidationStatus,
  ValidationTriggerMode,
} from "./core/types.js";

export type { StandardSchemaV1 } from "./validation/standard-schema.js";
