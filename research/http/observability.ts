/**
 * Vii HTTP Client & Transport Research — Observability, Tracing & Metrics (H8 Baseline)
 *
 * Research Prototype: Not a production package.
 */

import type { HttpRequestContext } from "./types.js";

export const DEFAULT_REDACTED_PARAMS: readonly string[] = [
  "token",
  "password",
  "secret",
  "key",
  "api_key",
  "apikey",
  "access_token",
  "auth",
];

export const DEFAULT_REDACTED_HEADERS: readonly string[] = [
  "authorization",
  "cookie",
  "proxy-authorization",
  "x-api-key",
  "x-auth-token",
  "set-cookie",
];

export interface HttpRequestTiming {
  readonly startTime: number;
  readonly durationMs: number;
}

export interface HttpRequestStartEvent {
  readonly request: Request;
  readonly context: HttpRequestContext;
  readonly timestamp: number;
  readonly traceId?: string | undefined;
  readonly spanId?: string | undefined;
}

export interface HttpResponseSuccessEvent {
  readonly request: Request;
  readonly response: Response;
  readonly context: HttpRequestContext;
  readonly timing: HttpRequestTiming;
  readonly traceId?: string | undefined;
  readonly spanId?: string | undefined;
}

export interface HttpResponseErrorEvent {
  readonly request: Request;
  readonly error: unknown;
  readonly context: HttpRequestContext;
  readonly timing: HttpRequestTiming;
  readonly traceId?: string | undefined;
  readonly spanId?: string | undefined;
}

export interface TelemetryConfig {
  readonly traceContext?:
    | boolean
    | {
        readonly traceId?: string | undefined;
        readonly spanId?: string | undefined;
        readonly sampled?: boolean | undefined;
      }
    | undefined;
  readonly redactHeaders?: readonly string[] | undefined;
  readonly redactQueryParams?: readonly string[] | undefined;
  readonly onRequest?: ((event: HttpRequestStartEvent) => void | Promise<void>) | undefined;
  readonly onResponse?: ((event: HttpResponseSuccessEvent) => void | Promise<void>) | undefined;
  readonly onError?: ((event: HttpResponseErrorEvent) => void | Promise<void>) | undefined;
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a 16-byte (32 hex character) W3C trace ID.
 */
export function generateTraceId(): string {
  return randomHex(16);
}

/**
 * Generate an 8-byte (16 hex character) W3C span ID.
 */
export function generateSpanId(): string {
  return randomHex(8);
}

/**
 * Format a W3C Trace Context traceparent header: 00-{trace_id}-{parent_id}-{flags}.
 */
export function formatTraceparent(
  traceId = generateTraceId(),
  spanId = generateSpanId(),
  sampled = true,
): string {
  const flags = sampled ? "01" : "00";
  return `00-${traceId}-${spanId}-${flags}`;
}

/**
 * Parse a standard W3C traceparent header.
 */
export function parseTraceparent(
  header?: string | null,
): { version: string; traceId: string; spanId: string; sampled: boolean } | null {
  if (!header || typeof header !== "string") {
    return null;
  }

  const parts = header.trim().split("-");
  if (parts.length !== 4) {
    return null;
  }

  const [version, traceId, spanId, flags] = parts;
  if (!version || !traceId || !spanId || !flags) {
    return null;
  }

  if (version !== "00" || traceId.length !== 32 || spanId.length !== 16 || flags.length !== 2) {
    return null;
  }

  return {
    version,
    traceId,
    spanId,
    sampled: flags === "01",
  };
}

/**
 * Redact sensitive query parameters from a URL string.
 */
export function redactUrl(
  url: string | URL,
  sensitiveParams: readonly string[] = DEFAULT_REDACTED_PARAMS,
): string {
  const parsed = typeof url === "string" ? new URL(url, "https://vii.local") : new URL(url.href);
  const sensitiveSet = new Set(sensitiveParams.map((p) => p.toLowerCase()));

  for (const key of Array.from(parsed.searchParams.keys())) {
    if (sensitiveSet.has(key.toLowerCase())) {
      parsed.searchParams.set(key, "[REDACTED]");
    }
  }

  return parsed.href;
}

/**
 * Redact sensitive headers into a clean Record map for structured logging.
 */
export function redactHeaders(
  headersInit: HeadersInit,
  sensitiveHeaders: readonly string[] = DEFAULT_REDACTED_HEADERS,
): Record<string, string> {
  const headers = new Headers(headersInit);
  const sensitiveSet = new Set(sensitiveHeaders.map((h) => h.toLowerCase()));
  const result: Record<string, string> = {};

  headers.forEach((value, key) => {
    if (sensitiveSet.has(key.toLowerCase())) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = value;
    }
  });

  return result;
}
