import { createViiSignal } from "@vii-labs/angular";
import { state } from "@vii-labs/core";

const count = state(2);
const handle = createViiSignal(count);

export const renderedValue = handle.signal();

handle.dispose();
