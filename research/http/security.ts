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
  readonly allowedProtocols?: readonly string[] | undefined;
  readonly maxRedirects?: number | undefined;
  readonly stripHeadersOnRedirect?: readonly string[] | undefined;
}

export const DEFAULT_SENSITIVE_HEADERS: readonly string[] = [
  "authorization",
  "cookie",
  "proxy-authorization",
  "x-api-key",
  "x-auth-token",
];

export const DEFAULT_ALLOWED_PROTOCOLS: readonly string[] = ["http:", "https:"];

const RESTRICTED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "metadata.google.internal",
  "instance-data",
]);

/**
 * Check if an IPv4 address is in a private, loopback, link-local, multicast, or reserved range.
 * RFC 1918, RFC 3927, RFC 1122, RFC 5735, RFC 5771, RFC 1112.
 */
export function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  const [p0, p1] = parts as [number, number, number, number];

  // 0.0.0.0/8 (Current network RFC 1122)
  if (p0 === 0) return true;

  // 10.0.0.0/8 (Private-Use RFC 1918)
  if (p0 === 10) return true;

  // 100.64.0.0/10 (Carrier-Grade NAT RFC 6598: 100.64.0.0 - 100.127.255.255)
  if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;

  // 127.0.0.0/8 (Loopback RFC 1122)
  if (p0 === 127) return true;

  // 169.254.0.0/16 (Link-Local RFC 3927 / Cloud Metadata e.g. 169.254.169.254)
  if (p0 === 169 && p1 === 254) return true;

  // 172.16.0.0/12 (Private-Use RFC 1918: 172.16.0.0 - 172.31.255.255)
  if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;

  // 192.0.0.0/24 (IETF Protocol Assignments RFC 6890)
  if (p0 === 192 && p1 === 0) return true;

  // 192.168.0.0/16 (Private-Use RFC 1918)
  if (p0 === 192 && p1 === 168) return true;

  // 198.18.0.0/15 (Benchmarking RFC 2544: 198.18.0.0 - 198.19.255.255)
  if (p0 === 198 && (p1 === 18 || p1 === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2 RFC 5737)
  if (p0 === 198 && p1 === 51) return true;

  // 203.0.113.0/24 (TEST-NET-3 RFC 5737)
  if (p0 === 203 && p1 === 0) return true;

  // 224.0.0.0/4 (Multicast RFC 5771: 224.0.0.0 - 239.255.255.255)
  if (p0 >= 224 && p0 <= 239) return true;

  // 240.0.0.0/4 (Reserved RFC 1112 and 255.255.255.255 Broadcast)
  if (p0 >= 240) return true;

  return false;
}

/**
 * Parses an IPv6 string into eight 16-bit integers.
 */
export function parseIpv6(ip: string): number[] | null {
  const clean = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (!clean || clean.includes(":::")) return null;

  let normalizedStr = clean;
  const lastColon = clean.lastIndexOf(":");
  if (lastColon !== -1) {
    const potentialIpv4 = clean.slice(lastColon + 1);
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(potentialIpv4)) {
      const parts = potentialIpv4.split(".").map((p) => parseInt(p, 10));
      if (parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
      const g6 = ((parts[0]! << 8) | parts[1]!).toString(16);
      const g7 = ((parts[2]! << 8) | parts[3]!).toString(16);
      normalizedStr = `${clean.slice(0, lastColon)}:${g6}:${g7}`;
    }
  }

  const parts = normalizedStr.split("::");
  if (parts.length > 2) return null;

  let groups: number[] = [];
  if (parts.length === 2) {
    const left = parts[0] ? parts[0].split(":").map((h) => parseInt(h, 16)) : [];
    const right = parts[1] ? parts[1].split(":").map((h) => parseInt(h, 16)) : [];
    if (left.some(Number.isNaN) || right.some(Number.isNaN)) return null;
    const missing = 8 - (left.length + right.length);
    if (missing < 1) return null;
    groups = [...left, ...new Array(missing).fill(0), ...right];
  } else {
    groups = normalizedStr.split(":").map((h) => parseInt(h, 16));
    if (groups.length !== 8 || groups.some(Number.isNaN)) return null;
  }

  if (groups.length !== 8 || groups.some((g) => g < 0 || g > 0xffff)) return null;
  return groups;
}

/**
 * Check if an IPv6 address is in a private, loopback, unique-local, link-local,
 * multicast, NAT64, IPv4-mapped, or IPv4-compatible range.
 */
export function isPrivateIpv6(ip: string): boolean {
  const groups = parseIpv6(ip);
  if (!groups) {
    return false;
  }

  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];

  // ::/128 (Unspecified)
  if (groups.every((g) => g === 0)) return true;

  // ::1/128 (Loopback)
  if (
    g0 === 0 &&
    g1 === 0 &&
    g2 === 0 &&
    g3 === 0 &&
    g4 === 0 &&
    g5 === 0 &&
    g6 === 0 &&
    g7 === 1
  ) {
    return true;
  }

  // fe80::/10 (Link-Local unicast: 0xfe80 - 0xfebf)
  if ((g0 & 0xffc0) === 0xfe80) return true;

  // fc00::/7 (Unique Local Address: 0xfc00 - 0xfdff)
  if ((g0 & 0xfe00) === 0xfc00) return true;

  // ff00::/8 (Multicast)
  if ((g0 & 0xff00) === 0xff00) return true;

  // IPv4-mapped IPv6: ::ffff:0:0/96
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
    const ipv4 = `${(g6 >> 8) & 0xff}.${g6 & 0xff}.${(g7 >> 8) & 0xff}.${g7 & 0xff}`;
    return isPrivateIpv4(ipv4);
  }

  // IPv4-compatible IPv6: ::/96 (deprecated RFC 4291)
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    const ipv4 = `${(g6 >> 8) & 0xff}.${g6 & 0xff}.${(g7 >> 8) & 0xff}.${g7 & 0xff}`;
    return isPrivateIpv4(ipv4);
  }

  // NAT64 Well-Known Prefix: 64:ff9b::/96 (RFC 6052)
  if (g0 === 0x0064 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    const ipv4 = `${(g6 >> 8) & 0xff}.${g6 & 0xff}.${(g7 >> 8) & 0xff}.${g7 & 0xff}`;
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

  // Integer representation of IPv4 (e.g. 2130706433)
  if (/^\d+$/.test(hostname)) {
    const num = parseInt(hostname, 10);
    if (num >= 0 && num <= 0xffffffff) {
      const p0 = (num >>> 24) & 0xff;
      const p1 = (num >>> 16) & 0xff;
      const p2 = (num >>> 8) & 0xff;
      const p3 = num & 0xff;
      return isPrivateIpv4(`${p0}.${p1}.${p2}.${p3}`);
    }
  }

  // Hexadecimal representation of IPv4 (e.g. 0x7f000001)
  if (/^0x[0-9a-f]+$/i.test(hostname)) {
    const num = parseInt(hostname, 16);
    if (num >= 0 && num <= 0xffffffff) {
      const p0 = (num >>> 24) & 0xff;
      const p1 = (num >>> 16) & 0xff;
      const p2 = (num >>> 8) & 0xff;
      const p3 = num & 0xff;
      return isPrivateIpv4(`${p0}.${p1}.${p2}.${p3}`);
    }
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
    const suffix = pattern.slice(1);
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

  // Protocol allowlist check
  const allowedProtocols = (policy.allowedProtocols ?? DEFAULT_ALLOWED_PROTOCOLS).map((p) =>
    p.endsWith(":") ? p.toLowerCase() : `${p.toLowerCase()}:`,
  );
  const protocol = parsed.protocol.toLowerCase();
  if (!allowedProtocols.includes(protocol)) {
    throw new HttpSecurityError(`Protocol "${protocol}" is not allowed by security policy`, {
      url: parsed.href,
      reason: "disallowed_protocol",
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

  // Private network / SSRF check: fail-closed default (blocked unless allowPrivateNetworks === true)
  if (policy.allowPrivateNetworks !== true) {
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
