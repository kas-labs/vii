export interface TraceInspectionInput {
  readonly protocol: string;
  readonly version: string;
  readonly createdAt: string;
  readonly traceId?: string;
  readonly events: readonly TraceInspectionEvent[];
  readonly droppedEvents: number;
}

export interface TraceInspectionEvent {
  readonly type: string;
}

export interface TraceInspection {
  readonly protocol: "vii.trace";
  readonly version: "0.1";
  readonly eventCount: number;
  readonly droppedEvents: number;
  readonly eventTypes: readonly TraceInspectionEventType[];
}

export interface TraceInspectionEventType {
  readonly type: string;
  readonly count: number;
}

export function inspectTrace(trace: TraceInspectionInput): TraceInspection {
  if (trace.protocol !== "vii.trace") {
    throw new TypeError("Unsupported diagnostics trace protocol");
  }
  if (trace.version !== "0.1") {
    throw new TypeError("Unsupported diagnostics trace version");
  }
  if (!Number.isInteger(trace.droppedEvents) || trace.droppedEvents < 0) {
    throw new TypeError("Invalid diagnostics dropped-event count");
  }

  const eventTypeCounts = new Map<string, number>();

  for (const event of trace.events) {
    if (typeof event.type !== "string" || event.type.trim().length === 0) {
      throw new TypeError("Invalid diagnostics trace event type");
    }
    eventTypeCounts.set(event.type, (eventTypeCounts.get(event.type) ?? 0) + 1);
  }

  return {
    protocol: trace.protocol,
    version: trace.version,
    eventCount: trace.events.length,
    droppedEvents: trace.droppedEvents,
    eventTypes: Array.from(eventTypeCounts, ([type, count]) => ({ type, count })),
  };
}
