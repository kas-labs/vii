/**
 * Vii HTTP Client & Transport Research — SSR Security & SSRF Defenses (H7 Baseline)
 *
 * Research Prototype: Not a production package.
 */

import { HttpSecurityError } from "./errors.js";

export interface SecurityPolicy {
  readonly allowPrivateNetworks?: boolean | undefined;
  readonly allowedHosts?: readonly (string | RegExp)[] | undefined;
  readonly blockedHosts?: readonly (string | RegExp)[] | undefined;
  readonly stripHeadersOnRedirect?: readonly string[] | undefined;
}

export const DEFAULT_SENSITIVE_HEADERS: readonly string[] = [
  "authorization",
  "cookie",
  "proxy-authorization",
  "x-api-key",
  "x-auth-token",
];

const RESTRICTED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "metadata.google.internal",
  "instance-data",
]);

/**
 * Check if an IPv4 address is in a private, loopback, or link-local range.
 * RFC 1918, RFC 3927, RFC 1122, RFC 5735.
 */
export function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [p0, p1] = parts as [number, number, number, number];

  // 0.0.0.0/8 (Current network)
  if (p0 === 0) return true;

  // 10.0.0.0/8 (Private-Use)
  if (p0 === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (p0 === 127) return true;

  // 169.254.0.0/16 (Link-Local / Cloud Metadata e.g. 169.254.169.254)
  if (p0 === 169 && p1 === 254) return true;

  // 172.16.0.0/12 (Private-Use 172.16.0.0 - 172.31.255.255)
  if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;

  // 192.168.0.0/16 (Private-Use)
  if (p0 === 192 && p1 === 168) return true;

  // 100.64.0.0/10 (Carrier-Grade NAT)
  if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;

  return false;
}

/**
 * Check if an IPv6 address is in a private, loopback, or unique-local range.
 */
export function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^\[|\]$/g, "");

  if (normalized === "::1" || normalized === "::") {
    return true;
  }

  // fe80::/10 (Link-Local)
  if (
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  // fc00::/7 (Unique Local Address fc00:: - fdff::)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  // IPv4-mapped IPv6 ::ffff:127.0.0.1
  if (normalized.startsWith("::ffff:")) {
    const ipv4 = normalized.slice(7);
    return isPrivateIpv4(ipv4);
  }

  return false;
}

/**
 * Check if a hostname/IP is a restricted local or private target.
 */
export function isPrivateOrRestrictedHost(host: string): boolean {
  const hostname = host.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    RESTRICTED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local")
  ) {
    return true;
  }

  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return isPrivateIpv4(hostname);
  }

  if (hostname.includes(":")) {
    return isPrivateIpv6(hostname);
  }

  return false;
}

function matchesHostPattern(hostname: string, pattern: string | RegExp): boolean {
  if (pattern instanceof RegExp) {
    return pattern.test(hostname);
  }
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1); // e.g. .example.com
    return hostname.endsWith(suffix) || hostname === pattern.slice(2);
  }
  return hostname.toLowerCase() === pattern.toLowerCase();
}

/**
 * Validate target URL against security and SSRF protection policy.
 */
export function validateUrlSecurity(url: string | URL, policy?: SecurityPolicy): void {
  if (!policy) {
    return;
  }

  let parsed: URL;
  try {
    parsed = typeof url === "string" ? new URL(url, "https://vii.internal") : url;
  } catch {
    throw new HttpSecurityError("Invalid URL target", {
      url: String(url),
      reason: "invalid_url",
    });
  }

  const hostname = parsed.hostname.toLowerCase();

  // Blocked hosts check
  if (policy.blockedHosts && policy.blockedHosts.length > 0) {
    const isBlocked = policy.blockedHosts.some((pattern) => matchesHostPattern(hostname, pattern));
    if (isBlocked) {
      throw new HttpSecurityError(`Access to host "${hostname}" is blocked by security policy`, {
        url: parsed.href,
        reason: "blocked_host",
      });
    }
  }

  // Allowed hosts check
  if (policy.allowedHosts && policy.allowedHosts.length > 0) {
    const isAllowed = policy.allowedHosts.some((pattern) => matchesHostPattern(hostname, pattern));
    if (!isAllowed) {
      throw new HttpSecurityError(`Host "${hostname}" is not in the allowed hosts list`, {
        url: parsed.href,
        reason: "not_allowed_host",
      });
    }
  }

  // Private network / SSRF check
  if (policy.allowPrivateNetworks === false) {
    if (isPrivateOrRestrictedHost(hostname)) {
      throw new HttpSecurityError(
        `Access to private/local network address "${hostname}" is restricted (SSRF protection)`,
        { url: parsed.href, reason: "private_network" },
      );
    }
  }
}

/**
 * Strip sensitive headers on cross-origin redirects.
 */
export function stripSensitiveHeaders(
  headers: Headers,
  sourceUrl: URL,
  targetUrl: URL,
  sensitiveList: readonly string[] = DEFAULT_SENSITIVE_HEADERS,
): Headers {
  if (sourceUrl.origin === targetUrl.origin) {
    return headers;
  }

  const sanitized = new Headers(headers);
  for (const headerName of sensitiveList) {
    sanitized.delete(headerName);
  }
  return sanitized;
}
