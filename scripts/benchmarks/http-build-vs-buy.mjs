/**
 * Vii HTTP Client & Transport Research — Build-vs-Buy Benchmark Harness (H9R)
 *
 * Provides reproducible empirical evidence comparing:
 * 1. Native fetch baseline
 * 2. Handwritten minimal helper baseline
 * 3. Vii HTTP research prototype
 * 4. ky@1.7.5
 * 5. ofetch@1.4.1
 * 6. axios@1.18.0
 */

import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { arch, cpus, platform, release } from "node:os";
import { performance } from "node:perf_hooks";
import { brotliCompressSync, gzipSync } from "node:zlib";

const TMP_DIR = ".tmp/benchmarks";
mkdirSync(TMP_DIR, { recursive: true });

// Minimal handwritten helper baseline for fair comparison
export function createMinimalFetchClient(baseConfig = {}) {
  const baseURL = baseConfig.baseURL ? String(baseConfig.baseURL).replace(/\/+$/, "") : "";
  const baseHeaders = baseConfig.headers || {};
  const customFetch = baseConfig.fetch || globalThis.fetch;

  return {
    async get(path, options = {}) {
      const url = baseURL ? `${baseURL}/${String(path).replace(/^\/+/, "")}` : String(path);
      const headers = { ...baseHeaders, ...options.headers };
      const res = await customFetch(url, { ...options, method: "GET", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    },
    async getJson(path, options = {}) {
      const res = await this.get(path, options);
      return await res.json();
    },
  };
}

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

// -------------------------------------------------------------
// 1. Bundle Size Measurement
// -------------------------------------------------------------
export function measureBundleSizes() {
  ensureBundle();
  const entries = {
    "native-fetch": `// Native fetch has 0 external bundle bytes
export const request = (url, init) => fetch(url, init);
`,
    "handwritten-helper": `export function createMinimalFetchClient(baseConfig = {}) {
  const baseURL = baseConfig.baseURL ? String(baseConfig.baseURL).replace(/\\/+$/, "") : "";
  const baseHeaders = baseConfig.headers || {};
  const customFetch = baseConfig.fetch || globalThis.fetch;
  return {
    async get(path, options = {}) {
      const url = baseURL ? \`\${baseURL}/\${String(path).replace(/^\\/+/, "")}\` : String(path);
      const headers = { ...baseHeaders, ...options.headers };
      const res = await customFetch(url, { ...options, method: "GET", headers });
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      return res;
    },
    async getJson(path, options = {}) {
      const res = await this.get(path, options);
      return await res.json();
    },
  };
}
`,
    "vii-http-prototype": `export { createHttpClient, mergeHeaders, resolveUrl, composeSignals } from "../../research/http/index.ts";
`,
    ky: `import ky from "ky";
export const client = ky.create({ prefixUrl: "https://api.example.com" });
export const getJson = (url) => client.get(url).json();
`,
    ofetch: `import { createFetch } from "ofetch";
export const client = createFetch({ defaults: { baseURL: "https://api.example.com" } });
export const getJson = (url) => client(url);
`,
    axios: `import axios from "axios";
export const client = axios.create({ baseURL: "https://api.example.com" });
export const getJson = (url) => client.get(url).then(r => r.data);
`,
  };

  const results = {};

  for (const [name, code] of Object.entries(entries)) {
    const entryFile = `${TMP_DIR}/entry-${name}.js`;
    const outFile = `${TMP_DIR}/bundle-${name}.js`;
    writeFileSync(entryFile, code, "utf-8");

    if (name === "native-fetch") {
      results[name] = { raw: 0, minified: 0, gzip: 0, brotli: 0 };
      continue;
    }

    const res = spawnSync(
      "bun",
      ["build", entryFile, "--outfile", outFile, "--minify", "--target=browser"],
      { encoding: "utf-8" },
    );

    if (res.status !== 0) {
      results[name] = { error: res.stderr || "Bundle error" };
      continue;
    }

    const content = readFileSync(outFile);
    const rawSize = Buffer.byteLength(readFileSync(entryFile));
    const minSize = content.byteLength;
    const gzipSize = gzipSync(content, { level: 9 }).byteLength;
    const brotliSize = brotliCompressSync(content).byteLength;

    results[name] = {
      raw: rawSize,
      minified: minSize,
      gzip: gzipSize,
      brotli: brotliSize,
    };
  }

  return results;
}

// -------------------------------------------------------------
// 2. Microbenchmarks
// -------------------------------------------------------------
function calculateStats(times) {
  times.sort((a, b) => a - b);
  const n = times.length;
  const min = times[0];
  const max = times[n - 1];
  const median = n % 2 === 0 ? (times[n / 2 - 1] + times[n / 2]) / 2 : times[Math.floor(n / 2)];
  const sum = times.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;
  const p95 = times[Math.floor(n * 0.95)];

  return {
    min: Number(min.toFixed(4)),
    median: Number(median.toFixed(4)),
    p95: Number(p95.toFixed(4)),
    mean: Number(mean.toFixed(4)),
    max: Number(max.toFixed(4)),
    opsPerSec: Math.round(1000 / mean),
  };
}

export async function runMicrobenchmarks() {
  ensureBundle();
  const { createHttpClient } = await import("../../.tmp/http-bundle.js");
  const ky = (await import("ky")).default;
  const { createFetch } = await import("ofetch");
  const axios = (await import("axios")).default;

  const mockFastResponse = async () =>
    new globalThis.Response(JSON.stringify({ ok: true, id: 123, name: "vii" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

  const ITERATIONS = 10000;
  const WARMUP = 1000;

  const benchmarks = {
    client_creation: {},
    request_composition_json: {},
    error_handling: {},
  };

  // --- Scenario A: Client Creation ---
  {
    // Minimal Helper
    for (let i = 0; i < WARMUP; i++)
      createMinimalFetchClient({ baseURL: "https://api.example.com" });
    const timesMinimal = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      createMinimalFetchClient({
        baseURL: "https://api.example.com",
        headers: { Authorization: "Bearer 123" },
      });
      timesMinimal.push(performance.now() - t0);
    }
    benchmarks.client_creation["handwritten_helper"] = calculateStats(timesMinimal);

    // Vii HTTP
    for (let i = 0; i < WARMUP; i++) createHttpClient({ baseURL: "https://api.example.com" });
    const timesVii = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      createHttpClient({
        baseURL: "https://api.example.com",
        headers: { Authorization: "Bearer 123" },
      });
      timesVii.push(performance.now() - t0);
    }
    benchmarks.client_creation["vii_http_prototype"] = calculateStats(timesVii);

    // Ky
    for (let i = 0; i < WARMUP; i++) ky.create({ prefixUrl: "https://api.example.com" });
    const timesKy = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      ky.create({ prefixUrl: "https://api.example.com", headers: { Authorization: "Bearer 123" } });
      timesKy.push(performance.now() - t0);
    }
    benchmarks.client_creation["ky"] = calculateStats(timesKy);

    // ofetch
    for (let i = 0; i < WARMUP; i++)
      createFetch({ defaults: { baseURL: "https://api.example.com" } });
    const timesOfetch = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      createFetch({
        defaults: { baseURL: "https://api.example.com", headers: { Authorization: "Bearer 123" } },
      });
      timesOfetch.push(performance.now() - t0);
    }
    benchmarks.client_creation["ofetch"] = calculateStats(timesOfetch);

    // Axios
    for (let i = 0; i < WARMUP; i++) axios.create({ baseURL: "https://api.example.com" });
    const timesAxios = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      axios.create({
        baseURL: "https://api.example.com",
        headers: { Authorization: "Bearer 123" },
      });
      timesAxios.push(performance.now() - t0);
    }
    benchmarks.client_creation["axios"] = calculateStats(timesAxios);
  }

  // --- Scenario B: Request Dispatch + JSON Decode ---
  {
    // Native fetch baseline
    const nativeFetch = async () => {
      const res = await mockFastResponse();
      return await res.json();
    };
    for (let i = 0; i < WARMUP; i++) await nativeFetch();
    const timesNative = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      await nativeFetch();
      timesNative.push(performance.now() - t0);
    }
    benchmarks.request_composition_json["native_fetch"] = calculateStats(timesNative);

    // Minimal Helper
    const minimalClient = createMinimalFetchClient({
      baseURL: "https://api.example.com",
      fetch: mockFastResponse,
    });
    for (let i = 0; i < WARMUP; i++) await minimalClient.getJson("users");
    const timesMinimal = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      await minimalClient.getJson("users");
      timesMinimal.push(performance.now() - t0);
    }
    benchmarks.request_composition_json["handwritten_helper"] = calculateStats(timesMinimal);

    // Vii HTTP
    const viiClient = createHttpClient({
      baseURL: "https://api.example.com",
      fetch: mockFastResponse,
    });
    for (let i = 0; i < WARMUP; i++) await viiClient.getJson("users");
    const timesVii = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      await viiClient.getJson("users");
      timesVii.push(performance.now() - t0);
    }
    benchmarks.request_composition_json["vii_http_prototype"] = calculateStats(timesVii);

    // Ky
    const kyClient = ky.create({
      prefixUrl: "https://api.example.com",
      fetch: mockFastResponse,
      retry: 0,
    });
    for (let i = 0; i < WARMUP; i++) await kyClient.get("users").json();
    const timesKy = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      await kyClient.get("users").json();
      timesKy.push(performance.now() - t0);
    }
    benchmarks.request_composition_json["ky"] = calculateStats(timesKy);

    // ofetch
    const ofetchClient = createFetch({
      fetch: mockFastResponse,
      defaults: { baseURL: "https://api.example.com", retry: 0 },
    });
    for (let i = 0; i < WARMUP; i++) await ofetchClient("users");
    const timesOfetch = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      await ofetchClient("users");
      timesOfetch.push(performance.now() - t0);
    }
    benchmarks.request_composition_json["ofetch"] = calculateStats(timesOfetch);

    // Axios (using custom adapter)
    const axiosClient = axios.create({
      baseURL: "https://api.example.com",
      adapter: async () => ({
        data: { ok: true, id: 123, name: "vii" },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {},
      }),
    });
    for (let i = 0; i < WARMUP; i++) await axiosClient.get("users");
    const timesAxios = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const t0 = performance.now();
      await axiosClient.get("users");
      timesAxios.push(performance.now() - t0);
    }
    benchmarks.request_composition_json["axios"] = calculateStats(timesAxios);
  }

  // --- Scenario C: Error Handling & Wrapping ---
  {
    const mockErrorFetch = async () => new globalThis.Response("Internal Error", { status: 500 });

    // Vii HTTP
    const viiClient = createHttpClient({ fetch: mockErrorFetch, throwOnError: true });
    const timesVii = [];
    for (let i = 0; i < 5000; i++) {
      const t0 = performance.now();
      try {
        await viiClient.get("https://api.example.com/err");
      } catch {
        // Expected error handling test
      }
      timesVii.push(performance.now() - t0);
    }
    benchmarks.error_handling["vii_http_prototype"] = calculateStats(timesVii);

    // Ky
    const kyClient = ky.create({ fetch: mockErrorFetch, retry: 0 });
    const timesKy = [];
    for (let i = 0; i < 5000; i++) {
      const t0 = performance.now();
      try {
        await kyClient.get("https://api.example.com/err");
      } catch {
        // Expected error handling test
      }
      timesKy.push(performance.now() - t0);
    }
    benchmarks.error_handling["ky"] = calculateStats(timesKy);

    // ofetch
    const ofetchClient = createFetch({ fetch: mockErrorFetch, defaults: { retry: 0 } });
    const timesOfetch = [];
    for (let i = 0; i < 5000; i++) {
      const t0 = performance.now();
      try {
        await ofetchClient("https://api.example.com/err");
      } catch {
        // Expected error handling test
      }
      timesOfetch.push(performance.now() - t0);
    }
    benchmarks.error_handling["ofetch"] = calculateStats(timesOfetch);
  }

  return benchmarks;
}

// -------------------------------------------------------------
// 3. Retry Defaults Verification
// -------------------------------------------------------------
export async function verifyRetryDefaults() {
  ensureBundle();
  const ky = (await import("ky")).default;
  const { createFetch } = await import("ofetch");
  const axios = (await import("axios")).default;
  const { createHttpClient } = await import("../../.tmp/http-bundle.js");

  const results = {};

  // Ky default retry check
  let kyAttempts = 0;
  const kyFetch = async () => {
    kyAttempts++;
    return new globalThis.Response("error", { status: 503 });
  };
  try {
    await ky.get("https://api.example.com/test", { fetch: kyFetch });
  } catch {
    // Expected retry failure
  }
  results["ky"] = { defaultRetriesObserved: Math.max(0, kyAttempts - 1), officialDefault: 2 };

  // ofetch default retry check
  let ofetchAttempts = 0;
  const ofetchFetch = async () => {
    ofetchAttempts++;
    return new globalThis.Response("error", { status: 503 });
  };
  const ofetchClient = createFetch({ fetch: ofetchFetch });
  try {
    await ofetchClient("https://api.example.com/test");
  } catch {
    // Expected retry failure
  }
  results["ofetch"] = {
    defaultRetriesObserved: Math.max(0, ofetchAttempts - 1),
    officialDefault: 1,
  };

  // Axios default retry check
  let axiosAttempts = 0;
  try {
    await axios.get("https://api.example.com/test", {
      adapter: async () => {
        axiosAttempts++;
        throw new Error("Network error");
      },
    });
  } catch {
    // Expected network failure
  }
  results["axios"] = { defaultRetriesObserved: Math.max(0, axiosAttempts - 1), officialDefault: 0 };

  // Vii HTTP default retry check
  let viiAttempts = 0;
  const viiFetch = async () => {
    viiAttempts++;
    return new globalThis.Response("error", { status: 503 });
  };
  const viiClient = createHttpClient({ fetch: viiFetch });
  try {
    await viiClient.get("https://api.example.com/test");
  } catch {
    // Expected failure
  }
  results["vii_http_prototype"] = {
    defaultRetriesObserved: Math.max(0, viiAttempts - 1),
    officialDefault: 0,
  };

  return results;
}

async function main() {
  console.log("=== Vii HTTP Build-vs-Buy Comparative Benchmark (H9R) ===");
  console.log(
    `OS/Platform: ${platform()} ${release()} (${arch()}), CPU: ${cpus()[0]?.model || "unknown"}`,
  );
  console.log(
    `Node.js: ${process.version}, Pinned Competitors: ky@1.7.5, ofetch@1.4.1, axios@1.18.0\n`,
  );

  console.log("1. Measuring Bundle Sizes...");
  const bundleSizes = measureBundleSizes();
  console.table(bundleSizes);

  console.log("\n2. Verifying Retry Defaults...");
  const retryDefaults = await verifyRetryDefaults();
  console.table(retryDefaults);

  console.log("\n3. Running Runtime Microbenchmarks (10,000 iterations each)...");
  const benchmarks = await runMicrobenchmarks();

  console.log("\n[Scenario A: Client Creation]");
  console.table(benchmarks.client_creation);

  console.log("\n[Scenario B: Request Dispatch + JSON Decode]");
  console.table(benchmarks.request_composition_json);

  console.log("\n[Scenario C: Error Handling]");
  console.table(benchmarks.error_handling);

  return { bundleSizes, retryDefaults, benchmarks };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
