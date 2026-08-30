import {
  computed,
  state,
  type Computed,
  type Diagnostics,
  type Scope,
  type WritableState,
} from "@vii-labs/core";
import { deepCloneSnapshot } from "../core/snapshot.js";
import type { FormNode } from "../core/tree-types.js";
import type { FieldIssue, ValidationTriggerMode } from "../validation/types.js";
import { collectArraySnapshots } from "./array-snapshot.js";
import {
  clearTreeServerIssues,
  routeServerIssuesToTree,
  sanitizeServerIssue,
} from "./server-issues.js";
import type {
  DuplicateSubmitPolicy,
  FormSubmitResult,
  ServerIssue,
  ServerIssueInput,
  SubmissionStatus,
  SubmitAction,
  SubmitOptions,
} from "./types.js";

/**
 * Host callbacks for submission coordinator interactions with the root form.
 */
export interface SubmissionHostCallbacks<TValues> {
  readonly isDisposed: () => boolean;
  readonly assertActive: () => void;
  readonly getValues: () => TValues;
  readonly validateTree: (
    trigger: ValidationTriggerMode,
  ) => Promise<readonly FieldIssue[]> | readonly FieldIssue[];
  readonly getIssues: () => readonly FieldIssue[];
  readonly isInvalid: () => boolean;
  readonly rootNode: () => FormNode;
  readonly getDiagnostics?: () => Diagnostics | undefined;
}

/**
 * Safely records value-free structural telemetry if diagnostics sink is active.
 */
function recordDiagnostic(
  diag: Diagnostics | undefined,
  type: string,
  payload: Readonly<Record<string, unknown>>,
): void {
  if (
    diag &&
    "record" in diag &&
    typeof (diag as Record<string, unknown>)["record"] === "function"
  ) {
    (diag as { record(t: string, p: Readonly<Record<string, unknown>>): void }).record(
      type,
      payload,
    );
  }
}

/**
 * Coordinates the Model A submission state machine, duplicate submission policies,
 * snapshotting, async submission cancellation, and server issue routing.
 */
export class SubmissionCoordinator<TValues> {
  private currentSubmissionRevision = 0;
  private activeAbortController: AbortController | null = null;
  readonly submissionStatusState: WritableState<SubmissionStatus>;
  readonly submitting: Computed<boolean>;
  readonly formServerIssuesState: WritableState<readonly ServerIssue[]>;

  constructor(
    scope: Scope,
    private readonly host: SubmissionHostCallbacks<TValues>,
  ) {
    this.submissionStatusState = state<SubmissionStatus>("idle");
    this.formServerIssuesState = state<readonly ServerIssue[]>([]);
    this.submitting = scope.run(() =>
      computed(() => {
        const s = this.submissionStatusState.get();
        return s === "validating" || s === "submitting";
      }),
    );
  }

  cancelSubmit(): void {
    const currentStatus = this.submissionStatusState.get();
    if (currentStatus === "validating" || currentStatus === "submitting") {
      if (this.activeAbortController) {
        this.activeAbortController.abort();
        this.activeAbortController = null;
      }
      this.currentSubmissionRevision++;
      this.submissionStatusState.set("cancelled");
      const diag = this.host.getDiagnostics?.();
      recordDiagnostic(diag, "form.submission.cancelled", {
        revision: this.currentSubmissionRevision,
      });
    }
  }

  reset(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.currentSubmissionRevision++;
    this.submissionStatusState.set("idle");
    this.formServerIssuesState.set([]);
    clearTreeServerIssues(this.host.rootNode());
  }

  dispose(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }
    this.currentSubmissionRevision++;
  }

  async submit<TResult = void>(
    action?: SubmitAction<TValues, TResult>,
    options?: SubmitOptions,
  ): Promise<FormSubmitResult<TResult, FieldIssue>> {
    this.host.assertActive();

    const duplicatePolicy: DuplicateSubmitPolicy = options?.duplicatePolicy ?? "supersede";
    const currentStatus = this.submissionStatusState.get();

    if (currentStatus === "validating" || currentStatus === "submitting") {
      if (duplicatePolicy === "reject") {
        throw new Error("Submission is already in progress");
      }
      if (duplicatePolicy === "drop") {
        return { status: "cancelled" };
      }
      if (duplicatePolicy === "supersede") {
        if (this.activeAbortController) {
          this.activeAbortController.abort();
          this.activeAbortController = null;
        }
      }
    }

    const revision = ++this.currentSubmissionRevision;
    const ac = new AbortController();
    this.activeAbortController = ac;
    this.submissionStatusState.set("validating");

    const diag = this.host.getDiagnostics?.();
    recordDiagnostic(diag, "form.submission.started", { revision });

    const root = this.host.rootNode();
    const arraySnapshots = collectArraySnapshots(root);

    let outputSnapshot: TValues;
    try {
      outputSnapshot = deepCloneSnapshot(this.host.getValues());
    } catch (outputErr) {
      if (this.activeAbortController === ac) {
        this.activeAbortController = null;
      }
      this.submissionStatusState.set("failed");
      recordDiagnostic(diag, "form.submission.failed", {
        reason: outputErr instanceof Error ? outputErr.name : typeof outputErr,
      });
      throw outputErr;
    }

    this.formServerIssuesState.set([]);
    clearTreeServerIssues(root);

    let valIssues: readonly FieldIssue[];
    try {
      const valResult = this.host.validateTree("submit");
      if (valResult !== null && typeof (valResult as Promise<unknown>).then === "function") {
        valIssues = await valResult;
      } else {
        valIssues = valResult as readonly FieldIssue[];
      }
    } catch (valErr) {
      if (
        revision === this.currentSubmissionRevision &&
        !ac.signal.aborted &&
        !this.host.isDisposed()
      ) {
        this.submissionStatusState.set("failed");
        if (this.activeAbortController === ac) {
          this.activeAbortController = null;
        }
        recordDiagnostic(diag, "form.submission.failed", {
          reason: valErr instanceof Error ? valErr.name : typeof valErr,
        });
      }
      throw valErr;
    }

    if (
      revision !== this.currentSubmissionRevision ||
      ac.signal.aborted ||
      this.host.isDisposed()
    ) {
      return { status: "cancelled" };
    }

    if (valIssues.length > 0 || this.host.isInvalid() || this.host.getIssues().length > 0) {
      this.submissionStatusState.set("idle");
      if (this.activeAbortController === ac) {
        this.activeAbortController = null;
      }
      recordDiagnostic(diag, "form.submission.validation_blocked", {
        issueCount: this.host.getIssues().length,
      });
      return { status: "invalid", issues: this.host.getIssues() };
    }

    this.submissionStatusState.set("submitting");
    recordDiagnostic(diag, "form.submission.submitting", { revision });

    if (!action) {
      if (this.activeAbortController === ac) {
        this.activeAbortController = null;
      }
      this.submissionStatusState.set("succeeded");
      recordDiagnostic(diag, "form.submission.succeeded", { revision });
      return { status: "succeeded", result: undefined as unknown as TResult };
    }

    try {
      const actionResult = await action(outputSnapshot, { signal: ac.signal });

      if (
        revision !== this.currentSubmissionRevision ||
        ac.signal.aborted ||
        this.host.isDisposed()
      ) {
        return { status: "cancelled" };
      }

      if (
        actionResult !== null &&
        typeof actionResult === "object" &&
        (actionResult as { ok?: boolean }).ok === false &&
        Array.isArray((actionResult as { issues?: unknown }).issues)
      ) {
        const rawIssues = (actionResult as { issues: readonly (ServerIssueInput | string)[] })
          .issues;
        const sanitized = rawIssues.map((iss) =>
          typeof iss === "string"
            ? sanitizeServerIssue({ code: "server.error", message: iss })
            : sanitizeServerIssue(iss),
        );
        const unmatched = routeServerIssuesToTree(root, sanitized, arraySnapshots);
        this.formServerIssuesState.set(unmatched);
        this.submissionStatusState.set("failed");
        recordDiagnostic(diag, "form.submission.failed", {
          reason: "server_validation",
          issueCount: sanitized.length,
        });
        return { status: "server-invalid", issues: sanitized };
      }

      const finalResult =
        actionResult !== null &&
        typeof actionResult === "object" &&
        (actionResult as { ok?: boolean }).ok === true &&
        "result" in (actionResult as object)
          ? (actionResult as { result: TResult }).result
          : (actionResult as TResult);

      this.submissionStatusState.set("succeeded");
      recordDiagnostic(diag, "form.submission.succeeded", { revision });
      return { status: "succeeded", result: finalResult };
    } catch (actionErr: unknown) {
      if (
        revision !== this.currentSubmissionRevision ||
        ac.signal.aborted ||
        this.host.isDisposed()
      ) {
        return { status: "cancelled" };
      }

      if (
        actionErr &&
        typeof actionErr === "object" &&
        ((actionErr as Error).name === "AbortError" ||
          (actionErr as { code?: string }).code === "ABORT_ERR" ||
          (actionErr as Error).message?.includes("aborted"))
      ) {
        this.submissionStatusState.set("cancelled");
        recordDiagnostic(diag, "form.submission.cancelled", { revision });
        return { status: "cancelled" };
      }

      this.submissionStatusState.set("failed");
      recordDiagnostic(diag, "form.submission.failed", {
        reason: actionErr instanceof Error ? actionErr.name : typeof actionErr,
      });
      throw actionErr;
    } finally {
      if (this.activeAbortController === ac) {
        this.activeAbortController = null;
      }
    }
  }
}
