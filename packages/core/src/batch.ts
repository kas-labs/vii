import { runBatch } from "./scheduler.js";

/**
 * Executes a function within a batch context.
 *
 * Coalesces state notifications so subscribers are notified once at the end
 * of the outermost batch boundary.
 *
 * Note: `batch()` is NOT transactional and does not roll back state on error.
 * If `work()` throws, any state mutations executed prior to the error remain
 * committed and their queued notifications will still be delivered.
 */
export function batch<T>(work: () => T): T {
  return runBatch(work);
}
