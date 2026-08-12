export type DiagnosticsMode = "off" | "development" | "production-safe";

export interface DiagnosticEvent {
  protocolVersion: "0.1";
  id: string;
  type: string;
  timestamp: number;
  package: "@vii/core";
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
}

export interface DiagnosticsOptions {
  mode?: DiagnosticsMode;
  maxEvents?: number;
  sink?: DiagnosticSink;
  clock?: () => number;
}

export interface Diagnostics {
  readonly mode: DiagnosticsMode;
  readonly droppedEvents: number;
  run<T>(work: () => T): T;
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

export function withDiagnostics<T>(diagnostics: DiagnosticsRuntime, work: () => T): T {
  const previousDiagnostics = activeDiagnostics;
  activeDiagnostics = diagnostics;

  try {
    return work();
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
        package: "@vii/core",
        payload: Object.freeze({ ...payload }),
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
