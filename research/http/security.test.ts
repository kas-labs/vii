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

    // Reserved / Special-Purpose RFC ranges
    expect(isPrivateIpv4("192.0.0.1")).toBe(true);
    expect(isPrivateIpv4("192.0.2.1")).toBe(true);
    expect(isPrivateIpv4("198.51.100.1")).toBe(true);
    expect(isPrivateIpv4("203.0.113.1")).toBe(true);
    expect(isPrivateIpv4("224.0.0.1")).toBe(true);
    expect(isPrivateIpv4("240.0.0.1")).toBe(true);

    // Public IPv4 addresses
    expect(isPrivateIpv4("8.8.8.8")).toBe(false);
    expect(isPrivateIpv4("1.1.1.1")).toBe(false);
    expect(isPrivateIpv4("172.15.255.255")).toBe(false);
    expect(isPrivateIpv4("172.32.0.1")).toBe(false);
    expect(isPrivateIpv4("93.184.216.34")).toBe(false);
    expect(isPrivateIpv4("192.0.32.1")).toBe(false);
    expect(isPrivateIpv4("198.51.99.1")).toBe(false);
    expect(isPrivateIpv4("203.0.55.1")).toBe(false);
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

  it("blocks IPv4, decimal IPv4, hex IPv4, IPv6, IPv4-mapped IPv6, multicast, and reserved ranges", () => {
    const policy = { allowPrivateNetworks: false };

    // Finding 7 table
    expect(() => validateUrlSecurity("http://127.0.0.1/", policy)).toThrow(HttpSecurityError);
    expect(() => validateUrlSecurity("http://2130706433/", policy)).toThrow(HttpSecurityError);
    expect(() => validateUrlSecurity("http://0x7f000001/", policy)).toThrow(HttpSecurityError);
    expect(() => validateUrlSecurity("http://[::1]/", policy)).toThrow(HttpSecurityError);
    expect(() => validateUrlSecurity("http://169.254.169.254/", policy)).toThrow(HttpSecurityError);
    expect(() => validateUrlSecurity("http://[::ffff:127.0.0.1]/", policy)).toThrow(
      HttpSecurityError,
    );
    expect(() => validateUrlSecurity("http://[::ffff:a9fe:a9fe]/", policy)).toThrow(
      HttpSecurityError,
    );

    // Added IPv4 ranges
    expect(() => validateUrlSecurity("http://224.0.0.1/", policy)).toThrow(HttpSecurityError);
    expect(() => validateUrlSecurity("http://240.0.0.1/", policy)).toThrow(HttpSecurityError);
    expect(() => validateUrlSecurity("http://255.255.255.255/", policy)).toThrow(HttpSecurityError);

    // Allowed public target
    expect(() => validateUrlSecurity("https://api.example.com/", policy)).not.toThrow();
  });

  it("enforces protocol allowlist: rejects file, data, gopher, ws, and allows http/https", () => {
    const policy = {};

    expect(() => validateUrlSecurity("file:///etc/passwd", policy)).toThrow(HttpSecurityError);
    expect(() => validateUrlSecurity("data:text/plain;base64,SGVsbG8=", policy)).toThrow(
      HttpSecurityError,
    );
    expect(() => validateUrlSecurity("gopher://gopher.floodgap.com/", policy)).toThrow(
      HttpSecurityError,
    );
    expect(() => validateUrlSecurity("ws://api.example.com/socket", policy)).toThrow(
      HttpSecurityError,
    );

    expect(() =>
      validateUrlSecurity("http://api.example.com/", { allowPrivateNetworks: true }),
    ).not.toThrow();
    expect(() => validateUrlSecurity("https://api.example.com/", policy)).not.toThrow();
  });

  it("applies fail-closed default: a policy object without allowPrivateNetworks blocks private networks", () => {
    const policy = { allowedHosts: ["api.example.com", "127.0.0.1"] };
    expect(() => validateUrlSecurity("http://127.0.0.1/", policy)).toThrow(HttpSecurityError);
  });

  it("redirects: blocks redirect chain when allowlisted host redirects to private IP on second hop", async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      const parsed = new URL(url);
      if (parsed.hostname === "api.trusted.com") {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: { Location: "http://169.254.169.254/latest/meta-data/" },
          }),
        );
      }
      return Promise.resolve(new Response("private data", { status: 200 }));
    });

    const client = createHttpClient({
      fetch: mockFetch,
      security: {
        allowedHosts: ["api.trusted.com"],
        allowPrivateNetworks: false,
      },
    });

    await expect(client.get("https://api.trusted.com/start")).rejects.toThrow(HttpSecurityError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("redirects: preserves Authorization on same-origin hop and strips on cross-origin hop", async () => {
    const receivedHeaders: Headers[] = [];
    const mockFetch = vi.fn().mockImplementation((url: string, req: Request) => {
      receivedHeaders.push(new Headers(req.headers));
      const parsed = new URL(url);
      if (parsed.hostname === "auth.example.com" && parsed.pathname === "/step1") {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: { Location: "https://auth.example.com/step2" },
          }),
        );
      }
      if (parsed.hostname === "auth.example.com" && parsed.pathname === "/step2") {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: { Location: "https://cdn.thirdparty.com/download" },
          }),
        );
      }
      return Promise.resolve(new Response("final content", { status: 200 }));
    });

    const client = createHttpClient({
      fetch: mockFetch,
      security: {
        allowedHosts: ["auth.example.com", "cdn.thirdparty.com"],
      },
    });

    const res = await client.get("https://auth.example.com/step1", {
      headers: {
        Authorization: "Bearer secret-token",
        Cookie: "session=xyz",
        "X-Custom": "safe-value",
      },
    });

    expect(res.status).toBe(200);
    expect(receivedHeaders).toHaveLength(3);

    // Hop 1 (auth.example.com/step1)
    expect(receivedHeaders[0]?.get("authorization")).toBe("Bearer secret-token");
    expect(receivedHeaders[0]?.get("cookie")).toBe("session=xyz");
    expect(receivedHeaders[0]?.get("x-custom")).toBe("safe-value");

    // Hop 2 (same-origin auth.example.com/step2)
    expect(receivedHeaders[1]?.get("authorization")).toBe("Bearer secret-token");
    expect(receivedHeaders[1]?.get("cookie")).toBe("session=xyz");
    expect(receivedHeaders[1]?.get("x-custom")).toBe("safe-value");

    // Hop 3 (cross-origin cdn.thirdparty.com/download)
    expect(receivedHeaders[2]?.get("authorization")).toBeNull();
    expect(receivedHeaders[2]?.get("cookie")).toBeNull();
    expect(receivedHeaders[2]?.get("x-custom")).toBe("safe-value");
  });

  it("redirects: 303 drops body and becomes GET; 307 preserves method and body", async () => {
    const recordedRequests: { method: string; body: string | null }[] = [];
    const mockFetch = vi.fn().mockImplementation(async (url: string, req: Request) => {
      const body = req.body ? await req.text() : null;
      recordedRequests.push({ method: req.method, body });
      const parsed = new URL(url);

      if (parsed.pathname === "/see-other") {
        return new Response(null, {
          status: 303,
          headers: { Location: "https://api.example.com/result" },
        });
      }
      if (parsed.pathname === "/temp-redirect") {
        return new Response(null, {
          status: 307,
          headers: { Location: "https://api.example.com/destination" },
        });
      }
      return new Response("ok", { status: 200 });
    });

    const client = createHttpClient({
      fetch: mockFetch,
      security: {
        allowedHosts: ["api.example.com"],
      },
    });

    // 303 redirect test
    await client.post("https://api.example.com/see-other", { body: "payload-303" });
    expect(recordedRequests[0]).toEqual({ method: "POST", body: "payload-303" });
    expect(recordedRequests[1]).toEqual({ method: "GET", body: null });

    recordedRequests.length = 0;

    // 307 redirect test
    await client.post("https://api.example.com/temp-redirect", { body: "payload-307" });
    expect(recordedRequests[0]).toEqual({ method: "POST", body: "payload-307" });
    expect(recordedRequests[1]).toEqual({ method: "POST", body: "payload-307" });
  });

  it("redirects: throws HttpSecurityError when redirect chain exceeds configured cap", async () => {
    let hop = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      hop++;
      return Promise.resolve(
        new Response(null, {
          status: 302,
          headers: { Location: `https://api.example.com/hop-${hop}` },
        }),
      );
    });

    const client = createHttpClient({
      fetch: mockFetch,
      security: {
        allowedHosts: ["api.example.com"],
        maxRedirects: 3,
      },
    });

    await expect(client.get("https://api.example.com/start")).rejects.toThrow(
      /Maximum redirect limit exceeded/,
    );
    expect(mockFetch).toHaveBeenCalledTimes(4); // initial + 3 redirects
  });

  it("R9: drains intermediate redirect response bodies before following the next hop", async () => {
    const cancelSpies: Array<ReturnType<typeof vi.spyOn>> = [];

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      const parsed = new URL(url);
      if (parsed.pathname === "/start") {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("intermediate body"));
            controller.close();
          },
        });
        cancelSpies.push(vi.spyOn(stream, "cancel"));
        return Promise.resolve(
          new Response(stream, {
            status: 302,
            headers: { Location: "https://api.example.com/final" },
          }),
        );
      }
      return Promise.resolve(new Response("final content", { status: 200 }));
    });

    const client = createHttpClient({
      fetch: mockFetch,
      security: { allowedHosts: ["api.example.com"] },
    });

    const res = await client.get("https://api.example.com/start");
    expect(res.status).toBe(200);
    expect(cancelSpies).toHaveLength(1);
    expect(cancelSpies[0]).toHaveBeenCalledTimes(1);
  });

  it("accurately narrows /24 reserved ranges without blocking valid public IPs in the same /16", () => {
    const policy = { allowPrivateNetworks: false };

    // 192.0.0.0/24 (RFC 6890) vs 192.0.32.0/19 (Allocated)
    expect(() => validateUrlSecurity("https://192.0.0.1/", policy)).toThrow(HttpSecurityError);
    expect(() => validateUrlSecurity("https://192.0.32.1/", policy)).not.toThrow();

    // 192.0.2.0/24 (RFC 5737 TEST-NET-1)
    expect(() => validateUrlSecurity("https://192.0.2.1/", policy)).toThrow(HttpSecurityError);

    // 198.51.100.0/24 (RFC 5737 TEST-NET-2) vs 198.51.99.1 (Allocated)
    expect(() => validateUrlSecurity("https://198.51.100.1/", policy)).toThrow(HttpSecurityError);
    expect(() => validateUrlSecurity("https://198.51.99.1/", policy)).not.toThrow();

    // 203.0.113.0/24 (RFC 5737 TEST-NET-3) vs 203.0.55.1 (APNIC Allocated)
    expect(() => validateUrlSecurity("https://203.0.113.1/", policy)).toThrow(HttpSecurityError);
    expect(() => validateUrlSecurity("https://203.0.55.1/", policy)).not.toThrow();
  });
});
