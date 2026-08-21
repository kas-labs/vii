/**
 * @file Dehydration, versioned wire envelope, and hardened client hydration.
 * Research only: not a public package API or production implementation.
 */

import { type QueryKey, validateQueryKey } from "./query-key.js";
import { type ResearchQueryClient } from "./query-client-prototype.js";
import { type QueryRecord } from "./query-record.js";

export class HydrationValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`Hydration validation error [${code}]: ${message}`);
    this.name = "HydrationValidationError";
    this.code = code;
  }
}

export interface HydratedQuery<TData = unknown> {
  readonly key: QueryKey;
  readonly data: TData;
  readonly dataUpdatedAt: number;
}

export interface QueryHydrationEnvelope {
  readonly protocol: "vii.query";
  readonly version: 1;
  readonly queries: readonly HydratedQuery[];
}

export interface DehydrateOptions {
  readonly shouldDehydrateQuery?: (record: QueryRecord<unknown>) => boolean;
}

export interface HydrateOptions {
  readonly maxQueries?: number;
  readonly maxFutureSkewMs?: number;
}

export function dehydrate(
  client: ResearchQueryClient,
  options?: DehydrateOptions,
): QueryHydrationEnvelope {
  const queries: HydratedQuery[] = [];
  const records = client.getAllRecords();

  for (const record of records) {
    const snap = record.getSnapshot();
    if (snap.status === "success" && snap.data !== undefined) {
      if (options?.shouldDehydrateQuery && !options.shouldDehydrateQuery(record)) {
        continue;
      }
      queries.push({
        key: record.key,
        data: snap.data,
        dataUpdatedAt: snap.dataUpdatedAt,
      });
    }
  }

  return {
    protocol: "vii.query",
    version: 1,
    queries,
  };
}

export function hydrate(
  client: ResearchQueryClient,
  envelope: unknown,
  options?: HydrateOptions,
): { hydratedCount: number } {
  if (typeof envelope !== "object" || envelope === null || Array.isArray(envelope)) {
    throw new HydrationValidationError("INVALID_ENVELOPE", "Envelope must be a non-null object");
  }

  const raw = envelope as Record<string, unknown>;

  if (raw.protocol !== "vii.query") {
    throw new HydrationValidationError(
      "UNSUPPORTED_PROTOCOL",
      `Expected protocol 'vii.query', received '${String(raw.protocol)}'`,
    );
  }

  if (raw.version !== 1) {
    throw new HydrationValidationError(
      "UNSUPPORTED_VERSION",
      `Expected protocol version 1, received '${String(raw.version)}'`,
    );
  }

  if (!Array.isArray(raw.queries)) {
    throw new HydrationValidationError("INVALID_QUERIES", "'queries' must be an array");
  }

  const maxQueries = options?.maxQueries ?? 1000;
  if (raw.queries.length > maxQueries) {
    throw new HydrationValidationError(
      "PAYLOAD_OVERSIZED",
      `Payload query count (${raw.queries.length}) exceeds maximum limit (${maxQueries})`,
    );
  }

  const now = Date.now();
  const maxFutureSkewMs = options?.maxFutureSkewMs ?? 60_000;
  let hydratedCount = 0;

  for (const item of raw.queries) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new HydrationValidationError("INVALID_ENTRY", "Query entry must be a non-null object");
    }

    const entry = item as Record<string, unknown>;
    if (!("key" in entry) || !("data" in entry) || !("dataUpdatedAt" in entry)) {
      throw new HydrationValidationError(
        "MISSING_FIELDS",
        "Entry missing key, data, or dataUpdatedAt",
      );
    }

    try {
      validateQueryKey(entry.key as QueryKey);
    } catch (err) {
      throw new HydrationValidationError(
        "INVALID_QUERY_KEY",
        `Invalid QueryKey in hydration entry: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const ts = entry.dataUpdatedAt;
    if (typeof ts !== "number" || !Number.isFinite(ts) || ts <= 0 || ts > now + maxFutureSkewMs) {
      throw new HydrationValidationError(
        "INVALID_TIMESTAMP",
        `Invalid dataUpdatedAt timestamp: ${String(ts)}`,
      );
    }

    client.setQueryData(entry.key as QueryKey, entry.data, ts);
    hydratedCount += 1;
  }

  return { hydratedCount };
}
