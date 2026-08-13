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
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface TraceInspection {
  readonly protocol: "vii.trace";
  readonly version: "0.1";
  readonly eventCount: number;
  readonly droppedEvents: number;
  readonly eventTypes: readonly TraceInspectionEventType[];
  readonly scopeGraph: TraceScopeGraph;
}

export interface TraceInspectionEventType {
  readonly type: string;
  readonly count: number;
}

export interface TraceScopeGraph {
  readonly scopes: readonly TraceScopeNode[];
  readonly resources: readonly TraceResourceNode[];
}

export interface TraceScopeNode {
  readonly scopeId: string;
  readonly parentScopeId?: string;
}

export interface TraceResourceNode {
  readonly resourceId: string;
  readonly scopeId: string;
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
  const scopes: TraceScopeNode[] = [];
  const resources: TraceResourceNode[] = [];

  for (const event of trace.events) {
    if (typeof event.type !== "string" || event.type.trim().length === 0) {
      throw new TypeError("Invalid diagnostics trace event type");
    }
    eventTypeCounts.set(event.type, (eventTypeCounts.get(event.type) ?? 0) + 1);

    if (event.type === "scope.created") {
      scopes.push(readScopeNode(event.payload));
    } else if (event.type === "resource.attached") {
      resources.push(readResourceNode(event.payload));
    }
  }

  return {
    protocol: trace.protocol,
    version: trace.version,
    eventCount: trace.events.length,
    droppedEvents: trace.droppedEvents,
    eventTypes: Array.from(eventTypeCounts, ([type, count]) => ({ type, count })),
    scopeGraph: { scopes, resources },
  };
}

function readScopeNode(payload: Readonly<Record<string, unknown>> | undefined): TraceScopeNode {
  const scopeId = readRequiredString(payload, "scopeId", "scope");
  const parentScopeId = readOptionalString(payload, "parentScopeId", "scope");

  return {
    scopeId,
    ...(parentScopeId === undefined ? {} : { parentScopeId }),
  };
}

function readResourceNode(
  payload: Readonly<Record<string, unknown>> | undefined,
): TraceResourceNode {
  return {
    resourceId: readRequiredString(payload, "resourceId", "resource"),
    scopeId: readRequiredString(payload, "scopeId", "resource"),
  };
}

function readRequiredString(
  payload: Readonly<Record<string, unknown>> | undefined,
  field: string,
  entity: string,
): string {
  const value = payload?.[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`Invalid diagnostics ${entity} event payload`);
  }
  return value;
}

function readOptionalString(
  payload: Readonly<Record<string, unknown>> | undefined,
  field: string,
  entity: string,
): string | undefined {
  const value = payload?.[field];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`Invalid diagnostics ${entity} event payload`);
  }
  return value;
}
