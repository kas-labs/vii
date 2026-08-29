/**
 * Vii Form public root entrypoint.
 *
 * Exposes core reactive primitives for building fine-grained form trees:
 * - createField (leaf state with optional parser and validation rules)
 * - createFieldGroup (nested object state aggregating validation, dirty, and touched)
 * - createForm (root form coordinator managing tree lifecycle and reinitialization)
 * - standardSchema (provider-neutral Standard Schema v1 validation bridge)
 * - built-in parsers (createNumberParser, createStringParser, createOptionalStringParser, createBooleanParser)
 */
export { createField } from "./core/field.js";
export { createFieldGroup } from "./core/group.js";
export { createForm } from "./core/form.js";

export {
  createBooleanParser,
  createNumberParser,
  createOptionalStringParser,
  createStringParser,
  sanitizeParseIssue,
} from "./parsers/builtins.js";

export {
  isStandardSchema,
  normalizeStandardSchemaIssue,
  standardSchema,
} from "./validation/standard-schema.js";

export type {
  AnyValidationRule,
  AsyncValidationRule,
  CreateFieldGroupOptions,
  CreateFieldOptions,
  CreateFormOptions,
  FieldEqualityFn,
  FieldGroup,
  FieldIssue,
  FieldParser,
  FieldPathSegment,
  FieldState,
  FormFieldsRecord,
  FormInstance,
  FormIssueBase,
  FormNode,
  FormRawValueFor,
  FormRawValues,
  FormValueFor,
  FormValues,
  IssueSource,
  NumberParserOptions,
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
