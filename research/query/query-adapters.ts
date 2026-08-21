/**
 * @file React, Angular, and Vue Query adapter prototypes.
 * Research only: not a public package API or production implementation.
 *
 * Adapters are strictly thin reactive bridges: they contain NO cache,
 * GC, deduplication, freshness, or mutation logic.
 */

import { type QueryKey } from "./query-key.js";
import { type ResearchQueryClient } from "./query-client-prototype.js";
import { type QuerySnapshot } from "./query-record.js";
import { type MutationRecord, type MutationSnapshot } from "./mutation-record.js";
import { type QueryObserver } from "./query-observer.js";

// ==========================================
// 1. React Adapter Bridge (useSyncExternalStore)
// ==========================================

export interface ReactQueryStoreHandle<T> {
  readonly observer: QueryObserver<T>;
  getSnapshot(): QuerySnapshot<T>;
  getServerSnapshot(): QuerySnapshot<T>;
  subscribe(onStoreChange: () => void): () => void;
  dispose(): void;
}

export function createReactQueryStore<T>(
  client: ResearchQueryClient,
  key: QueryKey,
): ReactQueryStoreHandle<T> {
  const observer = client.observeQuery<T>(key);

  return {
    observer,
    getSnapshot: () => observer.getSnapshot(),
    getServerSnapshot: () => observer.getSnapshot(),
    subscribe: (onStoreChange) => observer.subscribe(() => onStoreChange()),
    dispose: () => observer.dispose(),
  };
}

export interface ReactMutationStoreHandle<TData, TVariables> {
  getSnapshot(): MutationSnapshot<TData, TVariables>;
  getServerSnapshot(): MutationSnapshot<TData, TVariables>;
  subscribe(onStoreChange: () => void): () => void;
  dispose(): void;
}

export function createReactMutationStore<TData, TVariables>(
  mutation: MutationRecord<TData, TVariables>,
): ReactMutationStoreHandle<TData, TVariables> {
  return {
    getSnapshot: () => mutation.getSnapshot(),
    getServerSnapshot: () => mutation.getSnapshot(),
    subscribe: (onStoreChange) => mutation.subscribe(() => onStoreChange()),
    dispose: () => mutation.dispose(),
  };
}

// ==========================================
// 2. Angular Adapter Bridge (Signal & DestroyRef)
// ==========================================

export interface DestroyRefLike {
  readonly destroyed?: boolean;
  onDestroy(callback: () => void): () => void;
}

export interface AngularQuerySignalOptions {
  readonly destroyRef?: DestroyRefLike | undefined;
}

export interface AngularSignal<T> {
  (): T;
}

export interface AngularQuerySignalHandle<T> {
  readonly signal: AngularSignal<QuerySnapshot<T>>;
  dispose(): void;
}

export function createAngularQuerySignal<T>(
  client: ResearchQueryClient,
  key: QueryKey,
  options?: AngularQuerySignalOptions,
): AngularQuerySignalHandle<T> {
  const observer = client.observeQuery<T>(key);
  let current = observer.getSnapshot();

  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    unsubscribe();
    observer.dispose();
  };

  const unsubscribe = observer.subscribe((snap) => {
    if (!disposed) {
      current = snap;
    }
  });

  if (options?.destroyRef) {
    if (options.destroyRef.destroyed) {
      dispose();
    } else {
      options.destroyRef.onDestroy(dispose);
    }
  }

  const sig: AngularSignal<QuerySnapshot<T>> = () => current;

  return {
    signal: sig,
    dispose,
  };
}

export interface AngularMutationSignalHandle<TData, TVariables> {
  readonly signal: AngularSignal<MutationSnapshot<TData, TVariables>>;
  dispose(): void;
}

export function createAngularMutationSignal<TData, TVariables>(
  mutation: MutationRecord<TData, TVariables>,
  options?: AngularQuerySignalOptions,
): AngularMutationSignalHandle<TData, TVariables> {
  let current = mutation.getSnapshot();

  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    unsubscribe();
    mutation.dispose();
  };

  const unsubscribe = mutation.subscribe((snap) => {
    if (!disposed) {
      current = snap;
    }
  });

  if (options?.destroyRef) {
    if (options.destroyRef.destroyed) {
      dispose();
    } else {
      options.destroyRef.onDestroy(dispose);
    }
  }

  const sig: AngularSignal<MutationSnapshot<TData, TVariables>> = () => current;

  return {
    signal: sig,
    dispose,
  };
}

// ==========================================
// 3. Vue Adapter Bridge (Ref & Scope Disposal)
// ==========================================

export interface VueScopeLike {
  onDispose(callback: () => void): void;
}

export interface VueQueryRefOptions {
  readonly scope?: VueScopeLike | undefined;
}

export interface VueRef<T> {
  readonly value: T;
}

export interface VueQueryRefHandle<T> {
  readonly ref: VueRef<QuerySnapshot<T>>;
  dispose(): void;
}

export function createVueQueryRef<T>(
  client: ResearchQueryClient,
  key: QueryKey,
  options?: VueQueryRefOptions,
): VueQueryRefHandle<T> {
  const observer = client.observeQuery<T>(key);
  const stateRef = { value: observer.getSnapshot() };

  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    unsubscribe();
    observer.dispose();
  };

  const unsubscribe = observer.subscribe((snap) => {
    if (!disposed) {
      stateRef.value = snap;
    }
  });

  if (options?.scope) {
    options.scope.onDispose(dispose);
  }

  return {
    ref: stateRef,
    dispose,
  };
}

export interface VueMutationRefHandle<TData, TVariables> {
  readonly ref: VueRef<MutationSnapshot<TData, TVariables>>;
  dispose(): void;
}

export function createVueMutationRef<TData, TVariables>(
  mutation: MutationRecord<TData, TVariables>,
  options?: VueQueryRefOptions,
): VueMutationRefHandle<TData, TVariables> {
  const stateRef = { value: mutation.getSnapshot() };

  let disposed = false;
  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    unsubscribe();
    mutation.dispose();
  };

  const unsubscribe = mutation.subscribe((snap) => {
    if (!disposed) {
      stateRef.value = snap;
    }
  });

  if (options?.scope) {
    options.scope.onDispose(dispose);
  }

  return {
    ref: stateRef,
    dispose,
  };
}
