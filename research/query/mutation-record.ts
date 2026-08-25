/**
 * @file MutationRecord execution lifecycle, optimistic coordination, and AbortSignal cancellation.
 * Research only: not a public package API or production implementation.
 */

import { type QueryDiagnosticSink, emitDiagnostic } from "./query-diagnostics.js";

export type MutationStatus = "idle" | "pending" | "success" | "error";

export interface MutationSnapshot<TData = unknown, TVariables = unknown> {
  readonly data: TData | undefined;
  readonly error: unknown | undefined;
  readonly variables: TVariables | undefined;
  readonly status: MutationStatus;
  readonly submittedAt: number;
}

export type MutationListener<TData, TVariables> = (
  snapshot: MutationSnapshot<TData, TVariables>,
) => void;

export interface MutationContext {
  readonly signal: AbortSignal;
}

export type MutationFunction<TData, TVariables> = (
  variables: TVariables,
  context: MutationContext,
) => Promise<TData>;

export interface MutationOptions<TData = unknown, TVariables = unknown, TContext = unknown> {
  readonly mutationFn: MutationFunction<TData, TVariables>;
  readonly sink?: QueryDiagnosticSink | undefined;
  readonly onMutate?: (variables: TVariables) => Promise<TContext> | TContext;
  readonly onSuccess?: (
    data: TData,
    variables: TVariables,
    context: TContext | undefined,
  ) => Promise<void> | void;
  readonly onError?: (
    error: unknown,
    variables: TVariables,
    context: TContext | undefined,
  ) => Promise<void> | void;
  readonly onSettled?: (
    data: TData | undefined,
    error: unknown | undefined,
    variables: TVariables,
    context: TContext | undefined,
  ) => Promise<void> | void;
}

export class MutationRecord<TData = unknown, TVariables = unknown, TContext = unknown> {
  private readonly options: MutationOptions<TData, TVariables, TContext>;
  private snapshot: MutationSnapshot<TData, TVariables>;
  private activeAbortController?: AbortController | undefined;
  private readonly listeners = new Set<MutationListener<TData, TVariables>>();
  private disposed = false;
  private sink?: QueryDiagnosticSink | undefined;

  constructor(options: MutationOptions<TData, TVariables, TContext>) {
    this.options = options;
    this.sink = options.sink;
    this.snapshot = {
      data: undefined,
      error: undefined,
      variables: undefined,
      status: "idle",
      submittedAt: 0,
    };
  }

  getSnapshot(): MutationSnapshot<TData, TVariables> {
    return this.snapshot;
  }

  get isPending(): boolean {
    return this.snapshot.status === "pending";
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  subscribe(listener: MutationListener<TData, TVariables>): () => void {
    if (this.disposed) {
      return () => {};
    }
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async mutate(variables: TVariables): Promise<TData> {
    if (this.disposed) {
      throw new Error("Cannot mutate with a disposed MutationRecord");
    }

    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = undefined;
    }

    const controller = new AbortController();
    this.activeAbortController = controller;
    const startTime = Date.now();

    this.snapshot = {
      data: undefined,
      error: undefined,
      variables,
      status: "pending",
      submittedAt: startTime,
    };
    emitDiagnostic(this.sink, { type: "mutation:started", timestamp: startTime });
    this.notify();

    let mutateContext: TContext | undefined;
    try {
      if (this.options.onMutate) {
        mutateContext = await this.options.onMutate(variables);
      }

      const result = await this.options.mutationFn(variables, {
        signal: controller.signal,
      });

      const durationMs = Date.now() - startTime;
      if (controller.signal.aborted) {
        // This controller only aborts via cancel() (which already reset the
        // snapshot) or a superseding mutate() (whose pending snapshot must not
        // be clobbered with "idle" here), so only report and throw.
        emitDiagnostic(this.sink, {
          type: "mutation:cancelled",
          timestamp: Date.now(),
          durationMs,
        });
        throw new DOMException("Mutation aborted", "AbortError");
      }

      this.snapshot = {
        data: result,
        error: undefined,
        variables,
        status: "success",
        submittedAt: this.snapshot.submittedAt,
      };
      emitDiagnostic(this.sink, { type: "mutation:succeeded", timestamp: Date.now(), durationMs });
      this.notify();

      if (this.options.onSuccess) {
        await this.options.onSuccess(result, variables, mutateContext);
      }
      if (this.options.onSettled) {
        await this.options.onSettled(result, undefined, variables, mutateContext);
      }

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      if (controller.signal.aborted) {
        // See the success-path abort branch: the snapshot was already settled
        // by cancel() or belongs to a superseding mutate() - leave it alone.
        emitDiagnostic(this.sink, {
          type: "mutation:cancelled",
          timestamp: Date.now(),
          durationMs,
        });
        throw error;
      }

      this.snapshot = {
        data: undefined,
        error,
        variables,
        status: "error",
        submittedAt: this.snapshot.submittedAt,
      };
      emitDiagnostic(this.sink, {
        type: "mutation:failed",
        timestamp: Date.now(),
        durationMs,
        reason: error instanceof Error ? error.name : "Error",
      });
      this.notify();

      if (this.options.onError) {
        await this.options.onError(error, variables, mutateContext);
      }
      if (this.options.onSettled) {
        await this.options.onSettled(undefined, error, variables, mutateContext);
      }

      throw error;
    } finally {
      if (this.activeAbortController === controller) {
        this.activeAbortController = undefined;
      }
    }
  }

  cancel(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = undefined;
      if (this.snapshot.status === "pending") {
        this.snapshot = { ...this.snapshot, status: "idle" };
        this.notify();
      }
    }
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.cancel();
    this.listeners.clear();
  }

  private notify(): void {
    const current = this.snapshot;
    for (const listener of this.listeners) {
      listener(current);
    }
  }
}
