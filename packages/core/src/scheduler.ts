import { getActiveDiagnostics } from "./diagnostics.js";

type Job = () => void;

export const MAX_FLUSH_ITERATIONS = 10_000;

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
  let iterations = 0;

  try {
    while (pendingJobs.length > 0) {
      if (++iterations > MAX_FLUSH_ITERATIONS) {
        pendingJobs.length = 0;
        errors.push(
          new Error(
            `Runaway scheduler cycle detected: exceeded ${MAX_FLUSH_ITERATIONS} jobs in a single flush`,
          ),
        );
        break;
      }

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

/**
 * Runs a callback within a batch boundary.
 *
 * State notifications scheduled during the batch are coalesced and deferred until
 * the outermost batch completes.
 *
 * NOTE: `batch()` is NOT transactional. If the callback or any nested work throws,
 * state changes already committed prior to the throw remain in effect and are NOT rolled back;
 * queued notifications for committed state are still delivered.
 */
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
