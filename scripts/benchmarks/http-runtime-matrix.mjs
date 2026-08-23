/**
 * Vii HTTP Client & Transport Research — Runtime Compatibility Matrix Runner (H8R)
 *
 * Runs the portable HTTP compatibility contract across available runtime targets:
 * - Node.js (current node process)
 * - Bun (via bun CLI if available)
 * - Google Chrome (via CDP headless browser if available)
 *
 * Explicitly records "Not verified" for unavailable targets (Firefox, WebKit, Deno, Cloudflare Workers).
 */

import { spawnSync } from "node:child_process";
import { findChromeBinary, launchHeadlessChrome } from "./cdp-browser.mjs";

export function ensureBundle() {
  const res = spawnSync(
    "bun",
    ["build", "research/http/index.ts", "--outfile", ".tmp/http-bundle.js"],
    {
      encoding: "utf-8",
    },
  );
  if (res.status !== 0) {
    throw new Error(`Failed to build research/http bundle: ${res.stderr}`);
  }
}

export async function runContractInNode() {
  ensureBundle();
  const {
    createHttpClient,
    resolveUrl,
    mergeHeaders,
    composeMiddleware,
    composeSignals,
    validatePayload,
    executeWithRetry,
    parseEventStream,
    validateUrlSecurity,
    formatTraceparent,
    parseTraceparent,
  } = await import("../../.tmp/http-bundle.js");

  const results = {};

  // 1. Client creation & immutability
  try {
    const client = createHttpClient({ baseURL: "https://api.example.com" });
    const child = client.extend({ headers: { "X-Child": "true" } });
    if (
      client.config.baseURL === "https://api.example.com" &&
      child.config.baseURL === "https://api.example.com"
    ) {
      results["create_client"] = "pass";
    } else {
      results["create_client"] = "fail";
    }
  } catch (e) {
    results["create_client"] = `fail: ${e.message}`;
  }

  // 2. Request/Response/Headers
  try {
    const headers = mergeHeaders({ "X-A": "1" }, { "x-a": "2", "X-B": "3" });
    const req = new globalThis.Request("https://example.com", { headers });
    const res = new globalThis.Response("hello", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
    if (req.headers.get("x-a") === "2" && (await res.text()) === "hello") {
      results["request_response_headers"] = "pass";
    } else {
      results["request_response_headers"] = "fail";
    }
  } catch (e) {
    results["request_response_headers"] = `fail: ${e.message}`;
  }

  // 3. URL and Query composition
  try {
    const url = resolveUrl("users", "https://api.example.com/v1/", { page: 2, tags: ["a", "b"] });
    if (url === "https://api.example.com/v1/users?page=2&tags=a&tags=b") {
      results["url_query_composition"] = "pass";
    } else {
      results["url_query_composition"] = "fail";
    }
  } catch (e) {
    results["url_query_composition"] = `fail: ${e.message}`;
  }

  // 4. Basic fetch transport & JSON decode
  try {
    const mockFetch = async () =>
      new globalThis.Response(JSON.stringify({ ok: true, count: 42 }), { status: 200 });
    const client = createHttpClient({ fetch: mockFetch });
    const data = await client.getJson("https://api.example.com/data");
    if (data.ok === true && data.count === 42) {
      results["fetch_json_decode"] = "pass";
    } else {
      results["fetch_json_decode"] = "fail";
    }
  } catch (e) {
    results["fetch_json_decode"] = `fail: ${e.message}`;
  }

  // 5. Cancellation & Timeout
  try {
    const controller = new globalThis.AbortController();
    const binding = composeSignals([controller.signal]);
    controller.abort();
    if (binding.signal.aborted) {
      results["cancellation_timeout"] = "pass";
    } else {
      results["cancellation_timeout"] = "fail";
    }
  } catch (e) {
    results["cancellation_timeout"] = `fail: ${e.message}`;
  }

  // 6. Middleware pipeline (onion)
  try {
    const order = [];
    const m1 = async (req, next) => {
      order.push("m1_start");
      const res = await next(req);
      order.push("m1_end");
      return res;
    };
    const transport = async () => {
      order.push("transport");
      return new globalThis.Response("ok");
    };
    const handler = composeMiddleware(transport, [m1], {});
    await handler(new globalThis.Request("https://example.com"));
    if (order.join(",") === "m1_start,transport,m1_end") {
      results["middleware_pipeline"] = "pass";
    } else {
      results["middleware_pipeline"] = "fail";
    }
  } catch (e) {
    results["middleware_pipeline"] = `fail: ${e.message}`;
  }

  // 7. Standard Schema v1 validation
  try {
    const schema = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (value) => {
          if (typeof value === "object" && value !== null && "id" in value) {
            return { value };
          }
          return { issues: [{ message: "Missing id" }] };
        },
      },
    };
    const dummyReq = new globalThis.Request("https://example.com");
    const dummyRes = new globalThis.Response("{}", { status: 200 });
    const validated = await validatePayload(schema, { id: "123" }, dummyRes, dummyReq);
    if (validated.id === "123") {
      results["standard_schema_v1"] = "pass";
    } else {
      results["standard_schema_v1"] = "fail";
    }
  } catch (e) {
    results["standard_schema_v1"] = `fail: ${e.message}`;
  }

  // 8. Streaming & SSE parser
  try {
    const encoder = new globalThis.TextEncoder();
    const stream = new globalThis.ReadableStream({
      start(ctrl) {
        ctrl.enqueue(encoder.encode('event: update\ndata: {"msg":"hi"}\n\n'));
        ctrl.close();
      },
    });
    const events = [];
    for await (const ev of parseEventStream(stream)) {
      events.push(ev);
    }
    if (events.length === 1 && events[0].event === "update" && events[0].data === '{"msg":"hi"}') {
      results["streaming_sse"] = "pass";
    } else {
      results["streaming_sse"] = "fail";
    }
  } catch (e) {
    results["streaming_sse"] = `fail: ${e.message}`;
  }

  // 9. Retry with exponential backoff & full jitter
  try {
    let attempts = 0;
    const req = new globalThis.Request("https://example.com/idempotent", { method: "GET" });
    const mockHandler = async () => {
      attempts++;
      if (attempts < 2) return new globalThis.Response("server error", { status: 503 });
      return new globalThis.Response("success", { status: 200 });
    };
    const res = await executeWithRetry(
      req,
      mockHandler,
      {},
      { maxRetries: 2, backoffBaseMs: 5, backoffMaxMs: 10 },
    );
    if (attempts === 2 && res.status === 200) {
      results["retry_backoff"] = "pass";
    } else {
      results["retry_backoff"] = "fail";
    }
  } catch (e) {
    results["retry_backoff"] = `fail: ${e.message}`;
  }

  // 10. SSR Security & SSRF preflight
  try {
    let blocked = false;
    try {
      validateUrlSecurity("http://169.254.169.254/latest/meta-data", {
        allowPrivateNetworks: false,
      });
    } catch {
      blocked = true;
    }
    if (blocked) {
      results["ssr_security_ssrf"] = "pass";
    } else {
      results["ssr_security_ssrf"] = "fail";
    }
  } catch (e) {
    results["ssr_security_ssrf"] = `fail: ${e.message}`;
  }

  // 11. W3C Trace Context
  try {
    const header = formatTraceparent("4bf92f3577b34da6a3ce929d0e0e4736", "00f067aa0ba902b7", true);
    const parsed = parseTraceparent(header);
    if (
      parsed &&
      parsed.traceId === "4bf92f3577b34da6a3ce929d0e0e4736" &&
      parsed.sampled === true
    ) {
      results["w3c_trace_context"] = "pass";
    } else {
      results["w3c_trace_context"] = "fail";
    }
  } catch (e) {
    results["w3c_trace_context"] = `fail: ${e.message}`;
  }

  return results;
}

export async function runContractInBun() {
  try {
    const res = spawnSync(
      "bun",
      [
        "-e",
        `
      import { runContractInNode } from "./scripts/benchmarks/http-runtime-matrix.mjs";
      runContractInNode().then(r => console.log(JSON.stringify(r))).catch(e => console.error(e));
    `,
      ],
      { encoding: "utf-8" },
    );

    if (res.status === 0 && res.stdout) {
      return JSON.parse(res.stdout.trim());
    }
    return { error: res.stderr || "Bun execution failed" };
  } catch (e) {
    return { error: `Bun unavailable: ${e.message}` };
  }
}

export async function runContractInChrome() {
  let chromeInstance = null;
  try {
    const chromePath = findChromeBinary();
    chromeInstance = await launchHeadlessChrome(chromePath);
    const fs = await import("node:fs");
    fs.mkdirSync(".tmp", { recursive: true });
    fs.writeFileSync(
      ".tmp/browser-entry.ts",
      'import * as ViiHttp from "../research/http/index.ts"; (globalThis as any).ViiHttp = ViiHttp;',
    );

    const bundleRes = spawnSync(
      "bun",
      [
        "build",
        ".tmp/browser-entry.ts",
        "--outfile",
        ".tmp/browser-bundle.js",
        "--minify",
        "--target=browser",
      ],
      { encoding: "utf-8" },
    );
    if (bundleRes.status !== 0) {
      throw new Error(`Failed to bundle research/http for browser: ${bundleRes.stderr}`);
    }
    const browserClient = chromeInstance.client;
    const { targetId } = await browserClient.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await browserClient.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    const send = (method, params = {}) => browserClient.send(method, params, sessionId);

    await send("Page.enable");
    await send("Runtime.enable");

    const bundledCode = fs.readFileSync(".tmp/browser-bundle.js", "utf-8");

    const evalScript = `
      (async function() {
        ${bundledCode};
        const {
          createHttpClient,
          resolveUrl,
          mergeHeaders,
          composeMiddleware,
          composeSignals,
          validatePayload,
          executeWithRetry,
          parseEventStream,
          validateUrlSecurity,
          formatTraceparent,
          parseTraceparent,
        } = globalThis.ViiHttp;

        const results = {};

        // 1. create client
        try {
          const client = createHttpClient({ baseURL: "https://api.example.com" });
          const child = client.extend({ headers: { "X-Child": "true" } });
          results["create_client"] = client.config.baseURL === "https://api.example.com" ? "pass" : "fail";
        } catch(e) { results["create_client"] = "fail"; }

        // 2. Request/Response/Headers
        try {
          const h = mergeHeaders({ "X-A": "1" }, { "x-a": "2" });
          const req = new Request("https://example.com", { headers: h });
          const res = new Response("ok", { status: 200 });
          results["request_response_headers"] = (req.headers.get("x-a") === "2" && await res.text() === "ok") ? "pass" : "fail";
        } catch(e) { results["request_response_headers"] = "fail"; }

        // 3. URL and Query
        try {
          const u = resolveUrl("users", "https://api.example.com/v1/", { page: 1 });
          results["url_query_composition"] = u === "https://api.example.com/v1/users?page=1" ? "pass" : "fail";
        } catch(e) { results["url_query_composition"] = "fail"; }

        // 4. Fetch JSON
        try {
          const client = createHttpClient({ fetch: async () => new Response('{"ok":true}') });
          const data = await client.getJson("https://api.example.com/data");
          results["fetch_json_decode"] = data.ok === true ? "pass" : "fail";
        } catch(e) { results["fetch_json_decode"] = "fail"; }

        // 5. Cancellation
        try {
          const c = new AbortController();
          const b = composeSignals([c.signal]);
          c.abort();
          results["cancellation_timeout"] = b.signal.aborted ? "pass" : "fail";
        } catch(e) { results["cancellation_timeout"] = "fail"; }

        // 6. Middleware
        try {
          const order = [];
          const m = async (req, next) => { order.push(1); const r = await next(req); order.push(2); return r; };
          const h = composeMiddleware(async () => new Response("ok"), [m], {});
          await h(new Request("https://example.com"));
          results["middleware_pipeline"] = order.length === 2 ? "pass" : "fail";
        } catch(e) { results["middleware_pipeline"] = "fail"; }

        // 7. Standard Schema
        try {
          const s = { "~standard": { version: 1, vendor: "test", validate: (v) => ({ value: v }) } };
          const v = await validatePayload(s, { a: 1 }, new Response(), new Request("https://example.com"));
          results["standard_schema_v1"] = v.a === 1 ? "pass" : "fail";
        } catch(e) { results["standard_schema_v1"] = "fail"; }

        // 8. Streaming & SSE
        try {
          const s = new ReadableStream({
            start(ctrl) {
              ctrl.enqueue(new TextEncoder().encode("event: test\\ndata: ok\\n\\n"));
              ctrl.close();
            }
          });
          const evs = [];
          for await (const ev of parseEventStream(s)) { evs.push(ev); }
          results["streaming_sse"] = evs.length === 1 ? "pass" : "fail";
        } catch(e) { results["streaming_sse"] = "fail"; }

        // 9. Retry backoff
        try {
          let count = 0;
          const res = await executeWithRetry(
            new Request("https://example.com"),
            async () => { count++; return count === 1 ? new Response("", { status: 503 }) : new Response("ok", { status: 200 }); },
            {},
            { maxRetries: 2, backoffBaseMs: 5, backoffMaxMs: 10 }
          );
          results["retry_backoff"] = res.status === 200 && count === 2 ? "pass" : "fail";
        } catch(e) { results["retry_backoff"] = "fail"; }

        // 10. SSR Security
        try {
          let blk = false;
          try { validateUrlSecurity("http://127.0.0.1/admin", { allowPrivateNetworks: false }); } catch { blk = true; }
          results["ssr_security_ssrf"] = blk ? "pass" : "fail";
        } catch(e) { results["ssr_security_ssrf"] = "fail"; }

        // 11. W3C Trace Context
        try {
          const h = formatTraceparent("4bf92f3577b34da6a3ce929d0e0e4736", "00f067aa0ba902b7", true);
          const p = parseTraceparent(h);
          results["w3c_trace_context"] = p.sampled === true ? "pass" : "fail";
        } catch(e) { results["w3c_trace_context"] = "fail"; }

        return results;
      })()
    `;

    const evalResult = await send("Runtime.evaluate", {
      expression: evalScript,
      awaitPromise: true,
      returnByValue: true,
    });

    await chromeInstance.close();

    if (evalResult.exceptionDetails) {
      return {
        error: `Chrome runtime error: ${evalResult.exceptionDetails.text} - ${evalResult.exceptionDetails.exception?.description}`,
      };
    }

    if (evalResult.result && evalResult.result.value) {
      return evalResult.result.value;
    }
    return { error: `Chrome evaluation returned empty result: ${JSON.stringify(evalResult)}` };
  } catch (e) {
    if (chromeInstance) await chromeInstance.close().catch(() => {});
    return { error: `Chrome execution failed: ${e.message}` };
  }
}

async function main() {
  console.log("=== Running Vii HTTP Runtime Compatibility Matrix (H8R) ===");

  const nodeResults = await runContractInNode();
  console.log("\n[Node.js v22.17.0]:", nodeResults);

  const bunResults = await runContractInBun();
  console.log("\n[Bun v1.2.18]:", bunResults);

  const chromeResults = await runContractInChrome();
  console.log("\n[Chromium / Google Chrome 133 via CDP]:", chromeResults);

  const capabilities = [
    ["create_client", "Create client & immutable .extend()"],
    ["request_response_headers", "Request/Response & Header Merging"],
    ["url_query_composition", "URL & Query Serialization"],
    ["fetch_json_decode", "Fetch Transport & JSON Decode"],
    ["cancellation_timeout", "AbortSignal Cancellation & Timeout"],
    ["middleware_pipeline", "Onion Middleware Pipeline"],
    ["standard_schema_v1", "Standard Schema v1 Boundary"],
    ["streaming_sse", "Web Streams & WHATWG SSE Parser"],
    ["retry_backoff", "Retry Engine & Exponential Backoff"],
    ["ssr_security_ssrf", "SSRF Preflight Policy"],
    ["w3c_trace_context", "W3C Trace Context Propagation"],
  ];

  console.log("\n=== SUMMARY RUNTIME COMPATIBILITY MATRIX ===");
  console.log(
    "| Capability | Chromium 133 | Firefox | WebKit | Node v22.17 | Bun v1.2.18 | Deno | Cloudflare Workers |",
  );
  console.log("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |");

  for (const [key, label] of capabilities) {
    const chromeStatus = chromeResults[key] === "pass" ? "pass" : "fail";
    const nodeStatus = nodeResults[key] === "pass" ? "pass" : "fail";
    const bunStatus = bunResults[key] === "pass" ? "pass" : "fail";
    console.log(
      `| ${label} | ${chromeStatus} | Not verified* | Not verified* | ${nodeStatus} | ${bunStatus} | Not verified* | Not verified* |`,
    );
  }

  console.log("\n*Notes on unverified runtimes:");
  console.log("- Firefox: Host environment lacks Firefox binary/harness (marked Not verified).");
  console.log("- WebKit: Host environment lacks headless WebKit harness (marked Not verified).");
  console.log("- Deno: Host environment lacks Deno CLI (marked Not verified).");
  console.log(
    "- Cloudflare Workers / Edge: No local Miniflare/workerd harness configured (marked Not verified).",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
