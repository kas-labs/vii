import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "./client.js";
import {
  formatTraceparent,
  generateSpanId,
  generateTraceId,
  parseTraceparent,
  redactHeaders,
  redactUrl,
  type HttpRequestStartEvent,
  type HttpResponseErrorEvent,
  type HttpResponseSuccessEvent,
} from "./observability.js";

describe("W3C Trace Context & OpenTelemetry Propagation (H8)", () => {
  it("generates valid W3C trace ID (32 hex) and span ID (16 hex)", () => {
    const traceId = generateTraceId();
    const spanId = generateSpanId();

    expect(traceId).toHaveLength(32);
    expect(/^[0-9a-f]{32}$/.test(traceId)).toBe(true);

    expect(spanId).toHaveLength(16);
    expect(/^[0-9a-f]{16}$/.test(spanId)).toBe(true);
  });

  it("formats and parses standard W3C traceparent headers", () => {
    const traceId = "4bf92f3577b34da6a3ce929d0e0e4736";
    const spanId = "00f067aa0ba902b7";

    const header = formatTraceparent(traceId, spanId, true);
    expect(header).toBe("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");

    const parsed = parseTraceparent(header);
    expect(parsed).toEqual({
      version: "00",
      traceId,
      spanId,
      sampled: true,
    });
  });

  it("returns null on malformed traceparent headers", () => {
    expect(parseTraceparent(null)).toBeNull();
    expect(parseTraceparent("")).toBeNull();
    expect(parseTraceparent("invalid-header")).toBeNull();
    expect(parseTraceparent("01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01")).toBeNull(); // non-00 version
    expect(parseTraceparent("00-short-span-01")).toBeNull();
  });
});

describe("Structured Logging & Redaction (H8)", () => {
  it("redacts sensitive query parameters in URLs", () => {
    const url = "https://api.example.com/v1/users?token=secret123&page=2&apiKey=xyz987&limit=20";
    const sanitized = redactUrl(url);

    expect(sanitized).toContain("token=%5BREDACTED%5D");
    expect(sanitized).toContain("apiKey=%5BREDACTED%5D");
    expect(sanitized).toContain("page=2");
    expect(sanitized).toContain("limit=20");
  });

  it("redacts sensitive HTTP headers into loggable dictionary", () => {
    const headers = {
      Authorization: "Bearer secret-token",
      Cookie: "session=abcde",
      "X-Api-Key": "super-key",
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const redacted = redactHeaders(headers);
    expect(redacted["authorization"]).toBe("[REDACTED]");
    expect(redacted["cookie"]).toBe("[REDACTED]");
    expect(redacted["x-api-key"]).toBe("[REDACTED]");
    expect(redacted["content-type"]).toBe("application/json");
    expect(redacted["accept"]).toBe("application/json");
  });
});

describe("Lifecycle Hooks & Timing Metrics (H8)", () => {
  it("invokes onRequest and onResponse with structured timing metrics", async () => {
    const startEvents: HttpRequestStartEvent[] = [];
    const successEvents: HttpResponseSuccessEvent[] = [];

    const mockFetch = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return new Response("ok", { status: 200 });
    });

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      telemetry: {
        traceContext: true,
        onRequest: (e) => {
          startEvents.push(e);
        },
        onResponse: (e) => {
          successEvents.push(e);
        },
      },
    });

    const res = await client.get("/users");
    expect(res.status).toBe(200);

    expect(startEvents).toHaveLength(1);
    expect(startEvents[0]!.traceId).toBeDefined();
    expect(startEvents[0]!.spanId).toBeDefined();
    expect(startEvents[0]!.timestamp).toBeGreaterThan(0);

    expect(successEvents).toHaveLength(1);
    expect(successEvents[0]!.timing.durationMs).toBeGreaterThanOrEqual(5);
    expect(successEvents[0]!.response.status).toBe(200);

    // Verify traceparent header was passed to fetch
    const [, init] = mockFetch.mock.calls[0]!;
    const headers = new Headers(init.headers);
    expect(headers.get("traceparent")).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it("invokes onError with structured timing and error context on failure", async () => {
    const errorEvents: HttpResponseErrorEvent[] = [];

    const mockFetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      telemetry: {
        onError: (e) => {
          errorEvents.push(e);
        },
      },
    });

    await expect(client.get("/unreachable")).rejects.toThrow();

    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0]!.timing.durationMs).toBeGreaterThanOrEqual(0);
    expect(errorEvents[0]!.error).toBeDefined();
  });

  it("preserves explicitly passed traceparent header", async () => {
    const explicitTraceparent = "00-11111111111111111111111111111111-2222222222222222-01";
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));

    const client = createHttpClient({
      fetch: mockFetch,
      telemetry: { traceContext: true },
    });

    await client.get("https://api.example.com/test", {
      headers: { traceparent: explicitTraceparent },
    });

    const [, init] = mockFetch.mock.calls[0]!;
    const headers = new Headers(init.headers);
    expect(headers.get("traceparent")).toBe(explicitTraceparent);
  });

  it("telemetry hook errors do not crash request execution", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));

    const client = createHttpClient({
      fetch: mockFetch,
      telemetry: {
        onRequest: () => {
          throw new Error("Telemetry failure");
        },
        onResponse: () => {
          throw new Error("Telemetry failure");
        },
      },
    });

    const response = await client.get("https://api.example.com/resilient");
    expect(response.status).toBe(200);
  });
});
