import { useCallback, useEffect, useMemo, useRef, type ReactElement } from "react";
import type { FieldState } from "../../core/types.js";
import { useOptionalFormContext } from "./context.js";
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
  const activeUnsubRef = useRef<(() => void) | null>(null);

  const formContext = useOptionalFormContext();
  const effectiveBinding = options?.formBinding ?? formContext?.formBinding;

  const ref = useCallback(
    (el: HTMLElement | null): void => {
      if (activeUnsubRef.current) {
        activeUnsubRef.current();
        activeUnsubRef.current = null;
      }
      if (el && effectiveBinding && typeof effectiveBinding === "object") {
        const candidate = effectiveBinding as {
          readonly registerControl?: (f: unknown, el: unknown) => () => void;
          readonly _focusRegistry?: {
            readonly register?: (f: unknown, el: unknown) => () => void;
          };
        };
        const reg = candidate.registerControl ?? candidate._focusRegistry?.register;
        if (typeof reg === "function") {
          activeUnsubRef.current = reg(field, el);
        }
      }
    },
    [effectiveBinding, field],
  );

  useEffect(() => {
    return () => {
      if (activeUnsubRef.current) {
        activeUnsubRef.current();
        activeUnsubRef.current = null;
      }
    };
  }, []);

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
      ref,
    }),
    [options?.name, binding.rawValue, onChange, onBlur, ref],
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
