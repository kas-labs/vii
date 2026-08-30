import type {
  FieldArrayItem,
  FieldIssue,
  FieldPathSegment,
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

export type { FieldPathSegment };

/**
 * Immutable view snapshot of a leaf field node.
 */
export interface ReactFieldSnapshot<TValue, TRaw = TValue> {
  readonly value: TValue;
  readonly rawValue: TRaw;
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly pending: boolean;
  readonly valid: boolean;
  readonly invalid: boolean;
  readonly parseStatus: ParseStatus;
  readonly parseIssue: ParseIssue | null;
  readonly validationStatus: ValidationStatus;
  readonly issues: readonly FieldIssue[];
  readonly serverIssues: readonly ServerIssue[];
}

/**
 * React binding handle for a leaf field node combining observable state snapshot with stable action methods.
 */
export interface ReactFieldBinding<TValue, TRaw = TValue> extends ReactFieldSnapshot<TValue, TRaw> {
  setValue(next: TValue): void;
  setRawValue(raw: TRaw): void;
  setTouched(touched?: boolean): void;
  blur(): void;
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];
  reset(): void;
}

/**
 * Immutable view snapshot of root form aggregate state.
 */
export interface ReactFormSnapshot<TFields extends FormFieldsRecord = FormFieldsRecord> {
  readonly value: FormValues<TFields>;
  readonly rawValue: FormRawValues<TFields>;
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly pending: boolean;
  readonly valid: boolean;
  readonly invalid: boolean;
  readonly issues: readonly FieldIssue[];
  readonly serverIssues: readonly ServerIssue[];
  readonly submissionStatus: SubmissionStatus;
  readonly submitting: boolean;
}

/**
 * React binding handle for a root form coordinator combining aggregate snapshot, child fields, and submission actions.
 */
export interface ReactFormBinding<
  TFields extends FormFieldsRecord = FormFieldsRecord,
> extends ReactFormSnapshot<TFields> {
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
}

/**
 * Immutable view snapshot of a dynamic repeatable collection node.
 */
export interface ReactArraySnapshot<TItemNode extends FormNode = FormNode> {
  readonly items: readonly FieldArrayItem<TItemNode>[];
  readonly value: readonly FormValueFor<TItemNode>[];
  readonly rawValue: readonly FormRawValueFor<TItemNode>[];
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly pending: boolean;
  readonly valid: boolean;
  readonly invalid: boolean;
  readonly issues: readonly FieldIssue[];
  readonly serverIssues: readonly ServerIssue[];
  readonly length: number;
}

/**
 * React binding handle for a dynamic repeatable collection node combining item list snapshot and structural actions.
 */
export interface ReactArrayBinding<
  TItemNode extends FormNode = FormNode,
> extends ReactArraySnapshot<TItemNode> {
  append(node: TItemNode): FieldArrayItem<TItemNode>;
  prepend(node: TItemNode): FieldArrayItem<TItemNode>;
  insert(index: number, node: TItemNode): FieldArrayItem<TItemNode>;
  remove(index: number): void;
  move(fromIndex: number, toIndex: number): void;
  swap(indexA: number, indexB: number): void;
  clear(): void;
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];
  reset(): void;
}
