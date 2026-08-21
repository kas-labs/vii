/**
 * @file Framework-neutral QueryObserver prototype.
 * Research only: not a public package API or production implementation.
 */

import { type QueryRecord, type QuerySnapshot } from "./query-record.js";

export type ObserverListener<T> = (snapshot: QuerySnapshot<T>) => void;

export class QueryObserver<T = unknown> {
  private readonly record: QueryRecord<T>;
  private unsubscribeFromRecord?: (() => void) | undefined;
  private readonly listeners = new Set<ObserverListener<T>>();
  private disposed = false;

  constructor(record: QueryRecord<T>) {
    this.record = record;
    this.unsubscribeFromRecord = record.subscribe((snapshot) => {
      if (!this.disposed) {
        for (const listener of this.listeners) {
          listener(snapshot);
        }
      }
    });
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  getSnapshot(): QuerySnapshot<T> {
    return this.record.getSnapshot();
  }

  subscribe(listener: ObserverListener<T>): () => void {
    if (this.disposed) {
      return () => {};
    }
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.unsubscribeFromRecord) {
      this.unsubscribeFromRecord();
      this.unsubscribeFromRecord = undefined;
    }
    this.listeners.clear();
  }
}
