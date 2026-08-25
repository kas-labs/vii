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
  readonly status: "active" | "disposed";
}

export interface TraceResourceNode {
  readonly resourceId: string;
  readonly scopeId: string;
  readonly status: "attached" | "disposed";
  readonly succeeded?: boolean;
}

export const MAX_TRACE_EVENTS = 500_000;

export function inspectTrace(trace: TraceInspectionInput): TraceInspection {
  if (trace.protocol !== "vii.trace") {
    throw new TypeError("Unsupported diagnostics trace protocol");
  }
  if (trace.version !== "0.1") {
    throw new TypeError("Unsupported diagnostics trace version");
  }
  if (!Number.isSafeInteger(trace.droppedEvents) || trace.droppedEvents < 0) {
    throw new TypeError("Invalid diagnostics dropped-event count");
  }
  if (!Array.isArray(trace.events)) {
    throw new TypeError("Invalid diagnostics trace events: events must be an array");
  }
  if (trace.events.length > MAX_TRACE_EVENTS) {
    throw new TypeError(`Diagnostics trace exceeds maximum supported events (${MAX_TRACE_EVENTS})`);
  }

  const eventTypeCounts = new Map<string, number>();
  const scopes = new Map<string, TraceScopeNode>();
  const resources = new Map<string, TraceResourceNode>();

  for (const event of trace.events) {
    if (typeof event.type !== "string" || event.type.trim().length === 0) {
      throw new TypeError("Invalid diagnostics trace event type");
    }
    eventTypeCounts.set(event.type, (eventTypeCounts.get(event.type) ?? 0) + 1);

    if (event.type === "scope.created") {
      const scope = readScopeNode(event.payload);
      scopes.set(scope.scopeId, scope);
    } else if (event.type === "resource.attached") {
      const resource = readResourceNode(event.payload);
      resources.set(resource.resourceId, resource);
    } else if (event.type === "scope.disposed") {
      recordDisposedScope(scopes, event.payload);
    } else if (event.type === "resource.disposed") {
      recordDisposedResource(resources, event.payload);
    }
  }

  return {
    protocol: trace.protocol,
    version: trace.version,
    eventCount: trace.events.length,
    droppedEvents: trace.droppedEvents,
    eventTypes: Array.from(eventTypeCounts, ([type, count]) => ({ type, count })),
    scopeGraph: {
      scopes: Array.from(scopes.values()),
      resources: Array.from(resources.values()),
    },
  };
}

function readScopeNode(payload: Readonly<Record<string, unknown>> | undefined): TraceScopeNode {
  const scopeId = readRequiredString(payload, "scopeId", "scope");
  const parentScopeId = readOptionalString(payload, "parentScopeId", "scope");

  return {
    scopeId,
    status: "active",
    ...(parentScopeId === undefined ? {} : { parentScopeId }),
  };
}

function readResourceNode(
  payload: Readonly<Record<string, unknown>> | undefined,
): TraceResourceNode {
  return {
    resourceId: readRequiredString(payload, "resourceId", "resource"),
    scopeId: readRequiredString(payload, "scopeId", "resource"),
    status: "attached",
  };
}

function recordDisposedScope(
  scopes: Map<string, TraceScopeNode>,
  payload: Readonly<Record<string, unknown>> | undefined,
): void {
  const scopeId = readRequiredString(payload, "scopeId", "scope");
  const existing = scopes.get(scopeId);
  scopes.set(scopeId, {
    scopeId,
    ...(existing?.parentScopeId === undefined ? {} : { parentScopeId: existing.parentScopeId }),
    status: "disposed",
  });
}

function recordDisposedResource(
  resources: Map<string, TraceResourceNode>,
  payload: Readonly<Record<string, unknown>> | undefined,
): void {
  const resourceId = readRequiredString(payload, "resourceId", "resource");
  const scopeId = readRequiredString(payload, "scopeId", "resource");
  const succeeded = payload?.["succeeded"];
  if (typeof succeeded !== "boolean") {
    throw new TypeError("Invalid diagnostics resource event payload");
  }

  resources.set(resourceId, { resourceId, scopeId, status: "disposed", succeeded });
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
