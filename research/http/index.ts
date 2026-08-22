/**
 * Vii HTTP Client & Transport Research (H1 Baseline)
 *
 * Research Prototype: Not a production package.
 */

export { createHttpClient } from "./client.js";
export { mergeHeaders } from "./headers.js";
export { isAbsoluteUrl, resolveUrl, serializeQueryParams } from "./url.js";
export type {
  HttpClient,
  HttpClientConfig,
  HttpMethod,
  HttpRequestOptions,
  QueryParams,
  QueryParamValue,
} from "./types.js";
