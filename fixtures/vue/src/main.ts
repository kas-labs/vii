import { state } from "@vii/core";
import { createViiRef } from "@vii/vue";

const count = state(2);
const handle = createViiRef(count);

export const renderedValue = handle.ref.value;

handle.dispose();
