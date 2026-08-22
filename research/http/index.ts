/**
 * Vii HTTP Client & Transport Research (H1-H5 Baseline)
 *
 * Research Prototype: Not a production package.
 */

export {
  AbortError,
  HttpError,
  HttpParseError,
  HttpStatusError,
  HttpValidationError,
  NetworkError,
  TimeoutError,
  isAbortError,
  isHttpError,
  isHttpParseError,
  isHttpStatusError,
  isHttpValidationError,
  isNetworkError,
  isTimeoutError,
} from "./errors.js";
export { bindScopeSignal, composeSignals, createTimeoutSignal } from "./cancellation.js";
export { createHttpClient } from "./client.js";
export { mergeHeaders } from "./headers.js";
export { composeMiddleware } from "./pipeline.js";
export {
  calculateBackoff,
  executeWithRetry,
  normalizeRetryPolicy,
  parseRetryAfter,
} from "./retry.js";
export { validatePayload } from "./schema.js";
export { isAbsoluteUrl, resolveUrl, serializeQueryParams } from "./url.js";
export type {
  ExtendedHeadersInit,
  HeaderValue,
  HttpClient,
  HttpClientConfig,
  HttpHandler,
  HttpMethod,
  HttpMiddleware,
  HttpRequestContext,
  HttpRequestOptions,
  QueryParams,
  QueryParamValue,
} from "./types.js";
export type {
  HttpParseErrorOptions,
  HttpStatusErrorOptions,
  HttpValidationErrorOptions,
  NetworkErrorOptions,
} from "./errors.js";
export type { RetryPolicy } from "./retry.js";
export type { ScopeLike, SignalBinding } from "./cancellation.js";
export type { StandardSchemaV1 } from "./schema.js";
