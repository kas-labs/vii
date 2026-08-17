import { computed, createScope, state } from "@vii-labs/core";

export interface CheckoutReferenceResult {
  readonly finalQuantity: number;
  readonly observedQuantities: readonly number[];
  readonly totalCents: number;
}

export function runCheckoutReference(): CheckoutReferenceResult {
  const quantity = state(1);
  const observedQuantities: number[] = [];
  const scope = createScope();
  let totalCents!: ReturnType<typeof computed<number>>;

  scope.run(() => {
    totalCents = computed(() => quantity.get() * 800);
    quantity.subscribe((value) => observedQuantities.push(value));
  });
  quantity.set(2);
  quantity.update((current) => current + 1);
  const finalTotalCents = totalCents.get();
  scope.dispose();

  return {
    finalQuantity: quantity.get(),
    observedQuantities,
    totalCents: finalTotalCents,
  };
}
