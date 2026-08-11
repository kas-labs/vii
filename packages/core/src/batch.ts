import { runBatch } from "./scheduler.js";

export function batch<T>(work: () => T): T {
  return runBatch(work);
}
