/**
 * Vii HTTP Client & Transport Research — Types (H1-H7 Baseline)
 *
 * Research Prototype: Not a production package.
 */

import type { ScopeLike } from "./cancellation.js";
import type { RetryPolicy } from "./retry.js";
import type { StandardSchemaV1 } from "./schema.js";
import type { SecurityPolicy } from "./security.js";
import type { JsonServerSentEvent, ServerSentEvent } from "./streaming.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type QueryParamValue = string | number | boolean | null | undefined;

export type QueryParams =
  | Record<string, QueryParamValue | readonly QueryParamValue[]>
  | URLSearchParams
  | readonly [string, string][];

export type HeaderValue = string | number | boolean | null | undefined;

export type ExtendedHeadersInit = HeadersInit | Record<string, HeaderValue>;

export type HttpRequestContext = Record<string, unknown>;

export type HttpHandler = (request: Request) => Promise<Response>;

export type HttpMiddleware = (
  request: Request,
  next: HttpHandler,
  context: HttpRequestContext,
) => Promise<Response>;

export interface HttpRequestOptions<T = unknown> extends Omit<
  RequestInit,
  "headers" | "method" | "body" | "signal"
> {
  readonly method?: HttpMethod | (string & {}) | undefined;
  readonly headers?: ExtendedHeadersInit | undefined;
  readonly query?: QueryParams | undefined;
  readonly body?: BodyInit | null | undefined;
  readonly signal?: AbortSignal | null | undefined;
  readonly timeout?: number | undefined;
  readonly scope?: ScopeLike | undefined;
  readonly retry?: RetryPolicy | number | boolean | undefined;
  readonly security?: SecurityPolicy | undefined;
  readonly fetch?: typeof globalThis.fetch | undefined;
  readonly context?: HttpRequestContext | undefined;
  readonly middleware?: readonly HttpMiddleware[] | undefined;
  readonly schema?: StandardSchemaV1<unknown, T> | undefined;
  readonly throwOnError?: boolean | undefined;
  readonly responseType?: "json" | "text" | "blob" | "arrayBuffer" | "stream" | undefined;
}

export interface HttpClientConfig {
  readonly baseURL?: string | URL | undefined;
  readonly headers?: ExtendedHeadersInit | undefined;
  readonly timeout?: number | undefined;
  readonly retry?: RetryPolicy | number | boolean | undefined;
  readonly security?: SecurityPolicy | undefined;
  readonly throwOnError?: boolean | undefined;
  readonly fetch?: typeof globalThis.fetch | undefined;
  readonly middleware?: readonly HttpMiddleware[] | undefined;
}

export interface HttpClient {
  readonly config: Readonly<HttpClientConfig>;

  request(url: string | URL, options?: HttpRequestOptions): Promise<Response>;
  get(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response>;
  post(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response>;
  put(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response>;
  patch(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response>;
  delete(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response>;
  head(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response>;
  options(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response>;

  requestJson<T = unknown>(url: string | URL, options?: HttpRequestOptions<T>): Promise<T>;
  getJson<T = unknown>(
    url: string | URL,
    options?: Omit<HttpRequestOptions<T>, "method">,
  ): Promise<T>;
  postJson<T = unknown>(
    url: string | URL,
    options?: Omit<HttpRequestOptions<T>, "method">,
  ): Promise<T>;
  putJson<T = unknown>(
    url: string | URL,
    options?: Omit<HttpRequestOptions<T>, "method">,
  ): Promise<T>;
  patchJson<T = unknown>(
    url: string | URL,
    options?: Omit<HttpRequestOptions<T>, "method">,
  ): Promise<T>;
  deleteJson<T = unknown>(
    url: string | URL,
    options?: Omit<HttpRequestOptions<T>, "method">,
  ): Promise<T>;

  stream(url: string | URL, options?: HttpRequestOptions): Promise<AsyncIterable<Uint8Array>>;
  streamLines(url: string | URL, options?: HttpRequestOptions): Promise<AsyncIterable<string>>;
  streamEvents(
    url: string | URL,
    options?: HttpRequestOptions,
  ): Promise<AsyncIterable<ServerSentEvent>>;
  streamJsonEvents<T = unknown>(
    url: string | URL,
    options?: HttpRequestOptions,
  ): Promise<AsyncIterable<JsonServerSentEvent<T>>>;

  extend(childConfig: HttpClientConfig): HttpClient;
}
