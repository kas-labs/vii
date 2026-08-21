/**
 * @file ResearchQueryClient prototype for explicit ownership and request deduplication.
 * Research only: not a public package API or production implementation.
 */

import { type QueryKey, canonicalizeQueryKey } from "./query-key.js";
import { type QuerySnapshot, type FetchOptions, QueryRecord } from "./query-record.js";
import { QueryObserver, type ObserverListener } from "./query-observer.js";

export class ResearchQueryClient {
  private readonly records = new Map<string, QueryRecord<unknown>>();
  private disposed = false;

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
      record = new QueryRecord<T>(canonicalKey, key);
      this.records.set(canonicalKey, record as QueryRecord<unknown>);
    }
    return record;
  }

  fetchQuery<T>(key: QueryKey, queryFn: () => Promise<T>, options?: FetchOptions): Promise<T> {
    const record = this.getRecord<T>(key);
    return record.fetch(queryFn, options);
  }

  observeQuery<T>(key: QueryKey, listener?: ObserverListener<T>): QueryObserver<T> {
    const record = this.getRecord<T>(key);
    const observer = new QueryObserver<T>(record);
    if (listener) {
      observer.subscribe(listener);
    }
    return observer;
  }

  getQueryData<T>(key: QueryKey): T | undefined {
    const canonicalKey = canonicalizeQueryKey(key);
    const record = this.records.get(canonicalKey) as QueryRecord<T> | undefined;
    return record?.getSnapshot().data;
  }

  getQueryState<T>(key: QueryKey): QuerySnapshot<T> | undefined {
    const canonicalKey = canonicalizeQueryKey(key);
    const record = this.records.get(canonicalKey) as QueryRecord<T> | undefined;
    return record?.getSnapshot();
  }

  setQueryData<T>(key: QueryKey, data: T): void {
    const record = this.getRecord<T>(key);
    record.setData(data);
  }

  clear(): void {
    this.records.clear();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.records.clear();
  }
}
