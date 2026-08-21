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

let currentCSP = "";

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
    const headers = {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    };
    if (currentCSP) {
      headers["Content-Security-Policy"] = currentCSP;
    }
    res.writeHead(200, headers);
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

async function testScenario(cspHeader, suiteName) {
  currentCSP = cspHeader;

  const { browserContextId } = await browserClient.send("Target.createBrowserContext");
  const targetUrl = `${serverUrl}/?suite=${suiteName}&t=${Date.now()}`;
  const { targetId } = await browserClient.send("Target.createTarget", {
    url: "about:blank",
    browserContextId,
  });
  const { sessionId } = await browserClient.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  const send = (method, params = {}) => browserClient.send(method, params, sessionId);

  const consoleErrors = [];
  const cspViolations = [];

  const consoleListener = (params) => {
    if (params.type === "error" || params.type === "assert") {
      consoleErrors.push({
        type: params.type,
        text: params.args?.map((a) => a.value ?? JSON.stringify(a)).join(" ") ?? "",
      });
    }
  };

  const exceptionListener = (params) => {
    consoleErrors.push({
      type: "exception",
      text:
        params.exceptionDetails?.text ??
        params.exceptionDetails?.exception?.description ??
        "Uncaught exception",
    });
  };

  browserClient.on("Runtime.consoleAPICalled", consoleListener);
  browserClient.on("Runtime.exceptionThrown", exceptionListener);

  await send("Page.enable");
  await send("Runtime.enable");

  await send("Page.navigate", { url: targetUrl });
  await new Promise((r) => setTimeout(r, 1000));

  const evaluationResult = await send("Runtime.evaluate", {
    expression: `(async () => {
      const violations = [];
      document.addEventListener("securitypolicyviolation", (e) => {
        violations.push({
          violatedDirective: e.violatedDirective,
          effectiveDirective: e.effectiveDirective,
          blockedURI: e.blockedURI,
          disposition: e.disposition,
        });
      });

      const root = document.querySelector("#app");
      if (!root) throw new Error("Root #app not found");

      for (let i = 0; i < 100; i += 1) {
        if (root.querySelector('[data-action="create-scope"]')) break;
        await new Promise((r) => setTimeout(r, 50));
      }

      const createBtn = root.querySelector('[data-action="create-scope"]');
      if (!createBtn) {
        throw new Error("data-action=create-scope not found in #app. HTML: " + root.innerHTML);
      }

      const getBtn = (action) => root.querySelector('[data-action="' + action + '"]');
      const getCount = () => Number(root.querySelector(".metrics dd")?.textContent ?? "-1");
      const getStatus = () => root.querySelector(".status")?.textContent?.trim();

      // 1. Exercise DOM UI Scope Lifecycle
      getBtn("create-scope")?.click();
      const countAfterCreate = getCount();
      const statusAfterCreate = getStatus();

      getBtn("increment")?.click();
      const countAfterInc = getCount();

      getBtn("batch")?.click();
      const countAfterBatch = getCount();

      getBtn("dispose-scope")?.click();
      const statusAfterDispose = getStatus();

      // 2. Programmatic Core Scope Verification under CSP
      const { createScope, state, computed, batch } = await import('/core/index.js');
      let programmaticPass = false;
      const testScope = createScope({ name: "csp-programmatic-test" });
      let derivedVal = 0;
      testScope.run(() => {
        const s = state(5);
        const c = computed(() => s.get() * 3);
        c.subscribe((v) => { derivedVal = v; });
        batch(() => { s.set(10); });
      });
      testScope.dispose();
      programmaticPass = (derivedVal === 30);

      // 3. Negative CSP enforcement probe (eval attempt)
      let evalBlocked = false;
      try {
        window.eval("1 + 1");
      } catch {
        evalBlocked = true;
      }

      return {
        suiteName: "${suiteName}",
        countAfterCreate: Number(countAfterCreate),
        statusAfterCreate: String(statusAfterCreate),
        countAfterInc: Number(countAfterInc),
        countAfterBatch: Number(countAfterBatch),
        statusAfterDispose: String(statusAfterDispose),
        programmaticPass: Boolean(programmaticPass),
        evalBlocked: Boolean(evalBlocked),
        violationsCount: violations.length,
      };
    })()`,
    returnByValue: true,
    awaitPromise: true,
  });

  await send("Target.closeTarget", { targetId });
  await browserClient.send("Target.disposeBrowserContext", { browserContextId });

  const resValue = evaluationResult.result?.value;
  const resError = evaluationResult.exceptionDetails || evaluationResult.result?.description;

  const isAppError = (err) => !err.text?.includes("Uncaught") && !err.text?.includes("EvalError");
  const filteredErrors = consoleErrors.filter(isAppError);

  return {
    suiteName,
    cspHeader,
    result: resValue ?? { error: resError },
    consoleErrors: filteredErrors,
    cspViolations,
  };
}

// 1. Strict Baseline CSP (No unsafe-inline, No unsafe-eval for scripts)
const strictCSP =
  "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; object-src 'none'; frame-ancestors 'none';";
const runStrict = await testScenario(strictCSP, "strict-baseline-csp");

// 2. Strict CSP with Trusted Types requirement and allowed default policy
const trustedTypesCSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types default;";
const runTrustedTypes = await testScenario(trustedTypesCSP, "strict-trusted-types-csp");

await chromeSession.close();
server.close();

const source = gitSource();

const report = {
  schemaVersion: "0.1",
  suite: "vanilla-browser-csp",
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
  scenarios: [runStrict, runTrustedTypes],
  summary: {
    strictCspLifecyclePassed:
      runStrict.result?.countAfterBatch === 3 &&
      runStrict.result?.statusAfterDispose === "Scope disposed" &&
      runStrict.result?.programmaticPass &&
      runStrict.result?.violationsCount === 0,
    trustedTypesLifecyclePassed:
      runTrustedTypes.result?.countAfterBatch === 3 &&
      runTrustedTypes.result?.statusAfterDispose === "Scope disposed" &&
      runTrustedTypes.result?.programmaticPass &&
      runTrustedTypes.result?.violationsCount === 0,
    evalSuccessfullyBlockedByCSP: Boolean(
      runStrict.result?.evalBlocked && runTrustedTypes.result?.evalBlocked,
    ),
    zeroConsoleErrors:
      runStrict.consoleErrors.length === 0 && runTrustedTypes.consoleErrors.length === 0,
  },
};

const resultsDir = join(root, "benchmarks/results");
if (existsSync(resultsDir)) {
  writeFileSync(
    join(resultsDir, "vanilla-browser-csp.json"),
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
