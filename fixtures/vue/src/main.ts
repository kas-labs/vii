import { state } from "@vii-labs/core";
import { createViiRef } from "@vii-labs/vue";

const count = state(2);
const handle = createViiRef(count);

export const renderedValue = handle.ref.value;

handle.dispose();
