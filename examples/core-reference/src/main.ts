import { computed, createScope, state } from "@vii/core";

export interface CheckoutReferenceResult {
  readonly finalQuantity: number;
  readonly observedQuantities: readonly number[];
  readonly totalCents: number;
}

export function runCheckoutReference(): CheckoutReferenceResult {
  const quantity = state(1);
  const totalCents = computed(() => quantity.get() * 800);
  const observedQuantities: number[] = [];
  const scope = createScope();

  scope.run(() => {
    quantity.subscribe((value) => observedQuantities.push(value));
  });
  quantity.set(2);
  quantity.update((current) => current + 1);
  scope.dispose();

  return {
    finalQuantity: quantity.get(),
    observedQuantities,
    totalCents: totalCents.get(),
  };
}
