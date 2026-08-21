import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function findChromeBinary() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.GOOGLE_CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean);

  const found = candidates.find((c) => existsSync(c));
  if (!found) {
    throw new Error("Google Chrome binary not found. Set CHROME_PATH or install Google Chrome.");
  }
  return found;
}

export class CDPClient {
  constructor(url) {
    this.ws = new globalThis.WebSocket(url);
    this.id = 0;
    this.callbacks = new Map();
    this.eventListeners = new Map();
    this.ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id !== undefined && this.callbacks.has(data.id)) {
        const { resolveCb, rejectCb } = this.callbacks.get(data.id);
        this.callbacks.delete(data.id);
        if (data.error) rejectCb(new Error(data.error.message));
        else resolveCb(data.result);
      } else if (data.method && this.eventListeners.has(data.method)) {
        for (const listener of this.eventListeners.get(data.method)) {
          listener(data.params);
        }
      }
    };
  }

  ready() {
    return new Promise((resolveReady, rejectReady) => {
      if (this.ws.readyState === globalThis.WebSocket.OPEN) return resolveReady();
      this.ws.onopen = () => resolveReady();
      this.ws.onerror = (err) => rejectReady(err);
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolveCb, rejectCb) => {
      this.callbacks.set(id, { resolveCb, rejectCb });
      const msg = { id, method, params };
      if (sessionId) msg.sessionId = sessionId;
      this.ws.send(JSON.stringify(msg));
    });
  }

  on(method, callback) {
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, []);
    }
    this.eventListeners.get(method).push(callback);
  }

  close() {
    this.ws.close();
  }
}

export async function launchHeadlessChrome(chromePath) {
  const userDataDir = mkdtempSync(join(tmpdir(), "vii-chrome-retention-"));
  const chromeProc = spawn(chromePath, [
    "--headless=new",
    "--remote-debugging-port=0",
    "--js-flags=--expose-gc",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--disable-sync",
    "--disable-background-networking",
    "--disable-extensions",
  ]);

  let wsEndpoint = "";
  chromeProc.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    const match = text.match(
      /DevTools listening on (ws:\/\/127\.0\.0\.1:\d+\/devtools\/browser\/[^\s]+)/,
    );
    if (match && !wsEndpoint) {
      wsEndpoint = match[1];
    }
  });

  for (let i = 0; i < 60 && !wsEndpoint; i += 1) {
    await new Promise((r) => setTimeout(r, 100));
  }

  if (!wsEndpoint) {
    chromeProc.kill("SIGKILL");
    rmSync(userDataDir, { recursive: true, force: true });
    throw new Error("Failed to obtain Chrome DevTools WebSocket endpoint");
  }

  const client = new CDPClient(wsEndpoint);
  await client.ready();

  return {
    client,
    async close() {
      client.close();
      chromeProc.kill("SIGKILL");
      await new Promise((r) => setTimeout(r, 300));
      try {
        rmSync(userDataDir, { recursive: true, force: true });
      } catch {
        // Ignored
      }
    },
  };
}
