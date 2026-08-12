import { createViiSignal } from "@vii/angular";
import { state } from "@vii/core";

const count = state(2);
const handle = createViiSignal(count);

export const renderedValue = handle.signal();

handle.dispose();
