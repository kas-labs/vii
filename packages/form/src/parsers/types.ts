/**
 * Issue source discriminator indicating the subsystem that originated the issue.
 */
export type IssueSource = "validation" | "parse" | "server";

/**
 * Base structured issue shape shared across all Form issue categories.
 */
export interface FormIssueBase {
  /**
   * Machine-readable error code or identifier.
   */
  readonly code: string;

  /**
   * Human-readable error message. Plain text data only.
   */
  readonly message?: string | undefined;

  /**
   * Structural path segments identifying the location of the issue.
   */
  readonly path?: readonly (string | number)[] | undefined;

  /**
   * Subsystem origin of the issue.
   */
  readonly source: IssueSource;
}

/**
 * Structured issue emitted when a raw presentation value fails parsing into domain value.
 */
export interface ParseIssue extends FormIssueBase {
  readonly source: "parse";
}

/**
 * Current parsing status of a leaf form field.
 * - "unparsed": field has no parser configured or was updated via programmatic setValue.
 * - "parsed": raw presentation input was successfully parsed into a domain value.
 * - "invalid": raw presentation input failed parsing.
 */
export type ParseStatus = "unparsed" | "parsed" | "invalid";

/**
 * Structured outcome of a synchronous field parser execution.
 */
export type ParseResult<TValue> =
  | { readonly ok: true; readonly value: TValue }
  | { readonly ok: false; readonly issue?: string | Partial<ParseIssue> | undefined };

/**
 * Synchronous parser function converting raw presentation input into a typed domain value or parse issue.
 */
export type FieldParser<TRaw, TValue> = (raw: TRaw) => ParseResult<TValue>;

/**
 * Configuration options for the built-in decimal number parser.
 */
export interface NumberParserOptions {
  /**
   * Whether empty or whitespace-only strings are accepted as valid empty values.
   * Defaults to false.
   */
  readonly allowEmpty?: boolean | undefined;

  /**
   * Domain value returned when input is empty and allowEmpty is true.
   * Defaults to undefined.
   */
  readonly emptyValue?: number | undefined;

  /**
   * Whether to trim whitespace before parsing.
   * Defaults to true.
   */
  readonly trim?: boolean | undefined;
}

/**
 * Configuration options for the built-in string parser.
 */
export interface StringParserOptions {
  /**
   * Whether to trim leading and trailing whitespace.
   * Defaults to false to prevent silent data loss unless explicitly requested.
   */
  readonly trim?: boolean | undefined;
}
