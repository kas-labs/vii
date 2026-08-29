import type { FieldPathSegment, ValidationIssue } from "./types.js";

/**
 * Sanitizes and normalizes an untrusted validation rule issue into a safe, frozen ValidationIssue.
 * Defends against prototype pollution on issue codes and validates path segment structure.
 */
export function sanitizeValidationIssue(
  raw: unknown,
  defaultPath?: readonly FieldPathSegment[],
): ValidationIssue {
  if (raw === null || typeof raw !== "object") {
    throw new TypeError(
      `Validation rule returned invalid issue shape: expected an object, received ${
        raw === null ? "null" : typeof raw
      }`,
    );
  }

  const rawObj = raw as Record<string, unknown>;
  const rawCode = rawObj["code"];

  if (typeof rawCode !== "string" || rawCode.trim() === "") {
    throw new TypeError(`Validation issue "code" must be a non-empty string`);
  }

  let sanitizedPath: readonly FieldPathSegment[] | undefined = defaultPath;
  if (rawObj["path"] !== undefined && rawObj["path"] !== null) {
    if (!Array.isArray(rawObj["path"])) {
      throw new TypeError(`Validation issue "path" must be an array`);
    }
    const segments: FieldPathSegment[] = [];
    for (let i = 0; i < rawObj["path"].length; i++) {
      const seg = rawObj["path"][i];
      if (typeof seg === "string" || typeof seg === "number") {
        segments.push(seg);
      } else {
        throw new TypeError(
          `Validation issue path segment must be string or number, received ${typeof seg}`,
        );
      }
    }
    sanitizedPath = Object.freeze(segments);
  }

  const message = typeof rawObj["message"] === "string" ? rawObj["message"] : undefined;
  const ruleId = typeof rawObj["ruleId"] === "string" ? rawObj["ruleId"] : undefined;

  return Object.freeze({
    code: rawCode,
    message,
    path: sanitizedPath,
    source: "validation",
    ruleId,
  });
}

/**
 * Manages monotonic validation revision tracking, active AbortControllers, and debounce timers.
 */
export class ValidationRevisionController {
  private _revision = 0;
  private _activeController: AbortController | null = null;
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  public get currentRevision(): number {
    return this._revision;
  }

  public cancelActive(): void {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    if (this._activeController !== null) {
      this._activeController.abort();
      this._activeController = null;
    }
  }

  public nextGeneration(): { revision: number; controller: AbortController } {
    this.cancelActive();
    const revision = ++this._revision;
    const controller = new AbortController();
    this._activeController = controller;
    return { revision, controller };
  }

  public setDebounceTimer(timer: ReturnType<typeof setTimeout>): void {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
    }
    this._debounceTimer = timer;
  }

  public clearDebounceTimer(): void {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }

  public isCurrent(revision: number, signal?: AbortSignal): boolean {
    return this._revision === revision && (signal === undefined || !signal.aborted);
  }

  public releaseController(controller: AbortController): void {
    if (this._activeController === controller) {
      this._activeController = null;
    }
  }
}
