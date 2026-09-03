import type { Signal } from "@angular/core";
import type {
  FieldArray,
  FieldArrayItem,
  FieldIssue,
  FormFieldsRecord,
  FormInstance,
  FormNode,
  FormRawValueFor,
  FormRawValues,
  FormReinitializeInput,
  FormSubmitResult,
  FormValueFor,
  FormValues,
  ParseIssue,
  ParseStatus,
  ServerIssue,
  SubmissionStatus,
  SubmitAction,
  SubmitOptions,
  ValidationStatus,
  ValidationTriggerMode,
} from "../../core/types.js";

/**
 * Minimal structural contract for an Angular DestroyRef or equivalent lifecycle token.
 */
export interface DestroyRefLike {
  readonly destroyed?: boolean;
  onDestroy(callback: () => void): () => void;
}

/**
 * Configuration options for Angular adapter handle creation.
 */
export interface AngularAdapterOptions {
  /**
   * Explicit DestroyRef or lifecycle token used to automate subscription teardown.
   */
  readonly destroyRef?: DestroyRefLike | undefined;
}

/**
 * Collection of reactive Angular Signals projecting leaf field state dimensions.
 */
export interface AngularFieldSignals<TValue, TRaw = TValue> {
  readonly value: Signal<TValue>;
  readonly rawValue: Signal<TRaw>;
  readonly dirty: Signal<boolean>;
  readonly touched: Signal<boolean>;
  readonly pending: Signal<boolean>;
  readonly valid: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly parseStatus: Signal<ParseStatus>;
  readonly parseIssue: Signal<ParseIssue | null>;
  readonly validationStatus: Signal<ValidationStatus>;
  readonly issues: Signal<readonly FieldIssue[]>;
  readonly serverIssues: Signal<readonly ServerIssue[]>;
}

/**
 * Complete Angular handle for a leaf field node combining signals and stable action delegates.
 */
export interface AngularFieldHandle<TValue, TRaw = TValue> extends AngularFieldSignals<
  TValue,
  TRaw
> {
  setValue(next: TValue): void;
  setRawValue(raw: TRaw): void;
  setTouched(touched?: boolean): void;
  blur(): void;
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];
  reset(): void;
  dispose(): void;
}

/**
 * Collection of reactive Angular Signals projecting root form aggregate state dimensions.
 */
export interface AngularFormSignals<TFields extends FormFieldsRecord = FormFieldsRecord> {
  readonly value: Signal<FormValues<TFields>>;
  readonly rawValue: Signal<FormRawValues<TFields>>;
  readonly dirty: Signal<boolean>;
  readonly touched: Signal<boolean>;
  readonly pending: Signal<boolean>;
  readonly valid: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly issues: Signal<readonly FieldIssue[]>;
  readonly serverIssues: Signal<readonly ServerIssue[]>;
  readonly submissionStatus: Signal<SubmissionStatus>;
  readonly submitting: Signal<boolean>;
}

/**
 * Complete Angular handle for a root form node combining aggregate signals and stable action delegates.
 */
export interface AngularFormHandle<
  TFields extends FormFieldsRecord = FormFieldsRecord,
> extends AngularFormSignals<TFields> {
  readonly form: FormInstance<TFields>;
  readonly fields: TFields;
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];
  submit<TResult = void>(
    action?: SubmitAction<FormValues<TFields>, TResult>,
    options?: SubmitOptions,
  ): Promise<FormSubmitResult<TResult, FieldIssue>>;
  cancelSubmit(): void;
  reset(): void;
  reinitialize(newBaseline: FormReinitializeInput<TFields>): void;
  dispose(): void;
}

/**
 * Collection of reactive Angular Signals projecting repeatable collection state dimensions.
 */
export interface AngularArraySignals<TItemNode extends FormNode = FormNode> {
  readonly items: Signal<readonly FieldArrayItem<TItemNode>[]>;
  readonly value: Signal<readonly FormValueFor<TItemNode>[]>;
  readonly rawValue: Signal<readonly FormRawValueFor<TItemNode>[]>;
  readonly dirty: Signal<boolean>;
  readonly touched: Signal<boolean>;
  readonly pending: Signal<boolean>;
  readonly valid: Signal<boolean>;
  readonly invalid: Signal<boolean>;
  readonly issues: Signal<readonly FieldIssue[]>;
  readonly serverIssues: Signal<readonly ServerIssue[]>;
  readonly length: Signal<number>;
}

/**
 * Complete Angular handle for a repeatable collection node combining item signals and structural actions.
 */
export interface AngularArrayHandle<
  TItemNode extends FormNode = FormNode,
> extends AngularArraySignals<TItemNode> {
  readonly array: FieldArray<TItemNode>;
  append(node: TItemNode): FieldArrayItem<TItemNode>;
  prepend(node: TItemNode): FieldArrayItem<TItemNode>;
  insert(index: number, node: TItemNode): FieldArrayItem<TItemNode>;
  remove(index: number): void;
  move(fromIndex: number, toIndex: number): void;
  swap(indexA: number, indexB: number): void;
  clear(): void;
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];
  reset(): void;
  dispose(): void;
}
