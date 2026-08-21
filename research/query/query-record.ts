/**
 * @file QueryRecord state model, cancellation, generation tracking, and GC retention.
 * Research only: not a public package API or production implementation.
 */

import { type QueryKey, hashCanonicalKey } from "./query-key.js";
import { type QueryDiagnosticSink, emitDiagnostic } from "./query-diagnostics.js";

export type QueryStatus = "empty" | "success" | "error";
export type FetchStatus = "idle" | "fetching";

export interface QuerySnapshot<T> {
  readonly data: T | undefined;
  readonly error: unknown | undefined;
  readonly status: QueryStatus;
  readonly fetchStatus: FetchStatus;
  readonly dataUpdatedAt: number;
  readonly errorUpdatedAt: number;
  readonly observerCount: number;
  readonly generation: number;
  readonly isInvalidated: boolean;
}

export type QueryListener<T> = (snapshot: QuerySnapshot<T>) => void;

export interface QueryFunctionContext {
  readonly signal: AbortSignal;
}

export type QueryFunction<T> = (context: QueryFunctionContext) => Promise<T>;

export interface FetchOptions {
  readonly supersede?: boolean;
}

export interface OptimisticResult {
  readonly expectedGeneration: number;
  readonly rollback: () => boolean;
}

export class QueryRecord<T = unknown> {
  readonly canonicalKey: string;
  readonly key: QueryKey;
  readonly keyHash: number;

  private snapshot: QuerySnapshot<T>;
  private activeExecution?: Promise<T> | undefined;
  private activeAbortController?: AbortController | undefined;
  private currentGeneration = 0;
  private isInvalidated = false;
  private gcTimer?: ReturnType<typeof setTimeout> | undefined;
  private readonly listeners = new Set<QueryListener<T>>();
  private sink?: QueryDiagnosticSink | undefined;

  constructor(canonicalKey: string, key: QueryKey, sink?: QueryDiagnosticSink) {
    this.canonicalKey = canonicalKey;
    this.key = key;
    this.keyHash = hashCanonicalKey(canonicalKey);
    this.sink = sink;
    this.snapshot = {
      data: undefined,
      error: undefined,
      status: "empty",
      fetchStatus: "idle",
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      observerCount: 0,
      generation: 0,
      isInvalidated: false,
    };
  }

  getSnapshot(): QuerySnapshot<T> {
    return this.snapshot;
  }

  get isFetching(): boolean {
    return this.snapshot.fetchStatus === "fetching";
  }

  get observerCount(): number {
    return this.listeners.size;
  }

  get hasPendingGc(): boolean {
    return this.gcTimer !== undefined;
  }

  isStale(staleTime = 0): boolean {
    if (
      this.snapshot.status !== "success" ||
      this.snapshot.dataUpdatedAt === 0 ||
      this.isInvalidated
    ) {
      return true;
    }
    return staleTime === Number.POSITIVE_INFINITY
      ? false
      : Date.now() - this.snapshot.dataUpdatedAt >= staleTime;
  }

  invalidate(): void {
    this.isInvalidated = true;
    this.snapshot = { ...this.snapshot, isInvalidated: true };
    emitDiagnostic(this.sink, {
      type: "query:invalidated",
      timestamp: Date.now(),
      keyHash: this.keyHash,
    });
    this.notify();
  }

  subscribe(listener: QueryListener<T>): () => void {
    this.cancelGc();
    this.listeners.add(listener);
    this.updateObserverCount();
    emitDiagnostic(this.sink, {
      type: "query:observer_added",
      timestamp: Date.now(),
      keyHash: this.keyHash,
      observerCount: this.listeners.size,
    });
    return () => {
      this.listeners.delete(listener);
      this.updateObserverCount();
      emitDiagnostic(this.sink, {
        type: "query:observer_removed",
        timestamp: Date.now(),
        keyHash: this.keyHash,
        observerCount: this.listeners.size,
      });
    };
  }

  fetch(queryFn: QueryFunction<T>, options?: FetchOptions): Promise<T> {
    if (!options?.supersede && this.activeExecution && this.snapshot.fetchStatus === "fetching") {
      emitDiagnostic(this.sink, {
        type: "query:fetch_deduplicated",
        timestamp: Date.now(),
        keyHash: this.keyHash,
        generation: this.currentGeneration,
      });
      return this.activeExecution;
    }
    this.cancelActiveController();

    this.currentGeneration += 1;
    const generation = this.currentGeneration;
    const controller = new AbortController();
    this.activeAbortController = controller;
    const startTime = Date.now();

    this.snapshot = { ...this.snapshot, fetchStatus: "fetching", generation };
    emitDiagnostic(this.sink, {
      type: "query:fetch_started",
      timestamp: startTime,
      keyHash: this.keyHash,
      generation,
    });
    this.notify();

    const execution = (async () => {
      try {
        const result = await queryFn({ signal: controller.signal });
        const durationMs = Date.now() - startTime;
        if (generation === this.currentGeneration && !controller.signal.aborted) {
          emitDiagnostic(this.sink, {
            type: "query:fetch_succeeded",
            timestamp: Date.now(),
            keyHash: this.keyHash,
            generation,
            durationMs,
          });
          this.updateSuccess(result, generation);
        }
        return result;
      } catch (error) {
        const durationMs = Date.now() - startTime;
        if (generation === this.currentGeneration) {
          if (controller.signal.aborted) {
            emitDiagnostic(this.sink, {
              type: "query:fetch_cancelled",
              timestamp: Date.now(),
              keyHash: this.keyHash,
              generation,
              durationMs,
            });
            this.handleAbort(generation);
          } else {
            emitDiagnostic(this.sink, {
              type: "query:fetch_failed",
              timestamp: Date.now(),
              keyHash: this.keyHash,
              generation,
              durationMs,
              reason: error instanceof Error ? error.name : "Error",
            });
            this.updateError(error, generation);
          }
        }
        throw error;
      } finally {
        if (generation === this.currentGeneration) {
          this.activeExecution = undefined;
          this.activeAbortController = undefined;
        }
      }
    })();

    this.activeExecution = execution;
    return execution;
  }

  cancel(): void {
    this.cancelActiveController();
    this.activeExecution = undefined;
    if (this.snapshot.fetchStatus === "fetching") {
      this.handleAbort(this.currentGeneration);
    }
  }

  setData(data: T, dataUpdatedAt = Date.now()): void {
    this.currentGeneration += 1;
    this.updateSuccess(data, this.currentGeneration, dataUpdatedAt);
  }

  setOptimisticData(data: T): OptimisticResult {
    this.currentGeneration += 1;
    const expectedGeneration = this.currentGeneration;
    const previousData = this.snapshot.data;
    this.updateSuccess(data, expectedGeneration);

    return {
      expectedGeneration,
      rollback: () => {
        if (this.currentGeneration === expectedGeneration) {
          this.currentGeneration += 1;
          this.updateSuccess(previousData as T, this.currentGeneration);
          emitDiagnostic(this.sink, {
            type: "mutation:rollback",
            timestamp: Date.now(),
            keyHash: this.keyHash,
            generation: this.currentGeneration,
          });
          return true;
        }
        return false;
      },
    };
  }

  scheduleGc(gcTime: number, onCollect: (canonicalKey: string) => void): void {
    this.cancelGc();
    if (gcTime === Number.POSITIVE_INFINITY) return;
    if (gcTime <= 0) {
      emitDiagnostic(this.sink, {
        type: "query:gc_evicted",
        timestamp: Date.now(),
        keyHash: this.keyHash,
      });
      onCollect(this.canonicalKey);
      return;
    }
    emitDiagnostic(this.sink, {
      type: "query:gc_scheduled",
      timestamp: Date.now(),
      keyHash: this.keyHash,
    });
    this.gcTimer = setTimeout(() => {
      this.gcTimer = undefined;
      emitDiagnostic(this.sink, {
        type: "query:gc_evicted",
        timestamp: Date.now(),
        keyHash: this.keyHash,
      });
      onCollect(this.canonicalKey);
    }, gcTime);
  }

  cancelGc(): void {
    if (this.gcTimer !== undefined) {
      clearTimeout(this.gcTimer);
      this.gcTimer = undefined;
      emitDiagnostic(this.sink, {
        type: "query:gc_cancelled",
        timestamp: Date.now(),
        keyHash: this.keyHash,
      });
    }
  }

  private cancelActiveController(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = undefined;
    }
  }

  private handleAbort(generation: number): void {
    this.snapshot = { ...this.snapshot, fetchStatus: "idle", generation };
    this.notify();
  }

  private updateSuccess(data: T, generation: number, dataUpdatedAt = Date.now()): void {
    this.isInvalidated = false;
    this.snapshot = {
      data,
      error: undefined,
      status: "success",
      fetchStatus: "idle",
      dataUpdatedAt,
      errorUpdatedAt: this.snapshot.errorUpdatedAt,
      observerCount: this.listeners.size,
      generation,
      isInvalidated: false,
    };
    this.notify();
  }

  private updateError(error: unknown, generation: number): void {
    this.snapshot = {
      data: this.snapshot.data,
      error,
      status: "error",
      fetchStatus: "idle",
      dataUpdatedAt: this.snapshot.dataUpdatedAt,
      errorUpdatedAt: Date.now(),
      observerCount: this.listeners.size,
      generation,
      isInvalidated: this.isInvalidated,
    };
    this.notify();
  }

  private updateObserverCount(): void {
    if (this.snapshot.observerCount !== this.listeners.size) {
      this.snapshot = { ...this.snapshot, observerCount: this.listeners.size };
      this.notify();
    }
  }

  private notify(): void {
    const current = this.snapshot;
    for (const listener of this.listeners) {
      listener(current);
    }
  }
}
