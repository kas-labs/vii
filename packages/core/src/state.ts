import { createNotifier } from "./notifier.js";
import { getActiveDiagnostics, type DiagnosticsRuntime } from "./diagnostics.js";
import { trackDependency, type Dependency } from "./tracking.js";

export type StateListener<T> = (value: T) => void;

export interface WritableState<T> {
  get(): T;
  set(value: T): void;
  update(updater: (current: T) => T): void;
  subscribe(listener: StateListener<T>): () => void;
}

export function state<T>(initialValue: T): WritableState<T> {
  let currentValue = initialValue;
  let version = 0;
  const diagnostics = getActiveDiagnostics();
  const stateId = diagnostics?.mode === "off" ? undefined : diagnostics?.allocateId("state");
  const notifier = createNotifier<T>({
    diagnostics,
    ownerId: stateId,
    ownerType: "state",
  });

  recordStateEvent(diagnostics, "state.created", stateId, {});
  const dependency: Dependency = {
    subscribe: (listener) => notifier.subscribe(() => listener(), { owned: false }),
  };

  const setValue = (nextValue: T): void => {
    if (!Object.is(currentValue, nextValue)) {
      currentValue = nextValue;
      const previousVersion = version;
      version += 1;
      recordStateEvent(diagnostics, "state.updated", stateId, {
        previousVersion,
        nextVersion: version,
        subscriberCount: notifier.size(),
      });
      notifier.notify(currentValue);
    } else {
      recordStateEvent(diagnostics, "state.update_skipped", stateId, {
        version,
        reason: "equal",
      });
    }
  };

  return {
    get: () => {
      trackDependency(dependency);
      return currentValue;
    },
    set: setValue,
    update: (updater) => setValue(updater(currentValue)),
    subscribe: (listener) => notifier.subscribe(listener),
  };
}

function recordStateEvent(
  diagnostics: DiagnosticsRuntime | undefined,
  type: string,
  stateId: string | undefined,
  payload: Readonly<Record<string, unknown>>,
): void {
  if (diagnostics === undefined || stateId === undefined) {
    return;
  }

  diagnostics.record(type, { stateId, ...payload });
}
