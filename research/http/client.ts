/**
 * Vii HTTP Client & Transport Research — Client Factory (H1 Baseline)
 *
 * Research Prototype: Not a production package.
 */

import { mergeHeaders } from "./headers.js";
import type { HttpClient, HttpClientConfig, HttpRequestOptions } from "./types.js";
import { resolveUrl } from "./url.js";

class HttpClientImpl implements HttpClient {
  readonly config: Readonly<HttpClientConfig>;

  constructor(config: HttpClientConfig = {}) {
    const frozenConfig: HttpClientConfig = {
      ...(config.baseURL !== undefined ? { baseURL: config.baseURL } : {}),
      ...(config.headers !== undefined ? { headers: mergeHeaders(config.headers) } : {}),
      ...(config.fetch !== undefined ? { fetch: config.fetch } : {}),
    };
    this.config = Object.freeze(frozenConfig);
  }

  async request(url: string | URL, options: HttpRequestOptions = {}): Promise<Response> {
    const resolvedUrl = resolveUrl(url, this.config.baseURL, options.query);
    const headers = mergeHeaders(this.config.headers, options.headers);
    const fetchFn = options.fetch ?? this.config.fetch ?? globalThis.fetch;

    const init: RequestInit = {
      method: options.method ?? "GET",
      headers,
    };

    if (options.body !== undefined) {
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

    return fetchFn(resolvedUrl, init);
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

    const childOptions: HttpClientConfig = {
      headers: mergedHeaders,
      ...(mergedBaseURL !== undefined ? { baseURL: mergedBaseURL } : {}),
      ...(mergedFetch !== undefined ? { fetch: mergedFetch } : {}),
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
