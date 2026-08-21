/**
 * @file QueryRecord state model, execution generation tracking, and observer notification.
 * Research only: not a public package API or production implementation.
 */

import { type QueryKey } from "./query-key.js";

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
}

export type QueryListener<T> = (snapshot: QuerySnapshot<T>) => void;

export interface FetchOptions {
  readonly supersede?: boolean;
}

export class QueryRecord<T = unknown> {
  readonly canonicalKey: string;
  readonly key: QueryKey;

  private snapshot: QuerySnapshot<T>;
  private activeExecution?: Promise<T> | undefined;
  private currentGeneration = 0;
  private readonly listeners = new Set<QueryListener<T>>();

  constructor(canonicalKey: string, key: QueryKey) {
    this.canonicalKey = canonicalKey;
    this.key = key;
    this.snapshot = {
      data: undefined,
      error: undefined,
      status: "empty",
      fetchStatus: "idle",
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      observerCount: 0,
      generation: 0,
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

  subscribe(listener: QueryListener<T>): () => void {
    this.listeners.add(listener);
    this.updateObserverCount();
    return () => {
      this.listeners.delete(listener);
      this.updateObserverCount();
    };
  }

  fetch(queryFn: () => Promise<T>, options?: FetchOptions): Promise<T> {
    if (!options?.supersede && this.activeExecution && this.snapshot.fetchStatus === "fetching") {
      return this.activeExecution;
    }

    this.currentGeneration += 1;
    const generation = this.currentGeneration;

    this.snapshot = {
      ...this.snapshot,
      fetchStatus: "fetching",
      generation,
    };
    this.notify();

    const execution = (async () => {
      try {
        const result = await queryFn();
        if (generation === this.currentGeneration) {
          this.updateSuccess(result, generation);
        }
        return result;
      } catch (error) {
        if (generation === this.currentGeneration) {
          this.updateError(error, generation);
        }
        throw error;
      } finally {
        if (generation === this.currentGeneration) {
          this.activeExecution = undefined;
        }
      }
    })();

    this.activeExecution = execution;
    return execution;
  }

  setData(data: T): void {
    this.currentGeneration += 1;
    this.updateSuccess(data, this.currentGeneration);
  }

  private updateSuccess(data: T, generation: number): void {
    this.snapshot = {
      data,
      error: undefined,
      status: "success",
      fetchStatus: "idle",
      dataUpdatedAt: Date.now(),
      errorUpdatedAt: this.snapshot.errorUpdatedAt,
      observerCount: this.listeners.size,
      generation,
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
    };
    this.notify();
  }

  private updateObserverCount(): void {
    if (this.snapshot.observerCount !== this.listeners.size) {
      this.snapshot = {
        ...this.snapshot,
        observerCount: this.listeners.size,
      };
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
