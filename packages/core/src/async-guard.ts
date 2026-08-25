export function isThenable(value: unknown): value is PromiseLike<unknown> {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return false;
  }
  try {
    return typeof (value as { then?: unknown }).then === "function";
  } catch {
    // A throwing 'then' getter is treated defensively as not a thenable
    return false;
  }
}

export function suppressUnhandledRejection(value: unknown): void {
  if (!isThenable(value)) {
    return;
  }
  try {
    Promise.resolve(value).catch(() => {});
  } catch {
    // Ignore defensive suppression failures on hostile thenables
  }
}
