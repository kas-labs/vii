/**
 * Vii HTTP Client & Transport Research — Client Factory (H1-H7 Baseline)
 *
 * Research Prototype: Not a production package.
 */

import {
  bindScopeSignal,
  composeSignals,
  createTimeoutSignal,
  isAbortError,
  isTimeoutError,
} from "./cancellation.js";
import { HttpError, HttpParseError, HttpStatusError, NetworkError } from "./errors.js";
import { mergeHeaders } from "./headers.js";
import { composeMiddleware } from "./pipeline.js";
import { executeWithRetry } from "./retry.js";
import { validatePayload } from "./schema.js";
import { validateUrlSecurity } from "./security.js";
import {
  iterateLines,
  iterateStream,
  parseEventStream,
  parseJsonEventStream,
  type JsonServerSentEvent,
  type ServerSentEvent,
} from "./streaming.js";
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
      ...(config.timeout !== undefined ? { timeout: config.timeout } : {}),
      ...(config.retry !== undefined ? { retry: config.retry } : {}),
      ...(config.security !== undefined ? { security: config.security } : {}),
      ...(config.throwOnError !== undefined ? { throwOnError: config.throwOnError } : {}),
      ...(config.fetch !== undefined ? { fetch: config.fetch } : {}),
      ...(config.middleware !== undefined
        ? { middleware: Object.freeze([...config.middleware]) }
        : {}),
    };
    this.config = Object.freeze(frozenConfig);
  }

  async request(url: string | URL, options: HttpRequestOptions = {}): Promise<Response> {
    const resolvedUrl = resolveUrl(url, this.config.baseURL, options.query);
    const effectiveSecurity = options.security ?? this.config.security;
    validateUrlSecurity(resolvedUrl, effectiveSecurity);

    const headers = mergeHeaders(this.config.headers, options.headers);
    const fetchFn = options.fetch ?? this.config.fetch ?? globalThis.fetch;

    const effectiveTimeout = options.timeout ?? this.config.timeout;
    const timeoutBinding =
      effectiveTimeout !== undefined && effectiveTimeout > 0
        ? createTimeoutSignal(effectiveTimeout)
        : undefined;

    const scopeBinding = bindScopeSignal(options.scope);

    const composedBinding = composeSignals([
      options.signal,
      timeoutBinding?.signal,
      scopeBinding?.signal,
    ]);

    const activeSignal = composedBinding?.signal ?? options.signal;

    const method = options.method ?? "GET";
    const init: RequestInit = {
      method,
      headers,
    };

    if (options.body !== undefined && options.body !== null) {
      init.body = options.body;
    }
    if (activeSignal !== undefined) {
      init.signal = activeSignal;
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
    const effectiveRetry = options.retry ?? this.config.retry;

    const activeMiddleware = [...(this.config.middleware ?? []), ...(options.middleware ?? [])];

    const transport: HttpHandler = async (req) => {
      try {
        return await fetchFn(req.url, req);
      } catch (err) {
        if (isAbortError(err) || isTimeoutError(err)) {
          throw err;
        }
        throw new NetworkError(err instanceof Error ? err.message : "Network request failed", {
          request: req,
          cause: err,
        });
      }
    };

    const handler = composeMiddleware(transport, activeMiddleware, context);

    let response: Response;
    try {
      response = await executeWithRetry(request, handler, context, effectiveRetry);
    } finally {
      timeoutBinding?.cleanup();
      scopeBinding?.cleanup();
      composedBinding?.cleanup();
    }

    const shouldThrow = options.throwOnError ?? this.config.throwOnError ?? false;
    if (shouldThrow && !response.ok) {
      let errorData: unknown;
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = text;
        }
      } catch {
        errorData = undefined;
      }

      throw new HttpStatusError(`HTTP ${response.status} ${response.statusText || "Error"}`, {
        status: response.status,
        statusText: response.statusText,
        response,
        request,
        data: errorData,
      });
    }

    return response;
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

  async requestJson<T = unknown>(
    url: string | URL,
    options: HttpRequestOptions<T> = {},
  ): Promise<T> {
    const jsonHeaders = mergeHeaders({ Accept: "application/json" }, options.headers);
    const resolvedOptions: HttpRequestOptions<T> = {
      ...options,
      headers: jsonHeaders,
      throwOnError: options.throwOnError ?? true,
    };

    const response = await this.request(url, resolvedOptions);
    const rawText = await response.text();

    if (response.status === 204 || rawText.trim() === "") {
      if (options.schema) {
        const dummyRequest = new Request(resolveUrl(url, this.config.baseURL, options.query));
        return validatePayload(options.schema, undefined, response, dummyRequest);
      }
      return undefined as T;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch (err) {
      const dummyRequest = new Request(resolveUrl(url, this.config.baseURL, options.query));
      throw new HttpParseError("Failed to parse response body as JSON", {
        response,
        request: dummyRequest,
        rawText,
        cause: err,
      });
    }

    if (options.schema) {
      const dummyRequest = new Request(resolveUrl(url, this.config.baseURL, options.query));
      return validatePayload(options.schema, parsed, response, dummyRequest);
    }

    return parsed as T;
  }

  getJson<T = unknown>(
    url: string | URL,
    options?: Omit<HttpRequestOptions<T>, "method">,
  ): Promise<T> {
    return this.requestJson<T>(url, { ...options, method: "GET" });
  }

  postJson<T = unknown>(
    url: string | URL,
    options?: Omit<HttpRequestOptions<T>, "method">,
  ): Promise<T> {
    return this.requestJson<T>(url, { ...options, method: "POST" });
  }

  putJson<T = unknown>(
    url: string | URL,
    options?: Omit<HttpRequestOptions<T>, "method">,
  ): Promise<T> {
    return this.requestJson<T>(url, { ...options, method: "PUT" });
  }

  patchJson<T = unknown>(
    url: string | URL,
    options?: Omit<HttpRequestOptions<T>, "method">,
  ): Promise<T> {
    return this.requestJson<T>(url, { ...options, method: "PATCH" });
  }

  deleteJson<T = unknown>(
    url: string | URL,
    options?: Omit<HttpRequestOptions<T>, "method">,
  ): Promise<T> {
    return this.requestJson<T>(url, { ...options, method: "DELETE" });
  }

  async stream(
    url: string | URL,
    options: HttpRequestOptions = {},
  ): Promise<AsyncIterable<Uint8Array>> {
    const response = await this.request(url, {
      ...options,
      throwOnError: options.throwOnError ?? true,
    });
    if (!response.body) {
      throw new HttpError("Response has no body to stream");
    }
    return iterateStream(response.body);
  }

  async streamLines(
    url: string | URL,
    options: HttpRequestOptions = {},
  ): Promise<AsyncIterable<string>> {
    const response = await this.request(url, {
      ...options,
      throwOnError: options.throwOnError ?? true,
    });
    if (!response.body) {
      throw new HttpError("Response has no body to stream");
    }
    return iterateLines(response.body);
  }

  async streamEvents(
    url: string | URL,
    options: HttpRequestOptions = {},
  ): Promise<AsyncIterable<ServerSentEvent>> {
    const sseHeaders = mergeHeaders({ Accept: "text/event-stream" }, options.headers);
    const response = await this.request(url, {
      ...options,
      headers: sseHeaders,
      throwOnError: options.throwOnError ?? true,
    });
    if (!response.body) {
      throw new HttpError("Response has no body to stream");
    }
    return parseEventStream(response.body);
  }

  async streamJsonEvents<T = unknown>(
    url: string | URL,
    options: HttpRequestOptions = {},
  ): Promise<AsyncIterable<JsonServerSentEvent<T>>> {
    const sseHeaders = mergeHeaders({ Accept: "text/event-stream" }, options.headers);
    const response = await this.request(url, {
      ...options,
      headers: sseHeaders,
      throwOnError: options.throwOnError ?? true,
    });
    if (!response.body) {
      throw new HttpError("Response has no body to stream");
    }
    return parseJsonEventStream<T>(response.body);
  }

  extend(childConfig: HttpClientConfig): HttpClient {
    const mergedBaseURL =
      childConfig.baseURL !== undefined
        ? resolveUrl(childConfig.baseURL, this.config.baseURL)
        : this.config.baseURL;

    const mergedHeaders = mergeHeaders(this.config.headers, childConfig.headers);
    const mergedTimeout = childConfig.timeout ?? this.config.timeout;
    const mergedRetry = childConfig.retry ?? this.config.retry;
    const mergedSecurity = childConfig.security ?? this.config.security;
    const mergedThrowOnError = childConfig.throwOnError ?? this.config.throwOnError;
    const mergedFetch = childConfig.fetch ?? this.config.fetch;
    const mergedMiddleware = [...(this.config.middleware ?? []), ...(childConfig.middleware ?? [])];

    const childOptions: HttpClientConfig = {
      headers: mergedHeaders,
      ...(mergedBaseURL !== undefined ? { baseURL: mergedBaseURL } : {}),
      ...(mergedTimeout !== undefined ? { timeout: mergedTimeout } : {}),
      ...(mergedRetry !== undefined ? { retry: mergedRetry } : {}),
      ...(mergedSecurity !== undefined ? { security: mergedSecurity } : {}),
      ...(mergedThrowOnError !== undefined ? { throwOnError: mergedThrowOnError } : {}),
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
