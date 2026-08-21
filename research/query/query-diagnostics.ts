/**
 * @file Value-safe structural diagnostics for Query and Mutation lifecycles.
 * Research only: not a public package API or production implementation.
 */

export type QueryDiagnosticEventType =
  | "query:cache_hit"
  | "query:cache_miss"
  | "query:fetch_started"
  | "query:fetch_deduplicated"
  | "query:fetch_succeeded"
  | "query:fetch_failed"
  | "query:fetch_cancelled"
  | "query:invalidated"
  | "query:observer_added"
  | "query:observer_removed"
  | "query:gc_scheduled"
  | "query:gc_cancelled"
  | "query:gc_evicted"
  | "query:dehydrated"
  | "query:hydrated"
  | "mutation:started"
  | "mutation:succeeded"
  | "mutation:failed"
  | "mutation:cancelled"
  | "mutation:rollback";

export interface QueryDiagnosticEvent {
  readonly type: QueryDiagnosticEventType;
  readonly timestamp: number;
  readonly keyHash?: number | undefined;
  readonly generation?: number | undefined;
  readonly durationMs?: number | undefined;
  readonly observerCount?: number | undefined;
  readonly status?: string | undefined;
  readonly reason?: string | undefined;
  readonly count?: number | undefined;
}

export type QueryDiagnosticSink = (event: QueryDiagnosticEvent) => void;

export function emitDiagnostic(
  sink: QueryDiagnosticSink | undefined,
  event: QueryDiagnosticEvent,
): void {
  if (!sink) {
    return;
  }
  try {
    sink(event);
  } catch {
    // Sinks must never disrupt execution semantics
  }
}
