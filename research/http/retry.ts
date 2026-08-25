/**
 * Vii HTTP Client & Transport Research — Retry & Idempotency Engine (H5 Baseline)
 *
 * Research Prototype: Not a production package.
 */

import { isAbortError, isTimeoutError } from "./cancellation.js";
import { HttpError, isHttpStatusError, isNetworkError } from "./errors.js";
import type { HttpHandler, HttpMethod, HttpRequestContext } from "./types.js";

export interface RetryPolicy {
  readonly maxRetries?: number | undefined;
  readonly backoffBaseMs?: number | undefined;
  readonly backoffMaxMs?: number | undefined;
  readonly jitter?: boolean | undefined;
  readonly retryOnStatus?: readonly number[] | undefined;
  readonly retryOnNetworkError?: boolean | undefined;
  readonly retryOnMethods?: readonly HttpMethod[] | undefined;
  readonly retryCondition?: (
    error: unknown,
    attempt: number,
    request: Request,
  ) => boolean | Promise<boolean>;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BACKOFF_BASE_MS = 200;
const DEFAULT_BACKOFF_MAX_MS = 10000;
const DEFAULT_RETRY_STATUSES: readonly number[] = [408, 429, 500, 502, 503, 504];
const DEFAULT_IDEMPOTENT_METHODS: readonly HttpMethod[] = [
  "GET",
  "HEAD",
  "PUT",
  "DELETE",
  "OPTIONS",
];

/**
 * Parse standard HTTP Retry-After header into milliseconds delay.
 * Supports both delta-seconds (RFC 9110) and HTTP-Date format.
 */
export function parseRetryAfter(
  headerValue: string | null | undefined,
  now = Date.now(),
): number | undefined {
  if (!headerValue || typeof headerValue !== "string") {
    return undefined;
  }

  const trimmed = headerValue.trim();
  if (/^\d+$/.test(trimmed)) {
    const seconds = parseInt(trimmed, 10);
    if (!Number.isFinite(seconds) || seconds < 0) {
      return undefined;
    }
    return seconds * 1000;
  }

  const parsedDate = Date.parse(trimmed);
  if (!Number.isNaN(parsedDate) && Number.isFinite(parsedDate)) {
    return Math.max(0, parsedDate - now);
  }

  return undefined;
}

/**
 * Calculate exponential backoff with optional full jitter.
 */
export function calculateBackoff(
  attempt: number,
  policy: RetryPolicy = {},
  randomFn = Math.random,
): number {
  const base = policy.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;
  const max = policy.backoffMaxMs ?? DEFAULT_BACKOFF_MAX_MS;
  const exponential = Math.min(max, base * 2 ** Math.max(0, attempt - 1));

  if (policy.jitter === false) {
    return exponential;
  }

  return Math.round(randomFn() * exponential);
}

function sleepWithSignal(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Normalize boolean or number shorthand into a full RetryPolicy.
 */
export function normalizeRetryPolicy(
  policy?: RetryPolicy | number | boolean,
): RetryPolicy | undefined {
  if (policy === false || policy === undefined) {
    return undefined;
  }
  if (policy === true) {
    return { maxRetries: DEFAULT_MAX_RETRIES };
  }
  if (typeof policy === "number") {
    return { maxRetries: Math.max(0, policy) };
  }
  return policy;
}

// Cancels a response body that is being replaced by a retry attempt so the
// underlying connection is released instead of held open until GC. Same
// rationale as the redirect-hop drain in client.ts.
async function drainReplacedResponse(response: Response): Promise<void> {
  if (!response.body || response.bodyUsed) return;
  try {
    await response.body.cancel();
  } catch {
    // Ignored: draining is best-effort cleanup, not a correctness requirement.
  }
}

/**
 * Execute an HttpHandler pipeline with explicit opt-in retry policy.
 */
export async function executeWithRetry(
  request: Request,
  handler: HttpHandler,
  context: HttpRequestContext,
  configPolicy?: RetryPolicy | number | boolean,
  bodySource?: unknown,
): Promise<Response> {
  const policy = normalizeRetryPolicy(configPolicy);
  if (!policy) {
    return handler(request);
  }

  const maxRetries = policy.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryStatuses = policy.retryOnStatus ?? DEFAULT_RETRY_STATUSES;
  const retryMethods = policy.retryOnMethods ?? DEFAULT_IDEMPOTENT_METHODS;
  const retryOnNetwork = policy.retryOnNetworkError ?? true;
  const maxBackoff = policy.backoffMaxMs ?? DEFAULT_BACKOFF_MAX_MS;

  let attempt = 0;

  while (true) {
    attempt++;
    context["retryAttempt"] = attempt;

    let attemptRequest: Request;
    if (request.body === null) {
      attemptRequest = request.clone();
    } else {
      if (request.bodyUsed) {
        throw new HttpError("Cannot retry request with already consumed body", {
          cause: undefined,
        });
      }
      if (
        bodySource !== undefined &&
        bodySource !== null &&
        typeof bodySource === "object" &&
        typeof (bodySource as ReadableStream).getReader === "function"
      ) {
        throw new HttpError("Cannot retry request with non-replayable stream body", {
          cause: undefined,
        });
      }
      attemptRequest = request.clone();
    }

    try {
      const response = await handler(attemptRequest);

      if (!response.ok && attempt <= maxRetries) {
        const method = request.method.toUpperCase() as HttpMethod;
        const isMethodAllowed = retryMethods.includes(method);

        let isEligible = isMethodAllowed && retryStatuses.includes(response.status);

        if (isEligible && policy.retryCondition) {
          isEligible = await policy.retryCondition(response, attempt, request);
        }

        if (isEligible) {
          const retryAfterHeader = response.headers.get("retry-after");
          const serverDelay = parseRetryAfter(retryAfterHeader);
          const delay =
            serverDelay !== undefined
              ? Math.min(maxBackoff, Math.max(0, serverDelay))
              : calculateBackoff(attempt, policy);

          await drainReplacedResponse(response);
          await sleepWithSignal(delay, request.signal);
          continue;
        }
      }

      return response;
    } catch (err) {
      if (isAbortError(err) || isTimeoutError(err)) {
        throw err;
      }

      if (attempt <= maxRetries) {
        const method = request.method.toUpperCase() as HttpMethod;
        const isMethodAllowed = retryMethods.includes(method);

        let isEligible = isMethodAllowed && (isNetworkError(err) || retryOnNetwork);
        if (isHttpStatusError(err)) {
          isEligible = isMethodAllowed && retryStatuses.includes(err.status);
        }

        if (isEligible && policy.retryCondition) {
          isEligible = await policy.retryCondition(err, attempt, request);
        }

        if (isEligible) {
          const delay = calculateBackoff(attempt, policy);
          await sleepWithSignal(delay, request.signal);
          continue;
        }
      }

      throw err;
    }
  }
}
