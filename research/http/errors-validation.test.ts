import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "./client.js";
import {
  HttpError,
  HttpParseError,
  HttpStatusError,
  HttpValidationError,
  NetworkError,
  isHttpError,
  isHttpParseError,
  isHttpStatusError,
  isHttpValidationError,
  isNetworkError,
} from "./errors.js";
import type { StandardSchemaV1 } from "./schema.js";

describe("Error Taxonomy & Validation Boundary (H4)", () => {
  it("throws HttpStatusError on non-2xx responses when throwOnError is enabled", async () => {
    const errorBody = { error: "Resource not found", code: 40401 };
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(errorBody), {
        status: 404,
        statusText: "Not Found",
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      throwOnError: true,
    });

    let caughtError: unknown;
    try {
      await client.get("/missing");
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(HttpStatusError);
    expect(caughtError).toBeInstanceOf(HttpError);
    expect(isHttpStatusError(caughtError)).toBe(true);
    expect(isHttpError(caughtError)).toBe(true);

    const statusErr = caughtError as HttpStatusError;
    expect(statusErr.status).toBe(404);
    expect(statusErr.statusText).toBe("Not Found");
    expect(statusErr.data).toEqual(errorBody);
  });

  it("does not throw on non-2xx responses when throwOnError is false", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response("Unauthorized", { status: 401, statusText: "Unauthorized" }));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      throwOnError: false,
    });

    const response = await client.get("/protected");
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("wraps transport connection failures in NetworkError", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
    });

    let caughtError: unknown;
    try {
      await client.get("/offline");
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(NetworkError);
    expect(isNetworkError(caughtError)).toBe(true);
    expect(isHttpError(caughtError)).toBe(true);
  });

  it("throws HttpParseError on malformed JSON responses in requestJson", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response("<html>Bad Gateway</html>", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
    });

    let caughtError: unknown;
    try {
      await client.getJson("/bad-json");
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(HttpParseError);
    expect(isHttpParseError(caughtError)).toBe(true);

    const parseErr = caughtError as HttpParseError;
    expect(parseErr.rawText).toBe("<html>Bad Gateway</html>");
  });

  it("handles 204 No Content cleanly in getJson", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204, statusText: "No Content" }));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
    });

    const result = await client.deleteJson("/item/123");
    expect(result).toBeUndefined();
  });

  it("validates successful JSON responses with Standard Schema v1", async () => {
    interface User {
      id: string;
      name: string;
    }

    const mockUserSchema: StandardSchemaV1<unknown, User> = {
      "~standard": {
        version: 1,
        vendor: "vii-test",
        validate(val: unknown) {
          if (typeof val === "object" && val !== null && "id" in val && "name" in val) {
            return { value: val as User };
          }
          return {
            issues: [{ message: "Expected User structure" }],
          };
        },
      },
    };

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "u-1", name: "Alice" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
    });

    const user = await client.getJson<User>("/user/1", {
      schema: mockUserSchema,
    });

    expect(user).toEqual({ id: "u-1", name: "Alice" });
  });

  it("throws HttpValidationError when Standard Schema validation fails", async () => {
    const mockStrictSchema: StandardSchemaV1<unknown, { score: number }> = {
      "~standard": {
        version: 1,
        vendor: "vii-test",
        validate(val: unknown) {
          return {
            issues: [{ message: "Field 'score' must be a positive number", path: ["score"] }],
          };
        },
      },
    };

    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ score: -5 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
    });

    let caughtError: unknown;
    try {
      await client.postJson("/score", { schema: mockStrictSchema });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(HttpValidationError);
    expect(isHttpValidationError(caughtError)).toBe(true);

    const validationErr = caughtError as HttpValidationError;
    expect(validationErr.issues).toHaveLength(1);
    expect(validationErr.issues[0]!.message).toBe("Field 'score' must be a positive number");
    expect(validationErr.data).toEqual({ score: -5 });
  });
});
