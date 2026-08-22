import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "./client.js";
import { composeMiddleware } from "./pipeline.js";
import type { HttpHandler, HttpMiddleware } from "./types.js";

describe("Middleware Pipeline (H2)", () => {
  it("executes middleware in deterministic onion order", async () => {
    const events: string[] = [];

    const m1: HttpMiddleware = async (req, next, context) => {
      events.push("m1-pre");
      const res = await next(req);
      events.push("m1-post");
      return res;
    };

    const m2: HttpMiddleware = async (req, next, context) => {
      events.push("m2-pre");
      const res = await next(req);
      events.push("m2-post");
      return res;
    };

    const transport: HttpHandler = async (req) => {
      events.push("transport");
      return new Response("ok", { status: 200 });
    };

    const handler = composeMiddleware(transport, [m1, m2], {});
    const response = await handler(new Request("https://api.example.com/test"));

    expect(response.status).toBe(200);
    expect(events).toEqual(["m1-pre", "m2-pre", "transport", "m2-post", "m1-post"]);
  });

  it("supports request transformation in middleware", async () => {
    const authMiddleware: HttpMiddleware = async (req, next) => {
      const headers = new Headers(req.headers);
      headers.set("Authorization", "Bearer secret-token");
      const authenticatedReq = new Request(req.url, {
        method: req.method,
        headers,
        body: req.body,
      });
      return next(authenticatedReq);
    };

    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      middleware: [authMiddleware],
    });

    await client.get("/profile");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, req] = mockFetch.mock.calls[0]!;
    const sentHeaders = new Headers(req.headers);
    expect(sentHeaders.get("authorization")).toBe("Bearer secret-token");
  });

  it("supports response transformation in middleware", async () => {
    const headerInjector: HttpMiddleware = async (req, next) => {
      const res = await next(req);
      const modifiedHeaders = new Headers(res.headers);
      modifiedHeaders.set("X-Processed-By", "vii-middleware");
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: modifiedHeaders,
      });
    };

    const mockFetch = vi.fn().mockResolvedValue(new Response("hello", { status: 200 }));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      middleware: [headerInjector],
    });

    const response = await client.get("/data");
    expect(response.headers.get("x-processed-by")).toBe("vii-middleware");
  });

  it("supports short-circuiting without calling transport", async () => {
    const mockCacheMiddleware: HttpMiddleware = async (req, next) => {
      if (req.url.endsWith("/cached")) {
        return new Response(JSON.stringify({ from: "cache" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return next(req);
    };

    const mockFetch = vi.fn().mockResolvedValue(new Response("network"));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      middleware: [mockCacheMiddleware],
    });

    const cachedRes = await client.get("/cached");
    expect(await cachedRes.json()).toEqual({ from: "cache" });
    expect(mockFetch).not.toHaveBeenCalled();

    const uncachedRes = await client.get("/live");
    expect(await uncachedRes.text()).toBe("network");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("propagates and shares context metadata across middleware", async () => {
    const m1: HttpMiddleware = async (req, next, context) => {
      context["startTime"] = Date.now();
      context["traceId"] = "trace-42";
      return next(req);
    };

    const m2: HttpMiddleware = async (req, next, context) => {
      expect(context["traceId"]).toBe("trace-42");
      const res = await next(req);
      context["completed"] = true;
      return res;
    };

    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      middleware: [m1, m2],
    });

    const requestContext: Record<string, unknown> = { initialKey: "val" };
    await client.get("/test", { context: requestContext });

    expect(requestContext["traceId"]).toBe("trace-42");
    expect(requestContext["completed"]).toBe(true);
  });

  it("allows error recovery or transformation in upstream middleware", async () => {
    const errorHandler: HttpMiddleware = async (req, next) => {
      try {
        return await next(req);
      } catch (err) {
        return new Response("fallback-on-error", { status: 503 });
      }
    };

    const failingFetch = vi.fn().mockRejectedValue(new TypeError("Network down"));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: failingFetch,
      middleware: [errorHandler],
    });

    const response = await client.get("/unstable");
    expect(response.status).toBe(503);
    expect(await response.text()).toBe("fallback-on-error");
  });

  it("throws an error when next() is invoked multiple times in a single middleware", async () => {
    const badMiddleware: HttpMiddleware = async (req, next) => {
      await next(req);
      return next(req);
    };

    const transport: HttpHandler = async () => new Response("ok");
    const handler = composeMiddleware(transport, [badMiddleware], {});

    await expect(handler(new Request("https://api.example.com"))).rejects.toThrow(
      "next() called multiple times in middleware",
    );
  });

  it("inherits middleware in extend() without mutating parent", async () => {
    const parentEvent: string[] = [];
    const childEvent: string[] = [];

    const parentMiddleware: HttpMiddleware = async (req, next) => {
      parentEvent.push("parent");
      return next(req);
    };

    const childMiddleware: HttpMiddleware = async (req, next) => {
      childEvent.push("child");
      return next(req);
    };

    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));

    const parentClient = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      middleware: [parentMiddleware],
    });

    const childClient = parentClient.extend({
      middleware: [childMiddleware],
    });

    await childClient.get("/child");
    expect(parentEvent).toEqual(["parent"]);
    expect(childEvent).toEqual(["child"]);

    parentEvent.length = 0;
    childEvent.length = 0;

    await parentClient.get("/parent");
    expect(parentEvent).toEqual(["parent"]);
    expect(childEvent).toEqual([]);
  });

  it("executes per-request middleware after client-level middleware", async () => {
    const order: string[] = [];

    const clientM: HttpMiddleware = async (req, next) => {
      order.push("client-m");
      return next(req);
    };

    const requestM: HttpMiddleware = async (req, next) => {
      order.push("request-m");
      return next(req);
    };

    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      middleware: [clientM],
    });

    await client.get("/endpoint", {
      middleware: [requestM],
    });

    expect(order).toEqual(["client-m", "request-m"]);
  });
});
