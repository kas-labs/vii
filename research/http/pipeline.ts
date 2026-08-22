/**
 * Vii HTTP Client & Transport Research — Middleware Pipeline (H2 Baseline)
 *
 * Research Prototype: Not a production package.
 */

import type { HttpHandler, HttpMiddleware, HttpRequestContext } from "./types.js";

/**
 * Compose a list of functional middleware into a single onion-style HttpHandler.
 * Enforces strict single-invocation of next() and preserves error propagation.
 */
export function composeMiddleware(
  transport: HttpHandler,
  middleware: readonly HttpMiddleware[],
  context: HttpRequestContext,
): HttpHandler {
  if (middleware.length === 0) {
    return transport;
  }

  return function composedHandler(initialRequest: Request): Promise<Response> {
    let lastIndex = -1;

    function dispatch(index: number, currentRequest: Request): Promise<Response> {
      if (index <= lastIndex) {
        return Promise.reject(new Error("next() called multiple times in middleware"));
      }

      lastIndex = index;

      if (index === middleware.length) {
        return transport(currentRequest);
      }

      const fn = middleware[index];
      if (!fn) {
        return transport(currentRequest);
      }

      try {
        const next: HttpHandler = (nextRequest?: Request) => {
          return dispatch(index + 1, nextRequest ?? currentRequest);
        };
        return Promise.resolve(fn(currentRequest, next, context));
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return dispatch(0, initialRequest);
  };
}
