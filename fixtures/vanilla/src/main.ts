import { state } from "@vii/core";

const count = state(0);
count.set(1);
count.update((current) => current + 1);

export const countValue = count.get();
