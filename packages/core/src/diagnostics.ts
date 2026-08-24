export type DiagnosticsMode = "off" | "development" | "production-safe";

const securityMetadataLimit = 128;

export type SecurityDiagnosticCode =
  | "VII-SEC-001"
  | "VII-SEC-002"
  | "VII-SEC-003"
  | "VII-SEC-004"
  | "VII-SEC-005"
  | "VII-SEC-006"
  | "VII-SEC-007"
  | "VII-SEC-008"
  | "VII-SEC-009"
  | "VII-SEC-010"
  | "VII-SEC-011"
  | "VII-SEC-012"
  | "VII-SEC-013"
  | "VII-SEC-014"
  | "VII-SEC-015";

export type SecurityDiagnosticSurface =
  | "input"
  | "template"
  | "url"
  | "serialization"
  | "command"
  | "path"
  | "filesystem"
  | "registry"
  | "capability"
  | "request";

export type SecurityDiagnosticReason =
  | "rejected"
  | "blocked"
  | "truncated"
  | "malformed"
  | "denied"
  | "integrity_mismatch"
  | "isolation_violation"
  | "unsupported_policy";

export interface SecurityDiagnosticInput {
  readonly code: SecurityDiagnosticCode;
  readonly surface: SecurityDiagnosticSurface;
  readonly reason: SecurityDiagnosticReason;
  readonly field?: string;
  readonly route?: string;
  readonly causeId?: string;
}

export interface DiagnosticEvent {
  protocolVersion: "0.1";
  id: string;
  type: string;
  timestamp: number;
  traceId?: string;
  package: "@vii-labs/core";
  causeId?: string;
  payload: Readonly<Record<string, unknown>>;
}

export interface DiagnosticSink {
  emit(event: DiagnosticEvent): void;
}

export interface DiagnosticTrace {
  protocol: "vii.trace";
  version: "0.1";
  createdAt: string;
  events: readonly DiagnosticEvent[];
  droppedEvents: number;
  traceId?: string;
}

export interface DiagnosticsOptions {
  mode?: DiagnosticsMode;
  maxEvents?: number;
  traceId?: string;
  sink?: DiagnosticSink;
  clock?: () => number;
}

export interface Diagnostics {
  readonly mode: DiagnosticsMode;
  readonly droppedEvents: number;
  /**
   * Runs the provided work function synchronously within this diagnostics context.
   * Asynchronous functions returning thenables or Promises are rejected.
   */
  run<T>(work: () => T): T;
  recordSecurity(input: SecurityDiagnosticInput): void;
  getEvents(): readonly DiagnosticEvent[];
  exportTrace(): DiagnosticTrace;
  clear(): void;
}

export interface DiagnosticsRuntime extends Diagnostics {
  allocateId(prefix: string): string;
  record(type: string, payload: Readonly<Record<string, unknown>>, causeId?: string): void;
}

let activeDiagnostics: DiagnosticsRuntime | undefined;

export function getActiveDiagnostics(): DiagnosticsRuntime | undefined {
  return activeDiagnostics;
}

function suppressUnhandledRejection(value: unknown): void {
  try {
    if (
      value !== null &&
      (typeof value === "object" || typeof value === "function") &&
      typeof (value as { then?: unknown }).then === "function"
    ) {
      Promise.resolve(value).catch(() => {});
    }
  } catch {
    // Ignore defensive suppression failures on hostile thenables
  }
}

export function withDiagnostics<T>(diagnostics: DiagnosticsRuntime, work: () => T): T {
  const previousDiagnostics = activeDiagnostics;
  activeDiagnostics = diagnostics;

  try {
    const result = work();
    if (
      result !== null &&
      (typeof result === "object" || typeof result === "function") &&
      typeof (result as { then?: unknown }).then === "function"
    ) {
      suppressUnhandledRejection(result);
      throw new TypeError(
        "Diagnostics.run does not support asynchronous execution. Diagnostics context cannot be preserved across await.",
      );
    }
    return result;
  } finally {
    activeDiagnostics = previousDiagnostics;
  }
}

export function createDiagnostics(options: DiagnosticsOptions = {}): Diagnostics {
  const mode = options.mode ?? "development";
  const maxEvents = options.maxEvents ?? 1000;

  if (!Number.isInteger(maxEvents) || maxEvents < 1) {
    throw new RangeError("Diagnostics maxEvents must be a positive integer");
  }

  const events: DiagnosticEvent[] = [];
  const clock = options.clock ?? Date.now;
  const traceId = mode === "production-safe" ? undefined : options.traceId;
  const sink = options.sink;
  let nextEventId = 1;
  let nextEntityId = 1;
  let droppedEvents = 0;

  const diagnostics: DiagnosticsRuntime = {
    mode,
    get droppedEvents() {
      return droppedEvents;
    },
    run: <T>(work: () => T): T => withDiagnostics(diagnostics, work),
    recordSecurity: (input) => {
      if (mode === "off") {
        return;
      }

      const field = normalizeSecurityMetadata(input.field);
      const route = normalizeSecurityMetadata(input.route);
      const metadata =
        mode === "development"
          ? {
              ...(field === undefined ? {} : { field }),
              ...(route === undefined ? {} : { route }),
            }
          : {};

      diagnostics.record(
        "security.event",
        {
          code: input.code,
          surface: input.surface,
          reason: input.reason,
          ...metadata,
        },
        input.causeId,
      );
    },
    allocateId: (prefix) => `${prefix}-${nextEntityId++}`,
    getEvents: () => events.slice(),
    exportTrace: () => {
      let timestamp = 0;
      try {
        timestamp = clock();
      } catch {
        // Trace timestamps are observers and must not affect runtime behavior.
      }

      let createdAt = new Date(0).toISOString();
      try {
        createdAt = new Date(timestamp).toISOString();
      } catch {
        // Invalid diagnostic timestamps fall back to the Unix epoch.
      }

      return {
        protocol: "vii.trace",
        version: "0.1",
        createdAt,
        events: Object.freeze(events.slice()),
        droppedEvents,
        ...(traceId === undefined ? {} : { traceId }),
      };
    },
    clear: () => {
      events.length = 0;
      droppedEvents = 0;
    },
    record: (type, payload, causeId) => {
      if (mode === "off") {
        return;
      }

      let timestamp = 0;
      try {
        timestamp = clock();
      } catch {
        // Diagnostic clocks are observers and must not affect runtime behavior.
      }

      const event: DiagnosticEvent = {
        protocolVersion: "0.1",
        id: `diagnostic-${nextEventId++}`,
        type,
        timestamp,
        ...(traceId === undefined ? {} : { traceId }),
        package: "@vii-labs/core",
        payload: Object.freeze(redactPayload(mode, type, payload)),
        ...(causeId === undefined ? {} : { causeId }),
      };

      if (events.length === maxEvents) {
        events.shift();
        droppedEvents += 1;
      }
      events.push(Object.freeze(event));

      if (sink !== undefined) {
        try {
          sink.emit(event);
        } catch {
          // Diagnostic sinks are observers and must not affect runtime behavior.
        }
      }
    },
  };

  return diagnostics;
}

function redactPayload(
  mode: DiagnosticsMode,
  type: string,
  payload: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  if (mode !== "production-safe" || type !== "scope.created" || !("name" in payload)) {
    return { ...payload };
  }

  const redactedPayload = { ...payload };
  delete redactedPayload["name"];
  return redactedPayload;
}

function normalizeSecurityMetadata(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.replace(/[\r\n]/g, "").slice(0, securityMetadataLimit);
  return normalized.length === 0 ? undefined : normalized;
}
