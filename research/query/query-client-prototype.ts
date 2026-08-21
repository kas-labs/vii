/**
 * @file ResearchQueryClient prototype with diagnostics, prefetching, dehydration, and hydration.
 * Research only: not a public package API or production implementation.
 */

import {
  type QueryKey,
  canonicalizeQueryKey,
  hashCanonicalKey,
  matchQueryKeyFamily,
} from "./query-key.js";
import {
  type QuerySnapshot,
  type FetchOptions,
  type QueryFunction,
  type OptimisticResult,
  QueryRecord,
} from "./query-record.js";
import { QueryObserver, type ObserverListener } from "./query-observer.js";
import { MutationRecord, type MutationOptions } from "./mutation-record.js";
import { type QueryDiagnosticSink, emitDiagnostic } from "./query-diagnostics.js";

export interface QueryClientConfig {
  readonly defaultStaleTime?: number;
  readonly defaultGcTime?: number;
  readonly sink?: QueryDiagnosticSink;
}

export interface QueryFilters {
  readonly key?: QueryKey;
  readonly exact?: boolean;
  readonly predicate?: (record: QueryRecord<unknown>) => boolean;
}

export class ResearchQueryClient {
  private readonly records = new Map<string, QueryRecord<unknown>>();
  readonly defaultStaleTime: number;
  readonly defaultGcTime: number;
  readonly sink?: QueryDiagnosticSink | undefined;
  private disposed = false;

  constructor(config?: QueryClientConfig) {
    this.defaultStaleTime = config?.defaultStaleTime ?? 0;
    this.defaultGcTime = config?.defaultGcTime ?? 5 * 60 * 1000; // 5 minutes
    this.sink = config?.sink;
  }

  get size(): number {
    return this.records.size;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  getRecord<T = unknown>(key: QueryKey): QueryRecord<T> {
    if (this.disposed) {
      throw new Error("Cannot access records on a disposed QueryClient");
    }
    const canonicalKey = canonicalizeQueryKey(key);
    let record = this.records.get(canonicalKey) as QueryRecord<T> | undefined;
    if (!record) {
      record = new QueryRecord<T>(canonicalKey, key, this.sink);
      this.records.set(canonicalKey, record as QueryRecord<unknown>);
    }
    return record;
  }

  hasRecord(key: QueryKey): boolean {
    const canonicalKey = canonicalizeQueryKey(key);
    return this.records.has(canonicalKey);
  }

  getAllRecords(): QueryRecord<unknown>[] {
    return Array.from(this.records.values());
  }

  fetchQuery<T>(key: QueryKey, queryFn: QueryFunction<T>, options?: FetchOptions): Promise<T> {
    const record = this.getRecord<T>(key);
    return record.fetch(queryFn, options);
  }

  async prefetchQuery<T>(key: QueryKey, queryFn: QueryFunction<T>): Promise<void> {
    const record = this.getRecord<T>(key);
    if (record.getSnapshot().status === "success" && !record.isStale(this.defaultStaleTime)) {
      emitDiagnostic(this.sink, {
        type: "query:cache_hit",
        timestamp: Date.now(),
        keyHash: record.keyHash,
        status: "fresh",
      });
      return;
    }
    emitDiagnostic(this.sink, {
      type: "query:cache_miss",
      timestamp: Date.now(),
      keyHash: record.keyHash,
      status: record.getSnapshot().status,
    });
    await record.fetch(queryFn);
  }

  observeQuery<T>(key: QueryKey, listener?: ObserverListener<T>): QueryObserver<T> {
    const record = this.getRecord<T>(key);
    const observer = new QueryObserver<T>(record, () => {
      if (record.observerCount === 0) {
        record.scheduleGc(this.defaultGcTime, (canonicalKey) => {
          this.records.delete(canonicalKey);
        });
      }
    });
    if (listener) {
      observer.subscribe(listener);
    }
    return observer;
  }

  createMutation<TData = unknown, TVariables = unknown, TContext = unknown>(
    options: MutationOptions<TData, TVariables, TContext>,
  ): MutationRecord<TData, TVariables, TContext> {
    return new MutationRecord<TData, TVariables, TContext>({
      ...options,
      sink: options.sink ?? this.sink,
    });
  }

  cancelQueries(filters?: QueryFilters): void {
    const matching = this.filterRecords(filters);
    for (const record of matching) {
      record.cancel();
    }
  }

  invalidateQueries(filters?: QueryFilters): void {
    const matching = this.filterRecords(filters);
    for (const record of matching) {
      record.invalidate();
    }
  }

  getQueryData<T>(key: QueryKey): T | undefined {
    const canonicalKey = canonicalizeQueryKey(key);
    const record = this.records.get(canonicalKey) as QueryRecord<T> | undefined;
    const data = record?.getSnapshot().data;
    if (record && data !== undefined) {
      emitDiagnostic(this.sink, {
        type: "query:cache_hit",
        timestamp: Date.now(),
        keyHash: record.keyHash,
      });
    } else {
      emitDiagnostic(this.sink, {
        type: "query:cache_miss",
        timestamp: Date.now(),
        keyHash: hashCanonicalKey(canonicalKey),
      });
    }
    return data;
  }

  getQueryState<T>(key: QueryKey): QuerySnapshot<T> | undefined {
    const canonicalKey = canonicalizeQueryKey(key);
    const record = this.records.get(canonicalKey) as QueryRecord<T> | undefined;
    return record?.getSnapshot();
  }

  setQueryData<T>(
    key: QueryKey,
    updaterOrData: T | ((prev: T | undefined) => T),
    dataUpdatedAt?: number,
  ): T {
    const record = this.getRecord<T>(key);
    const prev = record.getSnapshot().data;
    const next =
      typeof updaterOrData === "function"
        ? (updaterOrData as (prev: T | undefined) => T)(prev)
        : updaterOrData;
    record.setData(next, dataUpdatedAt);
    return next;
  }

  setOptimisticData<T>(key: QueryKey, data: T): OptimisticResult {
    const record = this.getRecord<T>(key);
    return record.setOptimisticData(data);
  }

  isStale(key: QueryKey, staleTime = this.defaultStaleTime): boolean {
    const canonicalKey = canonicalizeQueryKey(key);
    const record = this.records.get(canonicalKey);
    if (!record) {
      return true;
    }
    return record.isStale(staleTime);
  }

  clear(): void {
    for (const record of this.records.values()) {
      record.cancelGc();
      record.cancel();
    }
    this.records.clear();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.clear();
  }

  private filterRecords(filters?: QueryFilters): QueryRecord<unknown>[] {
    if (!filters) {
      return Array.from(this.records.values());
    }

    const results: QueryRecord<unknown>[] = [];
    for (const record of this.records.values()) {
      if (filters.predicate && !filters.predicate(record)) {
        continue;
      }
      if (filters.key !== undefined) {
        if (filters.exact) {
          const filterCanonical = canonicalizeQueryKey(filters.key);
          if (record.canonicalKey !== filterCanonical) {
            continue;
          }
        } else if (!matchQueryKeyFamily(filters.key, record.key)) {
          continue;
        }
      }
      results.push(record);
    }
    return results;
  }
}
