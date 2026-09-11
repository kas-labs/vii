import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";
import type { FormFieldsRecord, FormInstance } from "../../core/types.js";

/**
 * Context container holding a reference to the canonical FormInstance.
 * Used strictly as a reference transport mechanism, carrying zero duplicated
 * form snapshots or mutable state.
 */
export interface FormContextValue<TFields extends FormFieldsRecord = FormFieldsRecord> {
  readonly form: FormInstance<TFields>;
  readonly formBinding?: unknown;
}

const ViiFormContext = createContext<FormContextValue | null>(null);

export interface FormProviderProps<TFields extends FormFieldsRecord = FormFieldsRecord> {
  readonly form: FormInstance<TFields>;
  readonly formBinding?: unknown;
  readonly children?: ReactNode | undefined;
}

/**
 * Provides a canonical FormInstance reference to child components via React Context.
 *
 * Implements reference transport only:
 * - Does not subscribe to field or form mutations in the provider.
 * - Field updates never cause whole-tree re-renders through this provider.
 * - Preserves stable context value identity across field edits.
 */
export function FormProvider<TFields extends FormFieldsRecord = FormFieldsRecord>(
  props: FormProviderProps<TFields>,
): ReactElement {
  const value = useMemo<FormContextValue<TFields>>(
    () => ({
      form: props.form,
      formBinding: props.formBinding,
    }),
    [props.form, props.formBinding],
  );

  return createElement(ViiFormContext.Provider, { value }, props.children);
}

/**
 * Retrieves the nearest canonical FormInstance provided by <FormProvider>.
 */
export function useFormContext<
  TFields extends FormFieldsRecord = FormFieldsRecord,
>(): FormInstance<TFields> {
  const ctx = useContext(ViiFormContext);
  if (!ctx) {
    throw new Error("useFormContext must be used within a <FormProvider>");
  }
  return ctx.form as FormInstance<TFields>;
}

/**
 * Internal helper to optionally retrieve form context without throwing.
 */
export function useOptionalFormContext<
  TFields extends FormFieldsRecord = FormFieldsRecord,
>(): FormContextValue<TFields> | null {
  return useContext(ViiFormContext) as FormContextValue<TFields> | null;
}
