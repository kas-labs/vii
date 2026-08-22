/**
 * Vii HTTP Client & Transport Research — URL Resolution (H1 Baseline)
 *
 * Research Prototype: Not a production package.
 */

import type { QueryParams, QueryParamValue } from "./types.js";

const ABSOLUTE_URL_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*?:/;

/**
 * Check if a URL string is absolute (has scheme like http://, https://, etc.).
 */
export function isAbsoluteUrl(url: string): boolean {
  return ABSOLUTE_URL_REGEX.test(url);
}

/**
 * Serialize QueryParams into a standard URLSearchParams object.
 */
export function serializeQueryParams(params: QueryParams): URLSearchParams {
  if (params instanceof URLSearchParams) {
    return new URLSearchParams(params);
  }

  if (Array.isArray(params)) {
    return new URLSearchParams(params as [string, string][]);
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value as readonly QueryParamValue[]) {
        if (item !== undefined && item !== null) {
          searchParams.append(key, String(item));
        }
      }
    } else {
      searchParams.append(key, String(value));
    }
  }

  return searchParams;
}

/**
 * Combine baseURL and relative path following REST client conventions.
 */
function joinPaths(baseURL: string, relativePath: string): string {
  const cleanBase = baseURL.replace(/\/+$/, "");
  const cleanPath = relativePath.replace(/^\/+/, "");

  if (!cleanPath) {
    return baseURL.includes("://") && !cleanBase.includes("/", cleanBase.indexOf("://") + 3)
      ? `${cleanBase}/`
      : cleanBase || "/";
  }

  return `${cleanBase}/${cleanPath}`;
}

/**
 * Resolve an input URL against an optional baseURL and append query parameters.
 */
export function resolveUrl(
  inputUrl: string | URL,
  baseURL?: string | URL,
  query?: QueryParams,
): string {
  const inputStr = inputUrl instanceof URL ? inputUrl.toString() : String(inputUrl);
  const baseStr =
    baseURL instanceof URL ? baseURL.toString() : baseURL ? String(baseURL) : undefined;

  let combinedUrl: string;

  if (isAbsoluteUrl(inputStr)) {
    combinedUrl = inputStr;
  } else if (baseStr) {
    combinedUrl = joinPaths(baseStr, inputStr);
  } else {
    combinedUrl = inputStr;
  }

  if (!query) {
    return combinedUrl;
  }

  const queryParams = serializeQueryParams(query);
  const queryString = queryParams.toString();

  if (!queryString) {
    return combinedUrl;
  }

  const separator = combinedUrl.includes("?") ? "&" : "?";
  return `${combinedUrl}${separator}${queryString}`;
}
