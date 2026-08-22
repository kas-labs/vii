/**
 * Vii HTTP Client & Transport Research — Headers Merging (H1 Baseline)
 *
 * Research Prototype: Not a production package.
 */

import type { ExtendedHeadersInit } from "./types.js";

/**
 * Merge default headers and per-request headers deterministically.
 * Request headers override default headers.
 * Setting a header to null or undefined removes it.
 */
export function mergeHeaders(
  defaultHeaders?: ExtendedHeadersInit | undefined,
  requestHeaders?: ExtendedHeadersInit | undefined,
): Headers {
  const result = new Headers();

  if (defaultHeaders) {
    applyHeaders(result, defaultHeaders);
  }

  if (requestHeaders) {
    applyHeaders(result, requestHeaders);
  }

  return result;
}

function applyHeaders(target: Headers, source: ExtendedHeadersInit): void {
  if (source instanceof Headers) {
    source.forEach((value, key) => {
      target.set(key, value);
    });
    return;
  }

  if (Array.isArray(source)) {
    for (const [key, value] of source) {
      if (value === undefined || value === null) {
        target.delete(key);
      } else {
        target.set(key, String(value));
      }
    }
    return;
  }

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) {
      target.delete(key);
    } else {
      target.set(key, String(value));
    }
  }
}
