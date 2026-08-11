# Packed Vanilla fixture

This fixture is a small clean-consumer example for the packed `@vii/core` artifact. Its executable
source uses the current experimental State, Computed, Batch, and Scope APIs:

```ts
import { batch, computed, createScope, state } from "@vii/core";

const count = state(0);
const observed: number[] = [];
const unsubscribe = count.subscribe((value) => observed.push(value));
count.set(1);
count.update((current) => current + 1);
unsubscribe();

const doubled = computed(() => count.get() * 2);

const batchedCount = state(0);
const batchedObserved: number[] = [];
const unsubscribeBatched = batchedCount.subscribe((value) => batchedObserved.push(value));
batch(() => {
  batchedCount.set(1);
  batchedCount.set(2);
});
unsubscribeBatched();

const scopedCount = state(0);
const scopedObserved: number[] = [];
const scope = createScope({ name: "vanilla-fixture" });
scope.run(() => {
  scopedCount.subscribe((value) => scopedObserved.push(value));
});
scopedCount.set(1);
scope.dispose();
scopedCount.set(2);
```

The package-validation script installs a Core tarball into a clean temporary consumer, compiles
this source, and checks the exported values and observations. The fixture test covers the same
behavior from the workspace package.
