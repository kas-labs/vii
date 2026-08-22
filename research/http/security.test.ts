import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "./client.js";
import { HttpSecurityError, isHttpSecurityError } from "./errors.js";
import {
  isPrivateIpv4,
  isPrivateIpv6,
  isPrivateOrRestrictedHost,
  stripSensitiveHeaders,
  validateUrlSecurity,
} from "./security.js";

describe("Private Network & SSRF Defenses (H7)", () => {
  it("classifies private and restricted IPv4 addresses accurately", () => {
    // Loopback
    expect(isPrivateIpv4("127.0.0.1")).toBe(true);
    expect(isPrivateIpv4("127.255.255.254")).toBe(true);

    // Private RFC 1918
    expect(isPrivateIpv4("10.0.0.1")).toBe(true);
    expect(isPrivateIpv4("10.254.0.1")).toBe(true);
    expect(isPrivateIpv4("172.16.0.1")).toBe(true);
    expect(isPrivateIpv4("172.31.255.255")).toBe(true);
    expect(isPrivateIpv4("192.168.1.1")).toBe(true);

    // Cloud Metadata / Link-Local RFC 3927
    expect(isPrivateIpv4("169.254.169.254")).toBe(true);
    expect(isPrivateIpv4("169.254.0.1")).toBe(true);

    // Current network & Carrier Grade NAT
    expect(isPrivateIpv4("0.0.0.0")).toBe(true);
    expect(isPrivateIpv4("100.64.0.1")).toBe(true);

    // Public IPv4 addresses
    expect(isPrivateIpv4("8.8.8.8")).toBe(false);
    expect(isPrivateIpv4("1.1.1.1")).toBe(false);
    expect(isPrivateIpv4("172.15.255.255")).toBe(false);
    expect(isPrivateIpv4("172.32.0.1")).toBe(false);
    expect(isPrivateIpv4("93.184.216.34")).toBe(false);
  });

  it("classifies private and restricted IPv6 addresses accurately", () => {
    // Loopback & Unspecified
    expect(isPrivateIpv6("::1")).toBe(true);
    expect(isPrivateIpv6("::")).toBe(true);

    // Link-Local (fe80::/10)
    expect(isPrivateIpv6("fe80::1")).toBe(true);

    // Unique Local (fc00::/7)
    expect(isPrivateIpv6("fc00::1")).toBe(true);
    expect(isPrivateIpv6("fd00:ec2::254")).toBe(true);

    // IPv4-mapped IPv6
    expect(isPrivateIpv6("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIpv6("::ffff:169.254.169.254")).toBe(true);
    expect(isPrivateIpv6("::ffff:8.8.8.8")).toBe(false);

    // Public IPv6 addresses
    expect(isPrivateIpv6("2606:4700::1")).toBe(false);
    expect(isPrivateIpv6("2001:4860:4860::8888")).toBe(false);
  });

  it("classifies restricted local hostnames and cloud metadata endpoints", () => {
    expect(isPrivateOrRestrictedHost("localhost")).toBe(true);
    expect(isPrivateOrRestrictedHost("sub.localhost")).toBe(true);
    expect(isPrivateOrRestrictedHost("service.local")).toBe(true);
    expect(isPrivateOrRestrictedHost("metadata.google.internal")).toBe(true);
    expect(isPrivateOrRestrictedHost("instance-data")).toBe(true);

    expect(isPrivateOrRestrictedHost("api.example.com")).toBe(false);
    expect(isPrivateOrRestrictedHost("github.com")).toBe(false);
  });

  it("validates URLs and blocks SSRF targets when allowPrivateNetworks is false", () => {
    const policy = { allowPrivateNetworks: false };

    expect(() => validateUrlSecurity("http://127.0.0.1:8080/admin", policy)).toThrow(
      HttpSecurityError,
    );
    expect(() => validateUrlSecurity("http://169.254.169.254/latest/meta-data/", policy)).toThrow(
      HttpSecurityError,
    );
    expect(() => validateUrlSecurity("http://localhost:3000/api", policy)).toThrow(
      HttpSecurityError,
    );
    expect(() =>
      validateUrlSecurity("http://metadata.google.internal/computeMetadata", policy),
    ).toThrow(HttpSecurityError);

    expect(() => validateUrlSecurity("https://api.example.com/v1/users", policy)).not.toThrow();
  });

  it("enforces allowedHosts and blockedHosts policies", () => {
    const allowPolicy = {
      allowedHosts: ["api.example.com", "*.trusted.org"],
    };

    expect(() => validateUrlSecurity("https://api.example.com/data", allowPolicy)).not.toThrow();
    expect(() => validateUrlSecurity("https://auth.trusted.org/login", allowPolicy)).not.toThrow();
    expect(() => validateUrlSecurity("https://evil.com/leak", allowPolicy)).toThrow(
      HttpSecurityError,
    );

    const blockPolicy = {
      blockedHosts: ["untrusted.com", /^internal-.*\.corp$/],
    };

    expect(() => validateUrlSecurity("https://untrusted.com/api", blockPolicy)).toThrow(
      HttpSecurityError,
    );
    expect(() => validateUrlSecurity("https://internal-db.corp/query", blockPolicy)).toThrow(
      HttpSecurityError,
    );
    expect(() => validateUrlSecurity("https://api.safe.com", blockPolicy)).not.toThrow();
  });

  it("strips sensitive headers on cross-origin redirects", () => {
    const originalHeaders = new Headers({
      Authorization: "Bearer secret-token",
      Cookie: "session=12345",
      "X-Api-Key": "key-xyz",
      "Content-Type": "application/json",
    });

    const source = new URL("https://api.example.com/v1/resource");
    const sameOrigin = new URL("https://api.example.com/v2/resource");
    const crossOrigin = new URL("https://cdn.thirdparty.com/files/download");

    const sameOriginResult = stripSensitiveHeaders(originalHeaders, source, sameOrigin);
    expect(sameOriginResult.get("authorization")).toBe("Bearer secret-token");
    expect(sameOriginResult.get("cookie")).toBe("session=12345");

    const crossOriginResult = stripSensitiveHeaders(originalHeaders, source, crossOrigin);
    expect(crossOriginResult.get("authorization")).toBeNull();
    expect(crossOriginResult.get("cookie")).toBeNull();
    expect(crossOriginResult.get("x-api-key")).toBeNull();
    expect(crossOriginResult.get("content-type")).toBe("application/json");
  });

  it("integrates security policy in HttpClient and blocks requests before transport", async () => {
    const mockFetch = vi.fn();
    const client = createHttpClient({
      fetch: mockFetch,
      security: {
        allowPrivateNetworks: false,
        allowedHosts: ["api.example.com"],
      },
    });

    await expect(client.get("http://127.0.0.1:3000/status")).rejects.toThrow(HttpSecurityError);
    await expect(client.get("https://unauthorized.org/data")).rejects.toThrow(HttpSecurityError);

    expect(mockFetch).not.toHaveBeenCalled();

    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const response = await client.get("https://api.example.com/status");
    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("supports error predicate isHttpSecurityError", () => {
    const secErr = new HttpSecurityError("Blocked", {
      url: "http://127.0.0.1",
      reason: "private_network",
    });
    expect(isHttpSecurityError(secErr)).toBe(true);
    expect(isHttpSecurityError(new Error("standard error"))).toBe(false);
  });
});
