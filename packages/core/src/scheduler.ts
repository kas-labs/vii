import { getActiveDiagnostics } from "./diagnostics.js";

type Job = () => void;

let batchDepth = 0;
let isFlushing = false;
const pendingJobs: Job[] = [];

export function isBatching(): boolean {
  return batchDepth > 0;
}

export function throwCollectedErrors(errors: unknown[], message: string): void {
  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    throw new AggregateError(errors, message);
  }
}

function flushJobs(): unknown[] {
  if (isFlushing) {
    return [];
  }

  isFlushing = true;
  const errors: unknown[] = [];

  try {
    while (pendingJobs.length > 0) {
      try {
        pendingJobs.shift()!();
      } catch (error) {
        errors.push(error);
      }
    }
  } finally {
    isFlushing = false;
  }

  return errors;
}

export function schedule(job: Job): void {
  pendingJobs.push(job);

  if (batchDepth === 0 && !isFlushing) {
    const errors = flushJobs();
    throwCollectedErrors(errors, "State notification errors");
  }
}

export function runBatch<T>(work: () => T): T {
  const diagnostics = getActiveDiagnostics();
  const batchId = diagnostics?.mode === "off" ? undefined : diagnostics?.allocateId("batch");
  if (diagnostics !== undefined && batchId !== undefined) {
    diagnostics.record("batch.started", { batchId });
  }

  batchDepth += 1;
  let result!: T;
  let callbackError: unknown;
  let hasCallbackError = false;

  try {
    result = work();
  } catch (error) {
    callbackError = error;
    hasCallbackError = true;
  } finally {
    batchDepth -= 1;
  }

  const flushErrors = batchDepth === 0 && !isFlushing ? flushJobs() : [];
  const errors = hasCallbackError ? [callbackError, ...flushErrors] : flushErrors;

  if (diagnostics !== undefined && batchId !== undefined) {
    diagnostics.record(errors.length === 0 ? "batch.committed" : "batch.failed", {
      batchId,
      errorCount: errors.length,
    });
  }

  throwCollectedErrors(errors, "Batch errors");

  return result;
}
