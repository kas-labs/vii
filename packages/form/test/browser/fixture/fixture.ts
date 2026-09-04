import type { ViiP1kBridge } from "./types.js";
import { createField } from "@vii-labs/form";
import { bindField } from "@vii-labs/form/vanilla";
import {
  mountVanillaText,
  mountVanillaCheckbox,
  mountVanillaRadio,
  mountVanillaSelectOne,
  mountVanillaFile,
  mountParserRaw,
  mountSafeSink,
  mountImeText,
} from "./vanilla-scenarios.js";
import {
  mountSubmitNative,
  mountSubmitException,
  mountSubmitLifecycle,
  mountServerIssues,
} from "./submit-scenarios.js";
import {
  mountFocusBlur,
  mountIssueFocus,
  mountAsyncCancellation,
  mountRouteTeardown,
} from "./lifecycle-scenarios.js";
import { mountA11yFull, mountOverlappingAria } from "./a11y-scenarios.js";
import { mountReactLifecycle } from "./react-scenarios.js";

const bridge: ViiP1kBridge = {
  validationCount: 0,
  inputEventCount: 0,
  changeEventCount: 0,
  rawCommitCount: 0,
  actionCallCount: 0,
  unhandledRejections: [],
  pageErrors: [],
  consoleErrors: [],
  resolvers: {},
};

bridge.testUnsupported = () => {
  const f = createField({ initialValue: "" });
  let divErr = "";
  try {
    bindField(f, document.createElement("div") as never);
  } catch (err: unknown) {
    divErr = (err as Error).message;
  }
  let btnErr = "";
  try {
    const btn = document.createElement("input");
    btn.type = "button";
    bindField(f, btn as never);
  } catch (err: unknown) {
    btnErr = (err as Error).message;
  }
  return { divErr, btnErr };
};

bridge.testSelectMultiple = () => {
  const f = createField({ initialValue: [] });
  const sel = document.createElement("select");
  sel.multiple = true;
  try {
    bindField(f, sel as never);
    return "";
  } catch (err: unknown) {
    return (err as Error).message;
  }
};

window.__viiP1k = bridge;

window.addEventListener("unhandledrejection", (event) => {
  bridge.unhandledRejections.push(event.reason);
});

window.addEventListener("error", (event) => {
  bridge.pageErrors.push(event.error ?? event.message);
});

const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  bridge.consoleErrors.push(args.map((a) => String(a)).join(" "));
  originalConsoleError.apply(console, args);
};

const app = document.getElementById("app") as HTMLElement;
const params = new URLSearchParams(window.location.search);
const scenario = params.get("scenario") ?? "vanilla-text";

switch (scenario) {
  case "vanilla-text":
    mountVanillaText(app, bridge);
    break;
  case "vanilla-checkbox":
    mountVanillaCheckbox(app, bridge);
    break;
  case "vanilla-radio":
    mountVanillaRadio(app, bridge);
    break;
  case "vanilla-select-one":
    mountVanillaSelectOne(app, bridge);
    break;
  case "vanilla-file":
    mountVanillaFile(app, bridge);
    break;
  case "parser-raw":
    mountParserRaw(app, bridge);
    break;
  case "safe-sink":
    mountSafeSink(app, bridge);
    break;
  case "ime-text":
    mountImeText(app, bridge);
    break;
  case "focus-blur":
    mountFocusBlur(app, bridge);
    break;
  case "issue-focus":
    mountIssueFocus(app, bridge);
    break;
  case "async-cancellation":
    mountAsyncCancellation(app, bridge);
    break;
  case "route-teardown":
    mountRouteTeardown(app, bridge);
    break;
  case "a11y-full":
    mountA11yFull(app, bridge);
    break;
  case "overlapping-aria":
    mountOverlappingAria(app, bridge);
    break;
  case "submit-native":
    mountSubmitNative(app, bridge);
    break;
  case "submit-exception":
    mountSubmitException(app, bridge);
    break;
  case "submit-lifecycle":
    mountSubmitLifecycle(app, bridge);
    break;
  case "server-issues":
    mountServerIssues(app, bridge);
    break;
  case "react-lifecycle":
    mountReactLifecycle(app, bridge);
    break;
  default:
    app.textContent = `Unknown scenario: ${scenario}`;
}
