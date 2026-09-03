import type { ShallowRef } from "vue";
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
 * Readonly shallow reference wrapper preventing external direct mutation of projected state.
 */
export type VueReadonlyRef<T> = Readonly<ShallowRef<T>>;

/**
 * Configuration options for Vue adapter handle creation.
 */
export interface VueAdapterOptions {
  /**
   * Explicit scope or lifecycle callback hook if not relying on ambient getCurrentScope().
   */
  readonly onDispose?: ((callback: () => void) => void) | undefined;
}

/**
 * Collection of reactive Vue shallow refs projecting leaf field state dimensions.
 */
export interface VueFieldRefs<TValue, TRaw = TValue> {
  readonly value: VueReadonlyRef<TValue>;
  readonly rawValue: VueReadonlyRef<TRaw>;
  readonly dirty: VueReadonlyRef<boolean>;
  readonly touched: VueReadonlyRef<boolean>;
  readonly pending: VueReadonlyRef<boolean>;
  readonly valid: VueReadonlyRef<boolean>;
  readonly invalid: VueReadonlyRef<boolean>;
  readonly parseStatus: VueReadonlyRef<ParseStatus>;
  readonly parseIssue: VueReadonlyRef<ParseIssue | null>;
  readonly validationStatus: VueReadonlyRef<ValidationStatus>;
  readonly issues: VueReadonlyRef<readonly FieldIssue[]>;
  readonly serverIssues: VueReadonlyRef<readonly ServerIssue[]>;
}

/**
 * Complete Vue handle for a leaf field node combining shallow refs and stable action delegates.
 */
export interface VueFieldHandle<TValue, TRaw = TValue> extends VueFieldRefs<TValue, TRaw> {
  setValue(next: TValue): void;
  setRawValue(raw: TRaw): void;
  setTouched(touched?: boolean): void;
  blur(): void;
  validate(trigger?: ValidationTriggerMode): Promise<readonly FieldIssue[]> | readonly FieldIssue[];
  reset(): void;
  dispose(): void;
}

/**
 * Collection of reactive Vue shallow refs projecting root form aggregate state dimensions.
 */
export interface VueFormRefs<TFields extends FormFieldsRecord = FormFieldsRecord> {
  readonly value: VueReadonlyRef<FormValues<TFields>>;
  readonly rawValue: VueReadonlyRef<FormRawValues<TFields>>;
  readonly dirty: VueReadonlyRef<boolean>;
  readonly touched: VueReadonlyRef<boolean>;
  readonly pending: VueReadonlyRef<boolean>;
  readonly valid: VueReadonlyRef<boolean>;
  readonly invalid: VueReadonlyRef<boolean>;
  readonly issues: VueReadonlyRef<readonly FieldIssue[]>;
  readonly serverIssues: VueReadonlyRef<readonly ServerIssue[]>;
  readonly submissionStatus: VueReadonlyRef<SubmissionStatus>;
  readonly submitting: VueReadonlyRef<boolean>;
}

/**
 * Complete Vue handle for a root form node combining aggregate shallow refs and stable action delegates.
 */
export interface VueFormHandle<
  TFields extends FormFieldsRecord = FormFieldsRecord,
> extends VueFormRefs<TFields> {
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
 * Collection of reactive Vue shallow refs projecting repeatable collection state dimensions.
 */
export interface VueArrayRefs<TItemNode extends FormNode = FormNode> {
  readonly items: VueReadonlyRef<readonly FieldArrayItem<TItemNode>[]>;
  readonly value: VueReadonlyRef<readonly FormValueFor<TItemNode>[]>;
  readonly rawValue: VueReadonlyRef<readonly FormRawValueFor<TItemNode>[]>;
  readonly dirty: VueReadonlyRef<boolean>;
  readonly touched: VueReadonlyRef<boolean>;
  readonly pending: VueReadonlyRef<boolean>;
  readonly valid: VueReadonlyRef<boolean>;
  readonly invalid: VueReadonlyRef<boolean>;
  readonly issues: VueReadonlyRef<readonly FieldIssue[]>;
  readonly serverIssues: VueReadonlyRef<readonly ServerIssue[]>;
  readonly length: VueReadonlyRef<number>;
}

/**
 * Complete Vue handle for a repeatable collection node combining item refs and structural actions.
 */
export interface VueArrayHandle<
  TItemNode extends FormNode = FormNode,
> extends VueArrayRefs<TItemNode> {
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
