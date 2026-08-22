/**
 * Vii HTTP Client & Transport Research — Types (H1-H2 Baseline)
 *
 * Research Prototype: Not a production package.
 */

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

export interface HttpRequestOptions extends Omit<
  RequestInit,
  "headers" | "method" | "body" | "signal"
> {
  readonly method?: HttpMethod | (string & {}) | undefined;
  readonly headers?: ExtendedHeadersInit | undefined;
  readonly query?: QueryParams | undefined;
  readonly body?: BodyInit | null | undefined;
  readonly signal?: AbortSignal | null | undefined;
  readonly fetch?: typeof globalThis.fetch | undefined;
  readonly context?: HttpRequestContext | undefined;
  readonly middleware?: readonly HttpMiddleware[] | undefined;
}

export interface HttpClientConfig {
  readonly baseURL?: string | URL | undefined;
  readonly headers?: ExtendedHeadersInit | undefined;
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

  extend(childConfig: HttpClientConfig): HttpClient;
}
