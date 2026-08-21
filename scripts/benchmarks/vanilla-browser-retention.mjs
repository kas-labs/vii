import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { cpus, platform, release, arch } from "node:os";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { findChromeBinary, launchHeadlessChrome } from "./cdp-browser.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const referenceAppDir = resolve(root, "../vii-reference-vanilla-onboarding");
const distDir = join(referenceAppDir, "dist");
const coreDistDir = join(referenceAppDir, "node_modules/@vii-labs/core/dist");

if (!existsSync(distDir)) {
  execFileSync("pnpm", ["build"], { cwd: referenceAppDir, stdio: "inherit" });
}

const chromePath = findChromeBinary();
const chromeVersion = execFileSync(chromePath, ["--version"], { encoding: "utf8" }).trim();

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

const server = createServer((req, res) => {
  const requestUrl = new URL(req.url ?? "/index.html", "http://127.0.0.1");
  const pathname = requestUrl.pathname;
  const isCoreAsset = pathname.startsWith("/core/");
  const requestedPath = isCoreAsset
    ? pathname.slice("/core/".length)
    : pathname === "/"
      ? "index.html"
      : pathname.slice(1);

  const safeRelativePath = normalize(decodeURIComponent(requestedPath)).replace(/^([/\\])+/, "");
  const rootDir = isCoreAsset ? coreDistDir : distDir;
  const filePath = resolve(rootDir, safeRelativePath);
  const rootWithSep = rootDir.endsWith(sep) ? rootDir : `${rootDir}${sep}`;

  if (filePath !== rootDir && !filePath.startsWith(rootWithSep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (existsSync(filePath)) {
    const ext = filePath.slice(filePath.lastIndexOf("."));
    res.writeHead(200, {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(readFileSync(filePath));
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

await new Promise((resolveServer) => server.listen(0, "127.0.0.1", resolveServer));
const { port } = server.address();
const serverUrl = `http://127.0.0.1:${port}`;

const chromeSession = await launchHeadlessChrome(chromePath);
const { client: browserClient } = chromeSession;

const { targetId } = await browserClient.send("Target.createTarget", { url: serverUrl });
const { sessionId } = await browserClient.send("Target.attachToTarget", {
  targetId,
  flatten: true,
});

function send(method, params = {}) {
  return browserClient.send(method, params, sessionId);
}

const consoleErrors = [];
browserClient.on("Runtime.consoleAPICalled", (params) => {
  if (params.type === "error" || params.type === "assert") {
    consoleErrors.push({
      type: params.type,
      text: params.args?.map((arg) => arg.value ?? JSON.stringify(arg)).join(" ") ?? "",
    });
  }
});
browserClient.on("Runtime.exceptionThrown", (params) => {
  consoleErrors.push({
    type: "exception",
    text: params.exceptionDetails?.text ?? "Uncaught exception",
  });
});

await send("Page.enable");
await send("Runtime.enable");
await send("Performance.enable");
await send("HeapProfiler.enable");
await new Promise((r) => setTimeout(r, 1000));

async function getMetrics() {
  const response = await send("Performance.getMetrics");
  const m = {};
  for (const item of response.metrics) m[item.name] = item.value;
  return {
    JSHeapUsedSize: m.JSHeapUsedSize ?? 0,
    JSHeapTotalSize: m.JSHeapTotalSize ?? 0,
    Documents: m.Documents ?? 0,
    Nodes: m.Nodes ?? 0,
    JSEventListeners: m.JSEventListeners ?? 0,
    LayoutObjects: m.LayoutObjects ?? 0,
  };
}

async function collectGarbage() {
  await send("HeapProfiler.collectGarbage");
  await new Promise((r) => setTimeout(r, 100));
}

const phase1Result = await send("Runtime.evaluate", {
  expression: `(() => {
    const root = document.querySelector("#app");
    if (!root) throw new Error("Root #app not found");
    const getScopeStatus = () => root.querySelector(".status")?.textContent?.trim();
    const getCount = () => Number(root.querySelector(".metrics dd")?.textContent ?? "-1");
    const getBtn = (action) => root.querySelector('[data-action="' + action + '"]');
    const getTimelineItems = () => root.querySelectorAll(".event-item").length;

    const initialStatus = getScopeStatus();
    const initialCreateDisabled = getBtn("create-scope")?.hasAttribute("disabled");
    const initialDisposeDisabled = getBtn("dispose-scope")?.hasAttribute("disabled");

    getBtn("create-scope").click();
    const postCreateStatus = getScopeStatus();
    const postCreateCount = getCount();
    const postCreateCreateDisabled = getBtn("create-scope")?.hasAttribute("disabled");
    const postCreateDisposeDisabled = getBtn("dispose-scope")?.hasAttribute("disabled");

    getBtn("increment").click();
    const postIncCount = getCount();
    getBtn("batch").click();
    const postBatchCount = getCount();

    getBtn("dispose-scope").click();
    const postDisposeStatus = getScopeStatus();
    const postDisposeDisposeDisabled = getBtn("dispose-scope")?.hasAttribute("disabled");
    const postDisposeIncDisabled = getBtn("increment")?.hasAttribute("disabled");
    const eventCountAfterDispose = getTimelineItems();

    const staleClicksBefore = getCount();
    try { getBtn("increment")?.click(); } catch (_) {}
    try { getBtn("batch")?.click(); } catch (_) {}
    const staleClicksAfter = getCount();
    const eventsAfterStaleClicks = getTimelineItems();

    getBtn("create-scope").click();
    const freshScopeStatus = getScopeStatus();
    const freshScopeCount = getCount();
    getBtn("dispose-scope").click();

    return {
      initialStatus,
      initialCreateDisabled,
      initialDisposeDisabled,
      postCreateStatus,
      postCreateCount,
      postCreateCreateDisabled,
      postCreateDisposeDisabled,
      postIncCount,
      postBatchCount,
      eventCountAfterDispose,
      postDisposeStatus,
      postDisposeDisposeDisabled,
      postDisposeIncDisabled,
      staleClicksDidNotMutate: staleClicksBefore === staleClicksAfter,
      staleEventsDidNotEmit: eventCountAfterDispose === eventsAfterStaleClicks,
      freshScopeStatus,
      freshScopeCount,
    };
  })()`,
  returnByValue: true,
});

const phase2Result = await send("Runtime.evaluate", {
  expression: `(async () => {
    const { createScope, state, computed } = await import('/core/index.js');
    const results = {
      scopeCreated: false,
      resourcesDisposed: 0,
      listenerCleanedUp: false,
      timerCleanedUp: false,
      activeNotificationsReceived: 0,
      staleNotificationsReceived: 0,
      computedDisposalErrorThrown: false,
      idempotentExtraDisposals: 0,
      repeated1000ProgrammaticCycles: false,
    };

    let customCleanupCount = 0;
    let timerCleaned = false;
    let listenerCleaned = false;
    const testScope = createScope({ name: "browser-programmatic-retention-test" });
    results.scopeCreated = true;

    testScope.use({ dispose: () => { customCleanupCount += 1; } });
    const timerId = setInterval(() => {}, 10000);
    testScope.use(() => { clearInterval(timerId); timerCleaned = true; });
    const dummyDiv = document.createElement("div");
    const dummyHandler = () => {};
    dummyDiv.addEventListener("custom-test", dummyHandler);
    testScope.use(() => { dummyDiv.removeEventListener("custom-test", dummyHandler); listenerCleaned = true; });

    let testState;
    let testDerived;
    let activeSubCalls = 0;
    let postDisposeSubCalls = 0;
    let scopeDisposed = false;

    testScope.run(() => {
      testState = state(10);
      testDerived = computed(() => testState.get() * 2);
      testDerived.subscribe(() => {
        if (scopeDisposed) postDisposeSubCalls += 1;
        else activeSubCalls += 1;
      });
    });

    testState.set(20);
    results.activeNotificationsReceived = activeSubCalls;

    scopeDisposed = true;
    testScope.dispose();
    results.resourcesDisposed = customCleanupCount;
    results.timerCleanedUp = timerCleaned;
    results.listenerCleanedUp = listenerCleaned;

    testState.set(100);
    results.staleNotificationsReceived = postDisposeSubCalls;

    try {
      testDerived.get();
    } catch (err) {
      if (err.message.includes("Computed is disposed")) results.computedDisposalErrorThrown = true;
    }

    testScope.dispose();
    results.idempotentExtraDisposals = customCleanupCount - 1;

    let programmaticErrors = 0;
    for (let i = 0; i < 1000; i += 1) {
      let cycleCleanups = 0;
      let cycleScopeDisposed = false;
      const scope = createScope();
      scope.use(() => { cycleCleanups += 1; });
      let count;
      let doubled;
      let doubledNotifications = 0;
      let staleDoubledNotifications = 0;

      scope.run(() => {
        count = state(i);
        doubled = computed(() => count.get() * 2);
        doubled.subscribe(() => {
          if (cycleScopeDisposed) staleDoubledNotifications += 1;
          else doubledNotifications += 1;
        });
      });

      count.set(i + 1);
      if (doubledNotifications !== 1) programmaticErrors += 1;
      cycleScopeDisposed = true;
      scope.dispose();
      if (cycleCleanups !== 1) programmaticErrors += 1;
      count.set(i + 999);
      if (staleDoubledNotifications !== 0) programmaticErrors += 1;
      scope.dispose();
      if (cycleCleanups !== 1) programmaticErrors += 1;
    }

    results.repeated1000ProgrammaticCycles = (programmaticErrors === 0);
    return results;
  })()`,
  returnByValue: true,
  awaitPromise: true,
});

async function runLifecycleMeasurement(iterations) {
  await collectGarbage();
  const baseline = await getMetrics();

  const probeEval = await send("Runtime.evaluate", {
    expression: `(() => {
      const start = performance.now();
      const root = document.querySelector("#app");
      if (!root) throw new Error("Root #app not found");
      const clickAction = (action) => {
        const btn = root.querySelector('[data-action="' + action + '"]');
        if (!btn) throw new Error("Button data-action=" + action + " not found");
        btn.click();
      };

      for (let i = 0; i < ${iterations}; i += 1) {
        clickAction("create-scope");
        clickAction("increment");
        clickAction("batch");
        clickAction("dispose-scope");
        const status = root.querySelector('.status')?.textContent?.trim();
        if (status !== "Scope disposed") {
          throw new Error("Scope was not disposed in iteration " + i + ", got: " + status);
        }
      }

      const elapsedMs = performance.now() - start;
      return {
        iterations: ${iterations},
        elapsedMs: Math.round(elapsedMs * 100) / 100,
        finalCount: Number(root.querySelector(".metrics dd")?.textContent ?? "-1"),
        finalStatus: root.querySelector('.status')?.textContent?.trim(),
      };
    })()`,
    returnByValue: true,
    awaitPromise: true,
  });

  if (probeEval.exceptionDetails) {
    throw new Error("Probe evaluation threw: " + JSON.stringify(probeEval.exceptionDetails));
  }

  const postDisposeNoGC = await getMetrics();
  await collectGarbage();
  const postDisposeWithGC = await getMetrics();

  return {
    iterations,
    probe: probeEval.result?.value,
    metrics: {
      baseline,
      postDisposeNoGC,
      postDisposeWithGC,
      heapDeltaBytes: postDisposeWithGC.JSHeapUsedSize - baseline.JSHeapUsedSize,
      nodeDelta: postDisposeWithGC.Nodes - baseline.Nodes,
      listenerDelta: postDisposeWithGC.JSEventListeners - baseline.JSEventListeners,
    },
  };
}

const run1 = await runLifecycleMeasurement(1);
const run100 = await runLifecycleMeasurement(100);
const run1000 = await runLifecycleMeasurement(1000);

await send("Target.closeTarget", { targetId });
await chromeSession.close();
server.close();

const source = gitSource();

const report = {
  schemaVersion: "0.1",
  suite: "vanilla-browser-retention",
  consumer: "vii-reference-vanilla-onboarding",
  revision: source.revision,
  workingTreeDirty: source.workingTreeDirty,
  environment: {
    node: process.version,
    platform: `${platform()} ${arch()} ${release()}`,
    cpu: cpus()[0]?.model ?? "unknown",
    browser: chromeVersion,
    browserHarness: "Chrome DevTools Protocol (CDP) via Node WebSocket",
  },
  consoleErrors: {
    count: consoleErrors.length,
    errors: consoleErrors,
  },
  phase1_domScopeLifecycle: phase1Result.result.value,
  phase2_programmaticScope: phase2Result.result.value,
  retentionRuns: [run1, run100, run1000],
  summary: {
    scopeCreatedAndExercised: phase1Result.result.value.postBatchCount === 3,
    scopeDisposedReported: phase1Result.result.value.postDisposeStatus === "Scope disposed",
    staleClicksBlocked:
      phase1Result.result.value.staleClicksDidNotMutate &&
      phase1Result.result.value.staleEventsDidNotEmit,
    programmaticScopeVerified:
      phase2Result.result.value.scopeCreated &&
      phase2Result.result.value.resourcesDisposed === 1 &&
      phase2Result.result.value.listenerCleanedUp &&
      phase2Result.result.value.timerCleanedUp &&
      phase2Result.result.value.staleNotificationsReceived === 0 &&
      phase2Result.result.value.repeated1000ProgrammaticCycles,
    repeat1000CyclesSuccessful: run1000.probe.iterations === 1000,
    zeroConsoleErrors: consoleErrors.length === 0,
    listenerLeakFree: run1000.metrics.listenerDelta <= 0,
    nodeLeakFree: run1000.metrics.nodeDelta <= 0,
    heapBounded: Math.abs(run1000.metrics.heapDeltaBytes) < 500_000,
  },
};

const resultsDir = join(root, "benchmarks/results");
if (existsSync(resultsDir)) {
  writeFileSync(
    join(resultsDir, "vanilla-browser-retention.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

console.log(JSON.stringify(report, null, 2));

function gitSource() {
  try {
    const revision = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {
      cwd: root,
      encoding: "utf8",
    });
    return { revision, workingTreeDirty: status.length > 0 };
  } catch {
    return { revision: "unknown", workingTreeDirty: false };
  }
}
