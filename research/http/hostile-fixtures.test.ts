import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "./client.js";
import { resolveUrl, serializeQueryParams } from "./url.js";

describe("Hostile & Edge Case Fixtures (H1)", () => {
  it("safely encodes special characters in query parameters", () => {
    const params = serializeQueryParams({
      "weird key & name": "hello world / value = 1",
      emoji: "🚀✨",
      unicode: "こんにちは",
    });

    const parsed = new URLSearchParams(params.toString());
    expect(parsed.get("weird key & name")).toBe("hello world / value = 1");
    expect(parsed.get("emoji")).toBe("🚀✨");
    expect(parsed.get("unicode")).toBe("こんにちは");
  });

  it("handles hostile prototype pollution keys in query serialization safely", () => {
    const malicious = JSON.parse(
      '{"__proto__": {"polluted": true}, "constructor": "bad", "safe": "ok"}',
    );

    const serialized = serializeQueryParams(malicious);
    expect(serialized.has("safe")).toBe(true);
    expect(serialized.get("safe")).toBe("ok");
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });

  it("handles empty strings and redundant slashes deterministically", () => {
    expect(resolveUrl("", "https://api.example.com/")).toBe("https://api.example.com/");
    expect(resolveUrl("/", "https://api.example.com")).toBe("https://api.example.com/");
    expect(resolveUrl("///users", "https://api.example.com///")).toBe(
      "https://api.example.com/users",
    );
  });

  it("preserves URL hash fragments alongside query parameters", () => {
    const resolved = resolveUrl("/dashboard#section1", "https://api.example.com", {
      tab: "overview",
    });

    expect(resolved).toBe("https://api.example.com/dashboard#section1?tab=overview");
  });

  it("handles repeated header casing safely without duplicated lowercase/uppercase entries", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));
    const client = createHttpClient({
      baseURL: "https://api.example.com",
      headers: {
        "x-custom-key": "v1",
        "X-Custom-Key": "v2",
        "X-CUSTOM-KEY": "v3",
      },
      fetch: mockFetch,
    });

    await client.get("/test");
    const call = mockFetch.mock.calls[0];
    expect(call).toBeDefined();
    const sentHeaders = new Headers(call![1].headers);
    expect(sentHeaders.get("x-custom-key")).toBe("v3");
  });
});
