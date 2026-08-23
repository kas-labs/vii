/**
 * Vii HTTP Client & Transport Research — Runtime Compatibility Evidence (H8R)
 */

import { describe, expect, it } from "vitest";
import {
  composeMiddleware,
  composeSignals,
  createHttpClient,
  createTimeoutSignal,
  executeWithRetry,
  formatTraceparent,
  mergeHeaders,
  parseEventStream,
  parseTraceparent,
  resolveUrl,
  validatePayload,
  validateUrlSecurity,
} from "./index.js";

describe("Runtime Compatibility Contract (H8R)", () => {
  it("verifies client factory creation & immutable .extend()", () => {
    const client = createHttpClient({
      baseURL: "https://api.example.com",
      headers: { "X-Base": "1" },
    });
    const child = client.extend({ headers: { "X-Child": "2" } });

    expect(client.config.baseURL).toBe("https://api.example.com");
    expect(child.config.baseURL).toBe("https://api.example.com");
    const baseHeaders = new Headers(client.config.headers as HeadersInit);
    const childHeaders = new Headers(child.config.headers as HeadersInit);
    expect(baseHeaders.get("x-base")).toBe("1");
    expect(childHeaders.get("x-child")).toBe("2");
  });

  it("verifies Request/Response & Header Merging", async () => {
    const headers = mergeHeaders({ "X-A": "1" }, { "x-a": "2", "X-B": "3" });
    const req = new Request("https://example.com", { headers });
    const res = new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });

    expect(req.headers.get("x-a")).toBe("2");
    expect(req.headers.get("x-b")).toBe("3");
    expect(await res.text()).toBe("ok");
  });

  it("verifies URL and Query Parameter Serialization", () => {
    const url = resolveUrl("users", "https://api.example.com/v1/", { page: 2, tags: ["a", "b"] });
    expect(url).toBe("https://api.example.com/v1/users?page=2&tags=a&tags=b");
  });

  it("verifies basic Fetch transport & JSON decoding", async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ ok: true, count: 42 }), { status: 200 });
    const client = createHttpClient({ fetch: mockFetch });
    const data = await client.getJson<{ ok: boolean; count: number }>(
      "https://api.example.com/data",
    );

    expect(data.ok).toBe(true);
    expect(data.count).toBe(42);
  });

  it("verifies AbortSignal cancellation & Timeout binding", () => {
    const controller = new AbortController();
    const timeoutBinding = createTimeoutSignal(500);
    const composed = composeSignals([controller.signal, timeoutBinding.signal]);

    expect(composed).toBeDefined();
    expect(composed!.signal.aborted).toBe(false);
    controller.abort();
    expect(composed!.signal.aborted).toBe(true);
    timeoutBinding.cleanup();
    composed!.cleanup();
  });

  it("verifies functional onion middleware pipeline", async () => {
    const order: string[] = [];
    const m1 = async (req: Request, next: (r: Request) => Promise<Response>) => {
      order.push("m1_start");
      const res = await next(req);
      order.push("m1_end");
      return res;
    };
    const transport = async () => {
      order.push("transport");
      return new Response("ok");
    };
    const handler = composeMiddleware(transport, [m1], {});
    await handler(new Request("https://example.com"));

    expect(order).toEqual(["m1_start", "transport", "m1_end"]);
  });

  it("verifies Standard Schema v1 validation boundary", async () => {
    const schema = {
      "~standard": {
        version: 1 as const,
        vendor: "test",
        validate: (value: unknown) => {
          if (typeof value === "object" && value !== null && "id" in value) {
            return { value: value as { id: string } };
          }
          return { issues: [{ message: "Missing id" }] };
        },
      },
    };
    const dummyReq = new Request("https://example.com");
    const dummyRes = new Response("{}", { status: 200 });
    const validated = await validatePayload(schema, { id: "123" }, dummyRes, dummyReq);

    expect(validated.id).toBe("123");
  });

  it("verifies Web Streams & WHATWG Server-Sent Events parser", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        ctrl.enqueue(encoder.encode('event: update\ndata: {"msg":"hi"}\n\n'));
        ctrl.close();
      },
    });
    const events: unknown[] = [];
    for await (const ev of parseEventStream(stream)) {
      events.push(ev);
    }

    expect(events).toEqual([{ event: "update", data: '{"msg":"hi"}' }]);
  });

  it("verifies Retry engine with exponential backoff & jitter", async () => {
    let attempts = 0;
    const req = new Request("https://example.com/idempotent", { method: "GET" });
    const mockHandler = async () => {
      attempts++;
      if (attempts < 2) return new Response("server error", { status: 503 });
      return new Response("success", { status: 200 });
    };
    const res = await executeWithRetry(
      req,
      mockHandler,
      {},
      { maxRetries: 2, backoffBaseMs: 5, backoffMaxMs: 10 },
    );

    expect(attempts).toBe(2);
    expect(res.status).toBe(200);
  });

  it("verifies SSR Security & SSRF preflight policy", () => {
    expect(() => {
      validateUrlSecurity("http://169.254.169.254/latest/meta-data", {
        allowPrivateNetworks: false,
      });
    }).toThrow();
  });

  it("verifies W3C Trace Context formatting and parsing", () => {
    const header = formatTraceparent("4bf92f3577b34da6a3ce929d0e0e4736", "00f067aa0ba902b7", true);
    const parsed = parseTraceparent(header);

    expect(parsed).toEqual({
      version: "00",
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      spanId: "00f067aa0ba902b7",
      sampled: true,
    });
  });
});
