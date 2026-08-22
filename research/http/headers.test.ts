import { describe, expect, it } from "vitest";
import { mergeHeaders } from "./headers.js";

describe("mergeHeaders", () => {
  it("returns empty Headers when both inputs are undefined", () => {
    const headers = mergeHeaders();
    expect(Array.from(headers.entries())).toEqual([]);
  });

  it("applies default headers from a record", () => {
    const headers = mergeHeaders({
      "Content-Type": "application/json",
      Accept: "application/json",
    });

    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("accept")).toBe("application/json");
  });

  it("handles case-insensitive header overrides", () => {
    const headers = mergeHeaders(
      { "content-type": "text/plain" },
      { "Content-Type": "application/json" },
    );

    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("deletes headers when overridden with undefined or null", () => {
    const headers = mergeHeaders(
      { Authorization: "Bearer token-123", "X-Trace-Id": "trace-1" },
      { Authorization: undefined, "X-Trace-Id": null },
    );

    expect(headers.has("authorization")).toBe(false);
    expect(headers.has("x-trace-id")).toBe(false);
  });

  it("merges standard Headers instances", () => {
    const defaultHeaders = new Headers({ Accept: "text/html" });
    const requestHeaders = new Headers({ "User-Agent": "Vii-Test/1.0" });

    const merged = mergeHeaders(defaultHeaders, requestHeaders);
    expect(merged.get("accept")).toBe("text/html");
    expect(merged.get("user-agent")).toBe("Vii-Test/1.0");
  });

  it("merges tuple arrays", () => {
    const defaultHeaders: [string, string][] = [["X-Custom", "default"]];
    const requestHeaders: [string, string][] = [["X-Custom", "override"]];

    const merged = mergeHeaders(defaultHeaders, requestHeaders);
    expect(merged.get("x-custom")).toBe("override");
  });
});
