import { signal, type Signal } from "@angular/core";
import type { AngularAdapterOptions } from "./types.js";

export function attachDestroyRef(
  options: AngularAdapterOptions | undefined,
  dispose: () => void,
): (() => void) | undefined {
  const ref = options?.destroyRef;
  if (!ref) return undefined;
  if (ref.destroyed) {
    dispose();
    return undefined;
  }
  return ref.onDestroy(dispose);
}

export function createTeardown(options?: AngularAdapterOptions) {
  let isDisposed = false;
  const unsubs: (() => void)[] = [];
  let cleanDestroy: (() => void) | undefined;

  const dispose = (): void => {
    if (isDisposed) return;
    isDisposed = true;
    for (const u of unsubs) u();
    unsubs.length = 0;
    if (cleanDestroy) {
      const c = cleanDestroy;
      cleanDestroy = undefined;
      c();
    }
  };

  cleanDestroy = attachDestroyRef(options, dispose);

  return {
    isDisposed: () => isDisposed,
    unsubs,
    dispose,
  };
}

export function bridgeSignal<T>(
  source: { get(): T; subscribe(fn: (v: T) => void): () => void },
  unsubs: (() => void)[],
  isDisposed: () => boolean,
): Signal<T> {
  const sig = signal(source.get());
  unsubs.push(
    source.subscribe((v) => {
      if (!isDisposed()) sig.set(v);
    }),
  );
  return sig.asReadonly();
}
