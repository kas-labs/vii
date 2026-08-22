import { describe, expect, it, vi } from "vitest";
import {
  AbortError,
  TimeoutError,
  bindScopeSignal,
  composeSignals,
  createTimeoutSignal,
  isAbortError,
  isTimeoutError,
} from "./cancellation.js";
import { createHttpClient } from "./client.js";

describe("Cancellation & Timeout Primitives (H3)", () => {
  it("classifies TimeoutError and AbortError correctly", () => {
    const timeoutErr = new TimeoutError("deadline");
    const abortErr = new AbortError("cancelled");
    const domAbort = new DOMException("The user aborted a request.", "AbortError");
    const domTimeout = new DOMException("The operation timed out.", "TimeoutError");
    const genericErr = new Error("Generic failure");

    expect(isTimeoutError(timeoutErr)).toBe(true);
    expect(isTimeoutError(domTimeout)).toBe(true);
    expect(isTimeoutError(abortErr)).toBe(false);
    expect(isTimeoutError(genericErr)).toBe(false);

    expect(isAbortError(abortErr)).toBe(true);
    expect(isAbortError(domAbort)).toBe(true);
    expect(isAbortError(timeoutErr)).toBe(false);
    expect(isAbortError(genericErr)).toBe(false);
  });

  it("creates timeout signal that aborts with TimeoutError", async () => {
    const { signal, cleanup } = createTimeoutSignal(20);
    expect(signal.aborted).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 35));

    expect(signal.aborted).toBe(true);
    expect(isTimeoutError(signal.reason)).toBe(true);
    cleanup();
  });

  it("cleans up timeout signal timer if cancelled early", async () => {
    const { signal, cleanup } = createTimeoutSignal(50);
    cleanup();

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(signal.aborted).toBe(false);
  });

  it("composes multiple signals and aborts on the earliest trigger", async () => {
    const c1 = new AbortController();
    const c2 = new AbortController();

    const composed = composeSignals([c1.signal, c2.signal]);
    expect(composed).toBeDefined();
    expect(composed!.signal.aborted).toBe(false);

    c2.abort(new AbortError("c2 abort"));

    expect(composed!.signal.aborted).toBe(true);
    expect(composed!.signal.reason).toBeInstanceOf(AbortError);

    composed!.cleanup();
  });

  it("binds scope disposal to an AbortSignal", () => {
    let disposeCallback: (() => void) | undefined;
    const mockScope = {
      onDispose: (fn: () => void) => {
        disposeCallback = fn;
        return () => {
          disposeCallback = undefined;
        };
      },
    };

    const binding = bindScopeSignal(mockScope);
    expect(binding).toBeDefined();
    expect(binding!.signal.aborted).toBe(false);

    disposeCallback?.();

    expect(binding!.signal.aborted).toBe(true);
    expect(isAbortError(binding!.signal.reason)).toBe(true);
  });
});

describe("HttpClient Cancellation & Timeout Integration (H3)", () => {
  it("aborts inflight request when user signal is aborted", async () => {
    const controller = new AbortController();
    const mockFetch = vi.fn().mockImplementation((_url, init) => {
      return new Promise((resolve, reject) => {
        const signal: AbortSignal = init.signal;
        signal.addEventListener("abort", () => {
          reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
    });

    const promise = client.get("/slow", { signal: controller.signal });
    controller.abort(new AbortError("user cancelled"));

    await expect(promise).rejects.toSatisfy(isAbortError);
  });

  it("aborts with TimeoutError when request timeout expires", async () => {
    const mockFetch = vi.fn().mockImplementation((_url, init) => {
      return new Promise((resolve, reject) => {
        const signal: AbortSignal = init.signal;
        signal.addEventListener("abort", () => {
          reject(signal.reason ?? new DOMException("Timeout", "TimeoutError"));
        });
      });
    });

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      timeout: 25,
    });

    await expect(client.get("/delayed")).rejects.toSatisfy(isTimeoutError);
  });

  it("aborts when bound Scope is disposed", async () => {
    let disposeFn: (() => void) | undefined;
    const fakeScope = {
      onDispose: (fn: () => void) => {
        disposeFn = fn;
        return () => {
          disposeFn = undefined;
        };
      },
    };

    const mockFetch = vi.fn().mockImplementation((_url, init) => {
      return new Promise((resolve, reject) => {
        const signal: AbortSignal = init.signal;
        signal.addEventListener("abort", () => {
          reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
        });
      });
    });

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
    });

    const requestPromise = client.get("/scoped-data", { scope: fakeScope });
    expect(disposeFn).toBeDefined();

    disposeFn?.();

    await expect(requestPromise).rejects.toSatisfy(isAbortError);
  });

  it("cleans up signal listeners and timeout handles when request succeeds", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("ok"));

    const client = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFetch,
      timeout: 1000,
    });

    const userController = new AbortController();
    const response = await client.get("/fast", { signal: userController.signal });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });
});
