import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "./client.js";

describe("createHttpClient (H1 Baseline)", () => {
  it("creates an isolated client with frozen config", () => {
    const client = createHttpClient({
      baseURL: "https://api.example.com",
    });

    expect(client.config.baseURL).toBe("https://api.example.com");
    expect(Object.isFrozen(client.config)).toBe(true);
  });

  it("executes request using injected fetch with resolved URL and merged headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));

    const client = createHttpClient({
      baseURL: "https://api.example.com/v1",
      headers: { Accept: "application/json", "X-App": "vii" },
      fetch: mockFetch,
    });

    const response = await client.request("/users", {
      headers: { "X-Request-Id": "req-123" },
      query: { active: true },
    });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const call = mockFetch.mock.calls[0];
    expect(call).toBeDefined();
    const [calledUrl, calledInit] = call!;

    expect(calledUrl).toBe("https://api.example.com/v1/users?active=true");
    expect(calledInit.method).toBe("GET");

    const sentHeaders = new Headers(calledInit.headers);
    expect(sentHeaders.get("accept")).toBe("application/json");
    expect(sentHeaders.get("x-app")).toBe("vii");
    expect(sentHeaders.get("x-request-id")).toBe("req-123");
  });

  it("supports all standard method helpers", async () => {
    const mockFetch = vi.fn().mockImplementation((_url, init) => {
      return Promise.resolve(new Response(init.method, { status: 200 }));
    });

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
    });

    await client.get("/data");
    expect(mockFetch.mock.calls[0]![1].method).toBe("GET");

    await client.post("/data", { body: "payload" });
    expect(mockFetch.mock.calls[1]![1].method).toBe("POST");
    expect(await (mockFetch.mock.calls[1]![1] as Request).text()).toBe("payload");

    await client.put("/data", { body: "put-payload" });
    expect(mockFetch.mock.calls[2]![1].method).toBe("PUT");

    await client.patch("/data", { body: "patch-payload" });
    expect(mockFetch.mock.calls[3]![1].method).toBe("PATCH");

    await client.delete("/data");
    expect(mockFetch.mock.calls[4]![1].method).toBe("DELETE");

    await client.head("/data");
    expect(mockFetch.mock.calls[5]![1].method).toBe("HEAD");

    await client.options("/data");
    expect(mockFetch.mock.calls[6]![1].method).toBe("OPTIONS");
  });

  it("allows per-request overrides of fetch and headers", async () => {
    const defaultFetch = vi.fn().mockResolvedValue(new Response("default"));
    const customFetch = vi.fn().mockResolvedValue(new Response("custom"));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      headers: { "X-Default": "yes" },
      fetch: defaultFetch,
    });

    const response = await client.get("/override", {
      fetch: customFetch,
      headers: { "X-Default": "no", "X-Custom": "added" },
    });

    expect(await response.text()).toBe("custom");
    expect(defaultFetch).not.toHaveBeenCalled();
    expect(customFetch).toHaveBeenCalledTimes(1);

    const call = customFetch.mock.calls[0];
    expect(call).toBeDefined();
    const calledHeaders = new Headers(call![1].headers);
    expect(calledHeaders.get("x-default")).toBe("no");
    expect(calledHeaders.get("x-custom")).toBe("added");
  });

  it("supports extend() for child clients without mutating the parent", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("extended"));

    const parent = createHttpClient({
      baseURL: "https://api.example.com/api",
      headers: { Authorization: "Bearer parent-token", Accept: "application/json" },
      fetch: mockFetch,
    });

    const child = parent.extend({
      baseURL: "v2",
      headers: { Authorization: "Bearer child-token", "X-Tenant": "tenant-42" },
    });

    expect(parent.config.baseURL).toBe("https://api.example.com/api");
    expect(child.config.baseURL).toBe("https://api.example.com/api/v2");

    await child.get("/users");
    const childCall = mockFetch.mock.calls[0];
    expect(childCall).toBeDefined();
    const [childUrl, childInit] = childCall!;
    expect(childUrl).toBe("https://api.example.com/api/v2/users");

    const childHeaders = new Headers(childInit.headers);
    expect(childHeaders.get("authorization")).toBe("Bearer child-token");
    expect(childHeaders.get("accept")).toBe("application/json");
    expect(childHeaders.get("x-tenant")).toBe("tenant-42");

    mockFetch.mockClear();

    // Verify parent is unaffected
    await parent.get("/users");
    const parentCall = mockFetch.mock.calls[0];
    expect(parentCall).toBeDefined();
    const [parentUrl, parentInit] = parentCall!;
    expect(parentUrl).toBe("https://api.example.com/api/users");

    const parentHeaders = new Headers(parentInit.headers);
    expect(parentHeaders.get("authorization")).toBe("Bearer parent-token");
    expect(parentHeaders.has("x-tenant")).toBe(false);
  });
});
