/**
 * Form Research F10 — Consumer A: Real Multi-Step Vanilla Onboarding
 *
 * Implements a 5-step realistic onboarding workflow using Vii Form Core and
 * Vanilla DOM Adapter. Exercises nested objects, FieldArray, parsers, async
 * validation with AbortSignal, cross-field rules, server errors, and a11y.
 */

import {
  state,
  computed,
  type WritableState,
  type Computed,
} from "../../../../packages/core/src/index.js";
import {
  createForm,
  createField,
  type FormInstance,
  type FieldState,
  type FieldArray,
  type FieldGroup,
  type ValidationRule,
  type ServerIssueInput,
} from "../../form-core.js";
import { createNumberParser } from "../../parser.js";
import { bindField, bindForm } from "../../adapters/vanilla.js";
import {
  type OnboardingFormValues,
  INITIAL_ONBOARDING_DATA,
  VALID_ONBOARDING_DATA,
} from "../fixtures/domain-data.js";

export { type OnboardingFormValues } from "../fixtures/domain-data.js";

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

export interface StepAggregateMetrics {
  activeComputeds: string[];
  recomputedCount: number;
}

export interface ConsumerAController {
  form: FormInstance<OnboardingFormValues>;
  currentStep: WritableState<OnboardingStep>;
  isStep1Valid: Computed<boolean>;
  isStep2Valid: Computed<boolean>;
  isStep3Valid: Computed<boolean>;
  isStep4Valid: Computed<boolean>;
  isEntireFormValid: Computed<boolean>;
  stepMetrics: WritableState<StepAggregateMetrics>;
  nextStep: () => boolean;
  prevStep: () => void;
  goToStep: (step: OnboardingStep) => void;
  dispose: () => void;
}

export function createOnboardingForm(
  initialData: OnboardingFormValues = INITIAL_ONBOARDING_DATA,
  asyncUsernameCheck?: (username: string, signal: AbortSignal) => Promise<boolean>,
): ConsumerAController {
  const currentStep = state<OnboardingStep>(1);
  const stepMetrics = state<StepAggregateMetrics>({
    activeComputeds: [],
    recomputedCount: 0,
  });

  const form = createForm<OnboardingFormValues>({
    initialValues: initialData,
    keyExtractor: (item: any) =>
      item && typeof item === "object" && "id" in item ? String(item.id) : String(Math.random()),
  });

  // Step 1 Cross-field password validator
  const confirmPasswordRule: ValidationRule<string> = (value, { path }) => {
    const pwdNode = form.getNode("account.password") as FieldState<string> | undefined;
    if (pwdNode && value !== pwdNode.value.get()) {
      return {
        code: "password_mismatch",
        message: "Passwords do not match.",
        path,
        source: "validation" as const,
      };
    }
    return null;
  };

  // Step 1 Async username rule with cancellation
  const asyncUsernameRule: ValidationRule<string> = async (value, { path, signal }) => {
    if (!value || value.length < 3) return null;
    if (!asyncUsernameCheck || !signal) return null;
    const isAvailable = await asyncUsernameCheck(value, signal);
    if (!isAvailable) {
      return {
        code: "username_taken",
        message: `Username '${value}' is already taken.`,
        path,
        source: "validation" as const,
      };
    }
    return null;
  };

  const numberParser = createNumberParser();

  const emailNode = createField<string>({
    initialValue: initialData.account.email,
    rules: [
      (value: string, { path }: any) =>
        !value || !value.includes("@")
          ? {
              code: "invalid_email",
              message: "Valid email is required.",
              path,
              source: "validation" as const,
            }
          : null,
    ],
  });

  const pwdNode = createField<string>({
    initialValue: initialData.account.password,
    rules: [
      (value: string, { path }: any) =>
        !value || value.length < 8
          ? {
              code: "password_too_short",
              message: "Password must be at least 8 chars.",
              path,
              source: "validation" as const,
            }
          : null,
    ],
  });

  const confirmPwdNode = createField<string>({
    initialValue: initialData.account.confirmPassword,
    rules: [confirmPasswordRule],
  });

  const usernameNode = createField<string>({
    initialValue: initialData.account.username,
    rules: [
      (value: string, { path }: any) =>
        value && value.length < 3
          ? {
              code: "username_short",
              message: "Username must be >= 3 chars.",
              path,
              source: "validation" as const,
            }
          : null,
      asyncUsernameRule,
    ],
    debounceMs: 50,
  });

  const fnNode = createField<string>({
    initialValue: initialData.profile.firstName,
    rules: [
      (value: string, { path }: any) =>
        !value || value.trim().length === 0
          ? {
              code: "required",
              message: "First name is required.",
              path,
              source: "validation" as const,
            }
          : null,
    ],
  });

  const lnNode = createField<string>({
    initialValue: initialData.profile.lastName,
    rules: [
      (value: string, { path }: any) =>
        !value || value.trim().length === 0
          ? {
              code: "required",
              message: "Last name is required.",
              path,
              source: "validation" as const,
            }
          : null,
    ],
  });

  const ageNode = createField<number, string>({
    initialValue: initialData.profile.age,
    parser: numberParser,
    rules: [
      (value: number, { path }: any) =>
        typeof value !== "number" || value < 18
          ? {
              code: "underage",
              message: "Must be at least 18 years old.",
              path,
              source: "validation" as const,
            }
          : null,
    ],
  });

  // Mount custom configured nodes onto form tree
  const accountGroup = form.getNode("account") as FieldGroup<any>;
  accountGroup.fields["email"] = emailNode as any;
  accountGroup.fields["password"] = pwdNode as any;
  accountGroup.fields["confirmPassword"] = confirmPwdNode as any;
  accountGroup.fields["username"] = usernameNode as any;

  const profileGroup = form.getNode("profile") as FieldGroup<any>;
  profileGroup.fields["firstName"] = fnNode as any;
  profileGroup.fields["lastName"] = lnNode as any;
  profileGroup.fields["age"] = ageNode as any;

  // Step-level derived validities
  const isStep1Valid = computed(() => {
    return Boolean(
      emailNode.value.get() &&
      pwdNode.value.get() &&
      confirmPwdNode.value.get() &&
      emailNode.valid.get() &&
      pwdNode.valid.get() &&
      confirmPwdNode.valid.get(),
    );
  });

  const isStep2Valid = computed(() => {
    return Boolean(
      fnNode.value.get() &&
      lnNode.value.get() &&
      ageNode.value.get() &&
      fnNode.valid.get() &&
      lnNode.valid.get() &&
      ageNode.valid.get(),
    );
  });

  const isStep3Valid = computed(() => {
    const addrArray = form.getNode("addresses") as FieldArray<any> | undefined;
    return Boolean(addrArray?.valid.get() && addrArray.items.get().length > 0);
  });

  const isStep4Valid = computed(() => {
    const taxIdNode = form.getNode("preferences.taxId") as FieldState<string> | undefined;
    return Boolean(taxIdNode ? taxIdNode.valid.get() : true);
  });

  const isEntireFormValid = computed(() => form.valid.get());

  const nextStep = (): boolean => {
    const step = currentStep.get();
    let canProceed = false;
    if (step === 1) canProceed = isStep1Valid.get();
    else if (step === 2) canProceed = isStep2Valid.get();
    else if (step === 3) canProceed = isStep3Valid.get();
    else if (step === 4) canProceed = isStep4Valid.get();
    else canProceed = true;

    if (canProceed && step < 5) {
      currentStep.set((step + 1) as OnboardingStep);
      return true;
    }
    return false;
  };

  const prevStep = (): void => {
    const step = currentStep.get();
    if (step > 1) {
      currentStep.set((step - 1) as OnboardingStep);
    }
  };

  const goToStep = (step: OnboardingStep): void => {
    currentStep.set(step);
  };

  const dispose = (): void => {
    form.dispose();
  };

  return {
    form,
    currentStep,
    isStep1Valid,
    isStep2Valid,
    isStep3Valid,
    isStep4Valid,
    isEntireFormValid,
    stepMetrics,
    nextStep,
    prevStep,
    goToStep,
    dispose,
  };
}
