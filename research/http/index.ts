/**
 * Vii HTTP Client & Transport Research (H1-H8 Baseline)
 *
 * Research Prototype: Not a production package.
 */

export {
  AbortError,
  HttpError,
  HttpParseError,
  HttpSecurityError,
  HttpStatusError,
  HttpValidationError,
  NetworkError,
  TimeoutError,
  isAbortError,
  isHttpError,
  isHttpParseError,
  isHttpSecurityError,
  isHttpStatusError,
  isHttpValidationError,
  isNetworkError,
  isTimeoutError,
} from "./errors.js";
export { bindScopeSignal, composeSignals, createTimeoutSignal } from "./cancellation.js";
export { createHttpClient } from "./client.js";
export { mergeHeaders } from "./headers.js";
export {
  DEFAULT_REDACTED_HEADERS,
  DEFAULT_REDACTED_PARAMS,
  formatTraceparent,
  generateSpanId,
  generateTraceId,
  parseTraceparent,
  redactHeaders,
  redactUrl,
} from "./observability.js";
export { composeMiddleware } from "./pipeline.js";
export {
  calculateBackoff,
  executeWithRetry,
  normalizeRetryPolicy,
  parseRetryAfter,
} from "./retry.js";
export { validatePayload } from "./schema.js";
export {
  DEFAULT_SENSITIVE_HEADERS,
  isPrivateIpv4,
  isPrivateIpv6,
  isPrivateOrRestrictedHost,
  stripSensitiveHeaders,
  validateUrlSecurity,
} from "./security.js";
export {
  iterateLines,
  iterateStream,
  parseEventStream,
  parseJsonEventStream,
} from "./streaming.js";
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
  HttpRequestStartEvent,
  HttpRequestTiming,
  HttpResponseErrorEvent,
  HttpResponseSuccessEvent,
  QueryParams,
  QueryParamValue,
  TelemetryConfig,
} from "./types.js";
export type {
  HttpParseErrorOptions,
  HttpSecurityErrorOptions,
  HttpStatusErrorOptions,
  HttpValidationErrorOptions,
  NetworkErrorOptions,
} from "./errors.js";
export type { RetryPolicy } from "./retry.js";
export type { ScopeLike, SignalBinding } from "./cancellation.js";
export type { StandardSchemaV1 } from "./schema.js";
export type { SecurityPolicy } from "./security.js";
export type { JsonServerSentEvent, ServerSentEvent } from "./streaming.js";
