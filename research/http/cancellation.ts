/**
 * Vii HTTP Client & Transport Research — Cancellation & Timeout (H3 Baseline)
 *
 * Research Prototype: Not a production package.
 */

export class TimeoutError extends Error {
  override readonly name = "TimeoutError" as const;

  constructor(message = "Request timed out", options?: ErrorOptions) {
    super(message, options);
  }
}

export class AbortError extends Error {
  override readonly name = "AbortError" as const;

  constructor(message = "The operation was aborted", options?: ErrorOptions) {
    super(message, options);
  }
}

/**
 * Check if an error represents a request timeout.
 */
export function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  if (error instanceof TimeoutError) {
    return true;
  }
  if ("name" in error && error.name === "TimeoutError") {
    return true;
  }
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return true;
  }
  return false;
}

/**
 * Check if an error represents a user or scope-initiated abort.
 */
export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  if (isTimeoutError(error)) {
    return false;
  }
  if (error instanceof AbortError) {
    return true;
  }
  if ("name" in error && (error.name === "AbortError" || error.name === "CanceledError")) {
    return true;
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  return false;
}

export interface SignalBinding {
  readonly signal: AbortSignal;
  readonly cleanup: () => void;
}

/**
 * Create a timeout signal that aborts with TimeoutError when deadline is exceeded.
 */
export function createTimeoutSignal(ms: number): SignalBinding {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new TimeoutError(`Request timed out after ${ms}ms`));
  }, ms);

  const cleanup = () => {
    clearTimeout(timeoutId);
  };

  return {
    signal: controller.signal,
    cleanup,
  };
}

export interface ScopeLike {
  readonly onDispose?: (fn: () => void) => () => void;
  readonly signal?: AbortSignal;
}

/**
 * Bind an optional Vii Scope lifecycle to an AbortSignal.
 */
export function bindScopeSignal(scope?: ScopeLike): SignalBinding | undefined {
  if (!scope) {
    return undefined;
  }

  if (scope.signal) {
    return {
      signal: scope.signal,
      cleanup: () => {},
    };
  }

  if (typeof scope.onDispose === "function") {
    const controller = new AbortController();
    const unregister = scope.onDispose(() => {
      controller.abort(new AbortError("Scope disposed"));
    });

    return {
      signal: controller.signal,
      cleanup: unregister,
    };
  }

  return undefined;
}

/**
 * Compose multiple optional AbortSignals into a single managed signal.
 * Ensures listener cleanup on resolution to avoid leaks on long-lived signals.
 */
export function composeSignals(
  signals: readonly (AbortSignal | null | undefined)[],
): SignalBinding | undefined {
  const validSignals = signals.filter((s): s is AbortSignal => s !== null && s !== undefined);

  if (validSignals.length === 0) {
    return undefined;
  }

  if (validSignals.length === 1) {
    return {
      signal: validSignals[0]!,
      cleanup: () => {},
    };
  }

  // If any signal is already aborted, return it immediately
  const alreadyAborted = validSignals.find((s) => s.aborted);
  if (alreadyAborted) {
    return {
      signal: alreadyAborted,
      cleanup: () => {},
    };
  }

  const controller = new AbortController();
  const listeners: Array<[AbortSignal, () => void]> = [];

  const onAbort = (s: AbortSignal) => {
    controller.abort(s.reason);
    cleanup();
  };

  for (const sig of validSignals) {
    const listener = () => onAbort(sig);
    sig.addEventListener("abort", listener, { once: true });
    listeners.push([sig, listener]);
  }

  const cleanup = () => {
    for (const [sig, listener] of listeners) {
      sig.removeEventListener("abort", listener);
    }
    listeners.length = 0;
  };

  return {
    signal: controller.signal,
    cleanup,
  };
}
