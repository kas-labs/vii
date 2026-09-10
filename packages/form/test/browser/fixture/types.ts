import type { FieldState, FormInstance } from "@vii-labs/form";
import type { VanillaBinding, VanillaFormBinding } from "@vii-labs/form/vanilla";

export interface ViiP1kBridge {
  field?: FieldState<unknown>;
  form?: FormInstance<Record<string, FieldState<unknown>>>;
  binding?: VanillaBinding;
  bindingA?: VanillaBinding;
  bindingB?: VanillaBinding;
  formBinding?: VanillaFormBinding;
  validationCount: number;
  inputEventCount: number;
  changeEventCount: number;
  rawCommitCount: number;
  actionCallCount: number;
  lastSubmitResult?: unknown;
  lastException?: unknown;
  unhandledRejections: unknown[];
  pageErrors: unknown[];
  consoleErrors: unknown[];
  resolvers: Record<string, (val?: unknown) => void>;
  unmount?: () => void;
  remount?: () => void;
  unmountReact?: () => void;
  remountReact?: () => void;
  testUnsupported?: () => { divErr: string; btnErr: string };
  testSelectMultiple?: () => string;
  imeEvents?: Array<{
    type: string;
    data?: string | undefined;
    value: string;
    isComposing?: boolean | undefined;
  }>;
  [key: string]: unknown;
}

declare global {
  interface Window {
    __viiP1k?: ViiP1kBridge;
    __viiP1kXss?: boolean;
  }
}
