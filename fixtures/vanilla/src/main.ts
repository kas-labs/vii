import { state } from "@vii/core";

const count = state(0);
const observed: number[] = [];
const unsubscribe = count.subscribe((value) => observed.push(value));
count.set(1);
count.update((current) => current + 1);
unsubscribe();

export const countValue = count.get();
export const observedValues = observed;
