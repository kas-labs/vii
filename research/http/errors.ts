/**
 * Vii HTTP Client & Transport Research — Structured Error Taxonomy (H4 Baseline)
 *
 * Research Prototype: Not a production package.
 */

import { AbortError, TimeoutError, isAbortError, isTimeoutError } from "./cancellation.js";
import type { StandardSchemaV1 } from "./schema.js";

export { AbortError, TimeoutError, isAbortError, isTimeoutError };

export class HttpError extends Error {
  override readonly name: string = "HttpError";
}

export interface HttpStatusErrorOptions extends ErrorOptions {
  readonly status: number;
  readonly statusText: string;
  readonly response: Response;
  readonly request: Request;
  readonly data?: unknown;
}

export class HttpStatusError extends HttpError {
  override readonly name = "HttpStatusError" as const;
  readonly status: number;
  readonly statusText: string;
  readonly response: Response;
  readonly request: Request;
  readonly data?: unknown;

  constructor(message: string, options: HttpStatusErrorOptions) {
    super(message, options);
    this.status = options.status;
    this.statusText = options.statusText;
    this.response = options.response;
    this.request = options.request;
    this.data = options.data;
  }
}

export interface NetworkErrorOptions extends ErrorOptions {
  readonly request: Request;
}

export class NetworkError extends HttpError {
  override readonly name = "NetworkError" as const;
  readonly request: Request;

  constructor(message: string, options: NetworkErrorOptions) {
    super(message, options);
    this.request = options.request;
  }
}

export interface HttpParseErrorOptions extends ErrorOptions {
  readonly response: Response;
  readonly request: Request;
  readonly rawText?: string | undefined;
}

export class HttpParseError extends HttpError {
  override readonly name = "HttpParseError" as const;
  readonly response: Response;
  readonly request: Request;
  readonly rawText?: string | undefined;

  constructor(message: string, options: HttpParseErrorOptions) {
    super(message, options);
    this.response = options.response;
    this.request = options.request;
    this.rawText = options.rawText;
  }
}

export interface HttpValidationErrorOptions extends ErrorOptions {
  readonly issues: readonly StandardSchemaV1.Issue[];
  readonly data: unknown;
  readonly response: Response;
  readonly request: Request;
}

export class HttpValidationError extends HttpError {
  override readonly name = "HttpValidationError" as const;
  readonly issues: readonly StandardSchemaV1.Issue[];
  readonly data: unknown;
  readonly response: Response;
  readonly request: Request;

  constructor(message: string, options: HttpValidationErrorOptions) {
    super(message, options);
    this.issues = options.issues;
    this.data = options.data;
    this.response = options.response;
    this.request = options.request;
  }
}

export function isHttpStatusError(error: unknown): error is HttpStatusError {
  return (
    error instanceof HttpStatusError ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "HttpStatusError")
  );
}

export function isNetworkError(error: unknown): error is NetworkError {
  return (
    error instanceof NetworkError ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "NetworkError")
  );
}

export function isHttpParseError(error: unknown): error is HttpParseError {
  return (
    error instanceof HttpParseError ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "HttpParseError")
  );
}

export function isHttpValidationError(error: unknown): error is HttpValidationError {
  return (
    error instanceof HttpValidationError ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "HttpValidationError")
  );
}

export function isHttpError(error: unknown): error is HttpError {
  return (
    error instanceof HttpError ||
    isHttpStatusError(error) ||
    isNetworkError(error) ||
    isHttpParseError(error) ||
    isHttpValidationError(error) ||
    isTimeoutError(error) ||
    isAbortError(error)
  );
}
