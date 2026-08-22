/**
 * Vii HTTP Client & Transport Research (H1-H3 Baseline)
 *
 * Research Prototype: Not a production package.
 */

export {
  AbortError,
  TimeoutError,
  bindScopeSignal,
  composeSignals,
  createTimeoutSignal,
  isAbortError,
  isTimeoutError,
} from "./cancellation.js";
export { createHttpClient } from "./client.js";
export { mergeHeaders } from "./headers.js";
export { composeMiddleware } from "./pipeline.js";
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
export type { ScopeLike, SignalBinding } from "./cancellation.js";
