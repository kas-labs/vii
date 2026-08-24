import { describe, expect, it, vi } from "vitest";
import { isAbortError } from "./cancellation.js";
import { createHttpClient } from "./client.js";
import { HttpStatusError, NetworkError } from "./errors.js";
import { calculateBackoff, parseRetryAfter } from "./retry.js";

describe("Retry & Idempotency Engine (H5)", () => {
  it("parses Retry-After header correctly for delta-seconds and HTTP-date", () => {
    expect(parseRetryAfter("5")).toBe(5000);
    expect(parseRetryAfter("120")).toBe(120000);
    expect(parseRetryAfter("0")).toBe(0);
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter("")).toBeUndefined();
    expect(parseRetryAfter("invalid-value")).toBeUndefined();

    const now = 1000000;
    const futureDate = new Date(now + 30000).toUTCString();
    expect(parseRetryAfter(futureDate, now)).toBe(30000);
  });

  it("calculates exponential backoff with and without jitter", () => {
    const policy = {
      backoffBaseMs: 100,
      backoffMaxMs: 1000,
      jitter: false,
    };

    expect(calculateBackoff(1, policy)).toBe(100);
    expect(calculateBackoff(2, policy)).toBe(200);
    expect(calculateBackoff(3, policy)).toBe(400);
    expect(calculateBackoff(4, policy)).toBe(800);
    expect(calculateBackoff(5, policy)).toBe(1000); // capped at 1000

    const mockRandom = () => 0.5;
    expect(calculateBackoff(1, { backoffBaseMs: 100, jitter: true }, mockRandom)).toBe(50);
  });

  it("does NOT retry by default when retry is not enabled", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response("Server Error", { status: 500, statusText: "Internal Server Error" }),
      );

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      throwOnError: true,
    });

    await expect(client.get("/unstable")).rejects.toThrow(HttpStatusError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries on eligible status codes when retry policy is enabled", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.resolve(
          new Response("Unavailable", { status: 503, statusText: "Service Unavailable" }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    });

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      retry: {
        maxRetries: 3,
        backoffBaseMs: 10,
        jitter: false,
      },
    });

    const res = await client.getJson<{ ok: boolean }>("/transient");
    expect(res).toEqual({ ok: true });
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("retries on network transport failure", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new TypeError("Network error"));
      }
      return Promise.resolve(new Response("recovered", { status: 200 }));
    });

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      retry: {
        maxRetries: 2,
        backoffBaseMs: 10,
        jitter: false,
      },
    });

    const response = await client.get("/flaky");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("recovered");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("enforces idempotency: does not retry non-idempotent POST requests by default", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response("Server Error", { status: 500, statusText: "Internal Server Error" }),
      );

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      throwOnError: true,
      retry: {
        maxRetries: 3,
        backoffBaseMs: 10,
        jitter: false,
      },
    });

    await expect(client.post("/create", { body: "item" })).rejects.toThrow(HttpStatusError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("allows retrying POST if explicitly configured in retryOnMethods", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(new Response("Gateway Timeout", { status: 504 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ created: true }), { status: 201 }));
    });

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      retry: {
        maxRetries: 2,
        backoffBaseMs: 10,
        retryOnMethods: ["GET", "POST"],
        jitter: false,
      },
    });

    const result = await client.postJson<{ created: boolean }>("/idempotent-post", {
      body: "data",
    });
    expect(result).toEqual({ created: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("respects Retry-After header on 429 Too Many Requests", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(
          new Response("Rate limited", {
            status: 429,
            headers: { "Retry-After": "0" },
          }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({ data: 42 }), { status: 200 }));
    });

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      retry: {
        maxRetries: 2,
        backoffBaseMs: 100,
      },
    });

    const result = await client.getJson<{ data: number }>("/rate-limited");
    expect(result).toEqual({ data: 42 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("aborts immediately during backoff sleep if signal is aborted", async () => {
    const controller = new AbortController();
    const mockFetch = vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 }));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      throwOnError: true,
      retry: {
        maxRetries: 3,
        backoffBaseMs: 500, // 500ms sleep
        jitter: false,
      },
    });

    const requestPromise = client.get("/abort-during-backoff", {
      signal: controller.signal,
    });

    // Abort after 20ms while it is sleeping before attempt 2
    setTimeout(() => {
      controller.abort();
    }, 20);

    await expect(requestPromise).rejects.toSatisfy(isAbortError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("delivers the exact same body across multiple retry attempts on PUT requests", async () => {
    const receivedBodies: string[] = [];
    const mockFetch = vi.fn().mockImplementation(async (_url: string, req: Request) => {
      const body = await req.text();
      receivedBodies.push(body);
      if (receivedBodies.length < 3) {
        return new Response("Service Unavailable", { status: 503 });
      }
      return new Response("Updated", { status: 200 });
    });

    const client = createHttpClient({
      fetch: mockFetch,
      retry: {
        maxRetries: 2,
        backoffBaseMs: 10,
        jitter: false,
      },
    });

    const response = await client.put("https://api.example.com/items/1", {
      body: "payload-to-retry",
    });

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(receivedBodies).toEqual(["payload-to-retry", "payload-to-retry", "payload-to-retry"]);
  });

  it("fails fast with typed error when retrying a non-replayable stream body", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("stream data"));
        controller.close();
      },
    });

    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response("Service Unavailable", { status: 503 }));

    const client = createHttpClient({
      fetch: mockFetch,
      retry: {
        maxRetries: 2,
        backoffBaseMs: 10,
      },
    });

    await expect(
      client.put("https://api.example.com/upload", {
        body: stream,
        headers: { "Content-Type": "application/octet-stream" },
      }),
    ).rejects.toThrow(/non-replayable stream body/);
  });

  it("clamps large or hostile Retry-After delays to backoffMaxMs", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(
          new Response("Too Many Requests", {
            status: 429,
            headers: { "Retry-After": "999999999" }, // ~31 years
          }),
        );
      }
      return Promise.resolve(new Response("ok", { status: 200 }));
    });

    const client = createHttpClient({
      fetch: mockFetch,
      retry: {
        maxRetries: 1,
        backoffBaseMs: 10,
        backoffMaxMs: 50,
        jitter: false,
      },
    });

    const start = Date.now();
    const response = await client.get("https://api.example.com/hostile-retry-after");
    const elapsed = Date.now() - start;

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(elapsed).toBeLessThan(1000);
  });

  it("does not allow retryCondition to override non-idempotent methods like POST", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("Internal Error", { status: 500 }));

    const customCondition = vi.fn().mockReturnValue(true);

    const client = createHttpClient({
      fetch: mockFetch,
      throwOnError: true,
      retry: {
        maxRetries: 2,
        backoffBaseMs: 10,
        retryCondition: customCondition,
      },
    });

    await expect(
      client.post("https://api.example.com/orders", { body: "order-1" }),
    ).rejects.toThrow(HttpStatusError);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
