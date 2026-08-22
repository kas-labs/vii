import { describe, expect, it } from "vitest";
import { isAbsoluteUrl, resolveUrl, serializeQueryParams } from "./url.js";

describe("isAbsoluteUrl", () => {
  it("identifies absolute http/https/ftp URLs", () => {
    expect(isAbsoluteUrl("http://example.com")).toBe(true);
    expect(isAbsoluteUrl("https://api.example.com/v1")).toBe(true);
    expect(isAbsoluteUrl("ftp://ftp.example.com")).toBe(true);
    expect(isAbsoluteUrl("custom-scheme://host/path")).toBe(true);
  });

  it("identifies relative URLs and paths", () => {
    expect(isAbsoluteUrl("/users")).toBe(false);
    expect(isAbsoluteUrl("users/42")).toBe(false);
    expect(isAbsoluteUrl("./users")).toBe(false);
    expect(isAbsoluteUrl("../users")).toBe(false);
    expect(isAbsoluteUrl("?query=1")).toBe(false);
    expect(isAbsoluteUrl("#anchor")).toBe(false);
  });
});

describe("serializeQueryParams", () => {
  it("serializes primitive record values", () => {
    const params = serializeQueryParams({
      page: 1,
      limit: 20,
      active: true,
      search: "vii transport",
    });

    expect(params.toString()).toBe("page=1&limit=20&active=true&search=vii+transport");
  });

  it("skips undefined and null values", () => {
    const params = serializeQueryParams({
      present: "yes",
      empty: null,
      missing: undefined,
    });

    expect(params.toString()).toBe("present=yes");
  });

  it("serializes array values as repeated query keys", () => {
    const params = serializeQueryParams({
      tags: ["typescript", "http", "fetch"],
      id: [1, 2],
    });

    expect(params.toString()).toBe("tags=typescript&tags=http&tags=fetch&id=1&id=2");
  });

  it("handles URLSearchParams instance input", () => {
    const original = new URLSearchParams("foo=1&bar=2");
    const serialized = serializeQueryParams(original);
    expect(serialized.toString()).toBe("foo=1&bar=2");
  });

  it("handles tuple array input", () => {
    const tuples: readonly [string, string][] = [
      ["key1", "val1"],
      ["key2", "val2"],
    ];
    const serialized = serializeQueryParams(tuples);
    expect(serialized.toString()).toBe("key1=val1&key2=val2");
  });
});

describe("resolveUrl", () => {
  it("returns absolute URLs unchanged when no baseURL is provided", () => {
    expect(resolveUrl("https://api.example.com/users")).toBe("https://api.example.com/users");
  });

  it("ignores baseURL when inputUrl is already absolute", () => {
    expect(resolveUrl("https://other.com/data", "https://api.example.com/v1")).toBe(
      "https://other.com/data",
    );
  });

  it("joins baseURL without trailing slash and relative path with leading slash", () => {
    expect(resolveUrl("/users", "https://api.example.com")).toBe("https://api.example.com/users");
  });

  it("joins baseURL with trailing slash and relative path without leading slash", () => {
    expect(resolveUrl("users", "https://api.example.com/")).toBe("https://api.example.com/users");
  });

  it("joins nested baseURL path and relative path without double slashes", () => {
    expect(resolveUrl("/items/42", "https://api.example.com/api/v1/")).toBe(
      "https://api.example.com/api/v1/items/42",
    );
    expect(resolveUrl("items/42", "https://api.example.com/api/v1")).toBe(
      "https://api.example.com/api/v1/items/42",
    );
  });

  it("appends query parameters with ? on clean URLs", () => {
    const url = resolveUrl("/users", "https://api.example.com", {
      role: "admin",
      sort: "name",
    });
    expect(url).toBe("https://api.example.com/users?role=admin&sort=name");
  });

  it("appends query parameters with & when inputUrl already has query parameters", () => {
    const url = resolveUrl("https://api.example.com/users?existing=1", undefined, {
      additional: "2",
    });
    expect(url).toBe("https://api.example.com/users?existing=1&additional=2");
  });

  it("handles URL objects as input and baseURL", () => {
    const baseURL = new URL("https://api.example.com/v2/");
    const inputURL = new URL("https://api.example.com/v2/products");
    expect(resolveUrl(inputURL, baseURL)).toBe("https://api.example.com/v2/products");
  });
});
