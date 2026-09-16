import { useCallback, useMemo, type ReactElement } from "react";
import type { FieldState } from "../../core/types.js";
import type {
  ControllerFieldState,
  ControllerProps,
  ControllerRenderProps,
  UseControllerOptions,
  UseControllerReturn,
} from "./types.js";
import { useField } from "./use-field.js";

/**
 * Idiomatic React controller hook for bridging Vii Form fields with UI components,
 * native inputs, and third-party libraries without whole-form re-renders.
 */
export function useController<TValue, TRaw = TValue>(
  field: FieldState<TValue, TRaw>,
  options?: UseControllerOptions,
): UseControllerReturn<TValue, TRaw> {
  const binding = useField(field);

  const onChange = useCallback(
    (e: unknown): void => {
      const t = (e as { target?: { value?: unknown; checked?: boolean; type?: string } })?.target;
      binding.setRawValue((t ? (t.type === "checkbox" ? t.checked : (t.value ?? e)) : e) as TRaw);
    },
    [binding.setRawValue],
  );

  const onBlur = useCallback((): void => {
    binding.blur();
  }, [binding.blur]);

  const fieldState: ControllerFieldState = useMemo(
    () => ({
      invalid: binding.invalid,
      isTouched: binding.touched,
      isDirty: binding.dirty,
      isValid: binding.valid,
      isPending: binding.pending,
      error: binding.issues[0],
      issues: binding.issues,
    }),
    [
      binding.invalid,
      binding.touched,
      binding.dirty,
      binding.valid,
      binding.pending,
      binding.issues,
    ],
  );

  const controllerField: ControllerRenderProps<TValue, TRaw> = useMemo(
    () => ({
      name: options?.name,
      value: binding.rawValue,
      onChange,
      onBlur,
    }),
    [options?.name, binding.rawValue, onChange, onBlur],
  );

  return useMemo(
    () => ({
      field: controllerField,
      fieldState,
    }),
    [controllerField, fieldState],
  );
}

/**
 * Idiomatic declarative controller component wrapping useController.
 */
export function Controller<TValue, TRaw = TValue>(
  props: ControllerProps<TValue, TRaw>,
): ReactElement | null {
  const controller = useController(props.field, props.options);
  return props.render(controller);
}
