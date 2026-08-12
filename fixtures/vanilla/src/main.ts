import { batch, computed, createDiagnostics, createScope, state } from "@vii/core";

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

const diagnostics = createDiagnostics({ clock: () => 123, traceId: "vanilla" });
diagnostics.run(() => {
  const diagnosticCount = state(0);
  diagnosticCount.set(1);
});
const diagnosticTrace = diagnostics.exportTrace();
const ownershipDiagnostics = createDiagnostics({ clock: () => 456 });
ownershipDiagnostics.run(() => {
  const applicationScope = createScope({ name: "application" });
  applicationScope.createChild({ name: "checkout" });
  applicationScope.dispose();
});
const ownershipTrace = ownershipDiagnostics.exportTrace();

export const countValue = count.get();
export const doubledValue = doubled.get();
export const observedValues = observed;
export const batchedValue = batchedCount.get();
export const batchedObservedValues = batchedObserved;
export const scopedFinalValue = scopedCount.get();
export const scopedObservedValues = scopedObserved;
export const diagnosticTraceProtocol = diagnosticTrace.protocol;
export const diagnosticTraceVersion = diagnosticTrace.version;
export const diagnosticTraceId = diagnosticTrace.traceId;
export const diagnosticTraceEventTypes = diagnosticTrace.events.map((event) => event.type);
export const diagnosticScopePayloads = ownershipTrace.events
  .filter((event) => event.type === "scope.created")
  .map((event) => event.payload);
