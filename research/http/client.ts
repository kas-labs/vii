/**
 * Vii HTTP Client & Transport Research — Client Factory (H1-H2 Baseline)
 *
 * Research Prototype: Not a production package.
 */

import { mergeHeaders } from "./headers.js";
import { composeMiddleware } from "./pipeline.js";
import type {
  HttpClient,
  HttpClientConfig,
  HttpHandler,
  HttpRequestContext,
  HttpRequestOptions,
} from "./types.js";
import { resolveUrl } from "./url.js";

class HttpClientImpl implements HttpClient {
  readonly config: Readonly<HttpClientConfig>;

  constructor(config: HttpClientConfig = {}) {
    const frozenConfig: HttpClientConfig = {
      ...(config.baseURL !== undefined ? { baseURL: config.baseURL } : {}),
      ...(config.headers !== undefined ? { headers: mergeHeaders(config.headers) } : {}),
      ...(config.fetch !== undefined ? { fetch: config.fetch } : {}),
      ...(config.middleware !== undefined
        ? { middleware: Object.freeze([...config.middleware]) }
        : {}),
    };
    this.config = Object.freeze(frozenConfig);
  }

  async request(url: string | URL, options: HttpRequestOptions = {}): Promise<Response> {
    const resolvedUrl = resolveUrl(url, this.config.baseURL, options.query);
    const headers = mergeHeaders(this.config.headers, options.headers);
    const fetchFn = options.fetch ?? this.config.fetch ?? globalThis.fetch;

    const method = options.method ?? "GET";
    const init: RequestInit = {
      method,
      headers,
    };

    if (options.body !== undefined && options.body !== null) {
      init.body = options.body;
    }
    if (options.signal !== undefined) {
      init.signal = options.signal;
    }
    if (options.cache !== undefined) {
      init.cache = options.cache;
    }
    if (options.credentials !== undefined) {
      init.credentials = options.credentials;
    }
    if (options.integrity !== undefined) {
      init.integrity = options.integrity;
    }
    if (options.keepalive !== undefined) {
      init.keepalive = options.keepalive;
    }
    if (options.mode !== undefined) {
      init.mode = options.mode;
    }
    if (options.redirect !== undefined) {
      init.redirect = options.redirect;
    }
    if (options.referrer !== undefined) {
      init.referrer = options.referrer;
    }
    if (options.referrerPolicy !== undefined) {
      init.referrerPolicy = options.referrerPolicy;
    }

    const request = new Request(resolvedUrl, init);
    const context: HttpRequestContext = options.context ?? {};
    const activeMiddleware = [...(this.config.middleware ?? []), ...(options.middleware ?? [])];

    const transport: HttpHandler = (req) => {
      return fetchFn(req.url, req);
    };

    const handler = composeMiddleware(transport, activeMiddleware, context);
    return handler(request);
  }

  get(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response> {
    return this.request(url, { ...options, method: "GET" });
  }

  post(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response> {
    return this.request(url, { ...options, method: "POST" });
  }

  put(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response> {
    return this.request(url, { ...options, method: "PUT" });
  }

  patch(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response> {
    return this.request(url, { ...options, method: "PATCH" });
  }

  delete(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response> {
    return this.request(url, { ...options, method: "DELETE" });
  }

  head(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response> {
    return this.request(url, { ...options, method: "HEAD" });
  }

  options(url: string | URL, options?: Omit<HttpRequestOptions, "method">): Promise<Response> {
    return this.request(url, { ...options, method: "OPTIONS" });
  }

  extend(childConfig: HttpClientConfig): HttpClient {
    const mergedBaseURL =
      childConfig.baseURL !== undefined
        ? resolveUrl(childConfig.baseURL, this.config.baseURL)
        : this.config.baseURL;

    const mergedHeaders = mergeHeaders(this.config.headers, childConfig.headers);
    const mergedFetch = childConfig.fetch ?? this.config.fetch;
    const mergedMiddleware = [...(this.config.middleware ?? []), ...(childConfig.middleware ?? [])];

    const childOptions: HttpClientConfig = {
      headers: mergedHeaders,
      ...(mergedBaseURL !== undefined ? { baseURL: mergedBaseURL } : {}),
      ...(mergedFetch !== undefined ? { fetch: mergedFetch } : {}),
      ...(mergedMiddleware.length > 0 ? { middleware: mergedMiddleware } : {}),
    };

    return new HttpClientImpl(childOptions);
  }
}

/**
 * Create an isolated, immutable HTTP client instance.
 */
export function createHttpClient(config?: HttpClientConfig): HttpClient {
  return new HttpClientImpl(config);
}
