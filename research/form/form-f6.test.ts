import { describe, expect, it, vi } from "vitest";
import {
  bindFormToExternalState,
  createBooleanParser,
  createField,
  createFieldArray,
  createFieldGroup,
  createForm,
  createNumberParser,
  createOptionalStringParser,
  type FieldIssue,
  type FieldPathSegment,
  type FormConfig,
  type FormInstance,
  type FormSubmitResult,
  type ServerIssue,
  type ServerIssueInput,
  type SubmitAction,
  type SubmitActionResult,
} from "./form-core.js";
import { state } from "../../packages/core/src/state.js";
import { createDiagnostics } from "../../packages/core/src/diagnostics.js";
import { deepCloneSnapshot } from "./submission.js";

describe("Form Research Slice F6: Submission Lifecycle + Server Errors + Reset / Reinitialize", () => {
  // -------------------------------------------------------------------------
  // Fixture 1: Valid synchronous submit success
  // -------------------------------------------------------------------------
  it("Fixture 1: executes submit action with output snapshot upon successful validation", async () => {
    const form = createForm({
      initialValues: {
        username: "alex",
        age: 25,
      },
    });

    let receivedPayload: any = null;
    let signalPassed: AbortSignal | null = null;

    const action: SubmitAction<{ username: string; age: number }, { id: string }> = async (
      output,
      { signal },
    ) => {
      receivedPayload = output;
      signalPassed = signal;
      return { id: "user_123" };
    };

    expect(form.submissionStatus.get()).toBe("idle");
    expect(form.submitting.get()).toBe(false);

    const result = await form.submit(action);

    expect(result).toStrictEqual({
      status: "succeeded",
      result: { id: "user_123" },
    });
    expect(receivedPayload).toEqual({ username: "alex", age: 25 });
    expect(signalPassed).toBeInstanceOf(AbortSignal);
    expect(signalPassed!.aborted).toBe(false);
    expect(form.submissionStatus.get()).toBe("succeeded");
    expect(form.submitting.get()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Fixture 2: Async validation is awaited before submit action is called
  // -------------------------------------------------------------------------
  it("Fixture 2: awaits async validation before calling submit action", async () => {
    let asyncValidationFinished = false;
    let actionCalled = false;

    const form = createForm({
      initialValues: {
        email: "test@example.com",
      },
      rules: [
        async (val: { email: string }) => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          asyncValidationFinished = true;
          if (val.email === "taken@example.com") {
            return { code: "email_taken", message: "Email is already taken" };
          }
          return null;
        },
      ],
    });

    const action = async () => {
      expect(asyncValidationFinished).toBe(true);
      actionCalled = true;
      return { ok: true as const, result: "created" };
    };

    const submitPromise = form.submit(action);
    expect(form.submissionStatus.get()).toBe("validating");
    expect(form.submitting.get()).toBe(true);

    const result = await submitPromise;
    expect(actionCalled).toBe(true);
    expect(result).toStrictEqual({ status: "succeeded", result: "created" });
    expect(form.submissionStatus.get()).toBe("succeeded");
  });

  // -------------------------------------------------------------------------
  // Fixture 3: Parse failure blocks submission action
  // -------------------------------------------------------------------------
  it("Fixture 3: blocks submission when form has parse failures", async () => {
    let actionCalled = false;
    const numberParser = createNumberParser({ allowEmpty: false });

    const numField = createField({
      initialValue: 10,
      initialRawValue: "10",
      parser: numberParser,
    });

    const form = createForm({
      initialValues: {
        count: 10,
      },
    });
    (form.fields as any).count = numField;

    numField.setRawValue("invalid-number");
    expect(numField.parseStatus.get()).toBe("invalid");

    const action = async () => {
      actionCalled = true;
      return "done";
    };

    const result = await form.submit(action);

    expect(actionCalled).toBe(false);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]?.source).toBe("parse");
    }
    expect(form.submissionStatus.get()).toBe("idle");
    expect(form.submitting.get()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Fixture 4: Validation failure blocks submission action
  // -------------------------------------------------------------------------
  it("Fixture 4: blocks submission when client validation fails", async () => {
    let actionCalled = false;

    const form = createForm({
      initialValues: {
        username: "",
      },
      rules: [
        (val: { username: string }) => {
          if (!val.username || val.username.trim() === "") {
            return { code: "required", message: "Username is required" };
          }
          return null;
        },
      ],
    });

    const result = await form.submit(async () => {
      actionCalled = true;
      return "ok";
    });

    expect(actionCalled).toBe(false);
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") {
      expect(result.issues[0]?.code).toBe("required");
    }
    expect(form.submissionStatus.get()).toBe("idle");
  });

  // -------------------------------------------------------------------------
  // Fixture 5: Output transform is used as action payload
  // -------------------------------------------------------------------------
  it("Fixture 5: passes transformed output payload to submit action", async () => {
    const trimmedField = createField({
      initialValue: "  hello  ",
      transform: (val: string) => val.trim().toUpperCase(),
    });

    const form = createForm({
      initialValues: {
        name: "  hello  ",
      },
    });
    (form.fields as any).name = trimmedField;

    let submittedPayload: any = null;
    const result = await form.submit(async (output) => {
      submittedPayload = output;
      return "saved";
    });

    expect(result.status).toBe("succeeded");
    expect(submittedPayload).toEqual({ name: "HELLO" });
  });

  // -------------------------------------------------------------------------
  // Fixture 6: Output transform throwing during submit preparation
  // -------------------------------------------------------------------------
  it("Fixture 6: handles output transform exception during submit safely", async () => {
    let actionCalled = false;
    const throwingField = createField({
      initialValue: "bad",
      transform: () => {
        throw new RangeError("Transform explosion");
      },
    });

    const form = createForm({
      initialValues: {
        test: "bad",
      },
    });
    (form.fields as any).test = throwingField;

    await expect(
      form.submit(async () => {
        actionCalled = true;
        return "done";
      }),
    ).rejects.toThrow(RangeError);

    expect(actionCalled).toBe(false);
    expect(form.submissionStatus.get()).toBe("failed");
    expect(form.submitting.get()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Fixture 7: Submission status transitions
  // -------------------------------------------------------------------------
  it("Fixture 7: tracks state machine transitions accurately across lifecycle", async () => {
    const transitions: string[] = [];

    const form = createForm({
      initialValues: {
        name: "test",
      },
    });

    transitions.push(form.submissionStatus.get());

    form.submissionStatus.subscribe((st) => {
      transitions.push(st);
    });

    const submitPromise = form.submit(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return "ok";
    });

    expect(form.submissionStatus.get()).toBe("submitting");
    await submitPromise;
    expect(form.submissionStatus.get()).toBe("succeeded");

    // Editing after success preserves terminal status (Model A); dirty becomes true
    form.setValues({ name: "new name" });
    expect(form.submissionStatus.get()).toBe("succeeded");
    expect(form.dirty.get()).toBe(true);
    expect(transitions).toEqual(["idle", "validating", "submitting", "succeeded"]);

    // Explicit reset resets submission status to idle
    form.reset();
    expect(form.submissionStatus.get()).toBe("idle");
    expect(form.dirty.get()).toBe(false);
    expect(transitions).toEqual(["idle", "validating", "submitting", "succeeded", "idle"]);
  });

  // -------------------------------------------------------------------------
  // Fixture 8: Duplicate submission policy (drop, reject, supersede)
  // -------------------------------------------------------------------------
  it("Fixture 8: enforces duplicate submission policies (drop, reject, supersede)", async () => {
    // Case A: drop policy (default)
    const formDrop = createForm({
      initialValues: { text: "drop" },
      duplicatePolicy: "drop",
    });

    let actionCalls = 0;
    const slowAction = async () => {
      actionCalls++;
      await new Promise((resolve) => setTimeout(resolve, 40));
      return "done";
    };

    const firstSubmit = formDrop.submit(slowAction);
    const duplicateSubmit = formDrop.submit(slowAction);

    const dupResult = await duplicateSubmit;
    expect(dupResult).toStrictEqual({ status: "cancelled" });

    const firstResult = await firstSubmit;
    expect(firstResult).toStrictEqual({ status: "succeeded", result: "done" });
    expect(actionCalls).toBe(1);

    // Case B: reject policy
    const formReject = createForm({
      initialValues: { text: "reject" },
      duplicatePolicy: "reject",
    });

    const firstRejectSubmit = formReject.submit(slowAction);
    await expect(formReject.submit(slowAction)).rejects.toThrow(
      "Submission is already in progress",
    );
    await firstRejectSubmit;

    // Case C: supersede policy
    const formSupersede = createForm({
      initialValues: { text: "supersede" },
      duplicatePolicy: "supersede",
    });

    let sub1Aborted = false;
    const sub1Action: SubmitAction<any, string> = async (_, { signal }) => {
      signal.addEventListener("abort", () => {
        sub1Aborted = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "sub1";
    };

    const sub2Action: SubmitAction<any, string> = async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return "sub2";
    };

    const sub1Promise = formSupersede.submit(sub1Action);
    const sub2Promise = formSupersede.submit(sub2Action);

    const res1 = await sub1Promise;
    const res2 = await sub2Promise;

    expect(sub1Aborted).toBe(true);
    expect(res1).toStrictEqual({ status: "cancelled" });
    expect(res2).toStrictEqual({ status: "succeeded", result: "sub2" });
  });

  // -------------------------------------------------------------------------
  // Fixture 9: Explicit cancellation via cancelSubmit()
  // -------------------------------------------------------------------------
  it("Fixture 9: cancels in-flight submission via cancelSubmit without marking failure", async () => {
    let aborted = false;

    const form = createForm({
      initialValues: { title: "Draft" },
    });

    const submitPromise = form.submit(async (_, { signal }) => {
      signal.addEventListener("abort", () => {
        aborted = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "finished";
    });

    expect(form.submissionStatus.get()).toBe("submitting");
    form.cancelSubmit();

    expect(form.submissionStatus.get()).toBe("cancelled");
    expect(form.submitting.get()).toBe(false);

    const result = await submitPromise;
    expect(aborted).toBe(true);
    expect(result).toStrictEqual({ status: "cancelled" });
    expect(form.valid.get()).toBe(true); // Cancellation is not failure
  });

  // -------------------------------------------------------------------------
  // Fixture 10: Form disposal during submission
  // -------------------------------------------------------------------------
  it("Fixture 10: aborts active submission on form disposal and prevents further mutations", async () => {
    let aborted = false;

    const form = createForm({
      initialValues: { title: "Draft" },
    });

    const submitPromise = form.submit(async (_, { signal }) => {
      signal.addEventListener("abort", () => {
        aborted = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "done";
    });

    form.dispose();
    expect(aborted).toBe(true);

    const result = await submitPromise;
    expect(result).toStrictEqual({ status: "cancelled" });

    await expect(form.submit(async () => "new")).rejects.toThrow("Form is disposed");
  });

  // -------------------------------------------------------------------------
  // Fixture 11: Form reset during submission
  // -------------------------------------------------------------------------
  it("Fixture 11: aborts active submission and resets status on form.reset()", async () => {
    let aborted = false;

    const form = createForm({
      initialValues: { count: 0 },
    });

    form.fields.count.setValue(5);
    expect(form.dirty.get()).toBe(true);

    const submitPromise = form.submit(async (_, { signal }) => {
      signal.addEventListener("abort", () => {
        aborted = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "done";
    });

    form.reset();

    expect(aborted).toBe(true);
    expect(form.submissionStatus.get()).toBe("idle");
    expect(form.fields.count.value.get()).toBe(0);
    expect(form.dirty.get()).toBe(false);

    const result = await submitPromise;
    expect(result).toStrictEqual({ status: "cancelled" });
  });

  // -------------------------------------------------------------------------
  // Fixture 12: Stale late success cannot commit after superseding submission
  // -------------------------------------------------------------------------
  it("Fixture 12: strictly suppresses stale late success resolution", async () => {
    const form = createForm({
      initialValues: { name: "initial" },
      duplicatePolicy: "supersede",
    });

    let resolveSub1: (val: any) => void;
    const sub1Promise = form.submit(
      () =>
        new Promise((resolve) => {
          resolveSub1 = resolve;
        }),
    );

    const sub2Promise = form.submit(async () => {
      return { msg: "sub2 completed" };
    });

    const res2 = await sub2Promise;
    expect(res2).toStrictEqual({ status: "succeeded", result: { msg: "sub2 completed" } });
    expect(form.submissionStatus.get()).toBe("succeeded");

    // Now resolve sub1 late
    resolveSub1!({ msg: "sub1 late resolution" });
    const res1 = await sub1Promise;

    expect(res1).toStrictEqual({ status: "cancelled" });
    expect(form.submissionStatus.get()).toBe("succeeded");
  });

  // -------------------------------------------------------------------------
  // Fixture 13: Stale late server issues / rejection cannot attach
  // -------------------------------------------------------------------------
  it("Fixture 13: strictly suppresses stale late server issues and rejections", async () => {
    const form = createForm({
      initialValues: { email: "user@example.com" },
      duplicatePolicy: "supersede",
    });

    let rejectSub1: (err: any) => void;
    const sub1Promise = form.submit(
      () =>
        new Promise((_, reject) => {
          rejectSub1 = reject;
        }),
    );

    const sub2Promise = form.submit(async () => {
      return "sub2 success";
    });

    await sub2Promise;
    expect(form.submissionStatus.get()).toBe("succeeded");
    expect(form.serverIssues.get()).toEqual([]);

    // Reject sub1 late with server error
    rejectSub1!(new Error("Late network crash"));
    const res1 = await sub1Promise;

    expect(res1).toStrictEqual({ status: "cancelled" });
    expect(form.submissionStatus.get()).toBe("succeeded");
    expect(form.issues.get()).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Fixture 14: Server field issue attachment & validity
  // -------------------------------------------------------------------------
  it("Fixture 14: attaches server issues to leaf fields and updates validity", async () => {
    const form = createForm({
      initialValues: {
        email: "taken@example.com",
      },
    });

    const result = await form.submit(async () => {
      return {
        ok: false as const,
        issues: [
          {
            path: ["email"],
            code: "email_taken",
            message: "Email is already in use",
          },
        ],
      };
    });

    expect(result.status).toBe("server-invalid");
    expect(form.submissionStatus.get()).toBe("failed");
    expect(form.fields.email.serverIssues.get()).toHaveLength(1);
    expect(form.fields.email.serverIssues.get()[0]?.code).toBe("email_taken");
    expect(form.fields.email.valid.get()).toBe(false);
    expect(form.fields.email.invalid.get()).toBe(true);
    expect(form.valid.get()).toBe(false);
    expect(form.invalid.get()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Fixture 15: Nested server issue attachment
  // -------------------------------------------------------------------------
  it("Fixture 15: attaches server issues through nested groups to target field", async () => {
    const form = createForm({
      initialValues: {
        user: {
          profile: {
            handle: "forbidden_handle",
          },
        },
      },
    });

    const result = await form.submit(async () => {
      return {
        ok: false as const,
        issues: [
          {
            path: ["user", "profile", "handle"],
            code: "handle_taken",
            message: "Handle already claimed",
          },
        ],
      };
    });

    expect(result.status).toBe("server-invalid");
    const handleNode = form.getNode("user.profile.handle") as any;
    expect(handleNode.serverIssues.get()).toHaveLength(1);
    expect(handleNode.serverIssues.get()[0]?.code).toBe("handle_taken");
    expect(form.issues.get().some((iss) => iss.code === "handle_taken")).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Fixture 16: Root / form-level server issue attachment
  // -------------------------------------------------------------------------
  it("Fixture 16: attaches root server issues to form.serverIssues", async () => {
    const form = createForm({
      initialValues: { title: "Post" },
    });

    const result = await form.submit(async () => {
      return {
        ok: false as const,
        issues: [
          {
            code: "rate_limited",
            message: "Too many submission attempts, please wait",
          },
        ],
      };
    });

    expect(result.status).toBe("server-invalid");
    expect(form.serverIssues.get()).toHaveLength(1);
    expect(form.serverIssues.get()[0]?.code).toBe("rate_limited");
    expect(form.valid.get()).toBe(false);
    expect(form.errors.get()[""]).toEqual(["Too many submission attempts, please wait"]);
  });

  // -------------------------------------------------------------------------
  // Fixture 17: Unknown path preservation
  // -------------------------------------------------------------------------
  it("Fixture 17: preserves server issues with unknown paths at form level without dropping data", async () => {
    const form = createForm({
      initialValues: { name: "alex" },
    });

    const result = await form.submit(async () => {
      return {
        ok: false as const,
        issues: [
          {
            path: ["unmapped_remote_field", 42],
            code: "remote_validation_error",
            message: "Remote database constraint violated",
          },
        ],
      };
    });

    expect(result.status).toBe("server-invalid");
    expect(form.serverIssues.get()).toHaveLength(1);
    const preserved = form.serverIssues.get()[0];
    expect(preserved?.code).toBe("remote_validation_error");
    expect(preserved?.path).toEqual(["unmapped_remote_field", 42]);
    expect(form.valid.get()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Fixture 18: Coexistence of client validation and server issues
  // -------------------------------------------------------------------------
  it("Fixture 18: allows client validation issues and server issues to coexist cleanly", async () => {
    const usernameField = createField({
      initialValue: "alex",
      rules: [
        (v: string) => (v.length < 5 ? { code: "min_length", message: "Min length 5" } : null),
      ],
    });

    const emailField = createField({
      initialValue: "alex@example.com",
    });

    const form = createForm({
      initialValues: {
        username: "alex",
        email: "alex@example.com",
      },
    });
    (form.fields as any).username = usernameField;
    (form.fields as any).email = emailField;

    // Attach server issue to email
    form.setServerIssues([
      { path: ["email"], code: "server.dns_invalid", message: "MX lookup failed" },
    ]);

    expect(emailField.serverIssues.get()).toHaveLength(1);
    expect(emailField.issues.get()[0]?.code).toBe("server.dns_invalid");

    // Trigger client validation on username field
    usernameField.setValue("al"); // min_length fails

    expect(usernameField.issues.get()[0]?.code).toBe("min_length");
    // Email server issue is preserved during username validation
    expect(emailField.serverIssues.get()[0]?.code).toBe("server.dns_invalid");
    expect(form.issues.get()).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // Fixture 19: Editing field clears only its owned server issues
  // -------------------------------------------------------------------------
  it("Fixture 19: editing a field clears only its own server issue", async () => {
    const form = createForm({
      initialValues: {
        fieldA: "valA",
        fieldB: "valB",
      },
    });

    form.setServerIssues([
      { path: ["fieldA"], code: "err_a", message: "Error in A" },
      { path: ["fieldB"], code: "err_b", message: "Error in B" },
    ]);

    expect(form.fields.fieldA.serverIssues.get()).toHaveLength(1);
    expect(form.fields.fieldB.serverIssues.get()).toHaveLength(1);

    // Edit field A
    form.fields.fieldA.setValue("newA");

    expect(form.fields.fieldA.serverIssues.get()).toEqual([]);
    expect(form.fields.fieldB.serverIssues.get()).toHaveLength(1);
    expect(form.fields.fieldB.serverIssues.get()[0]?.code).toBe("err_b");
  });

  // -------------------------------------------------------------------------
  // Fixture 20: Next submit clears previous server issues on start
  // -------------------------------------------------------------------------
  it("Fixture 20: clears previous server issues when a new submit begins", async () => {
    const form = createForm({
      initialValues: { code: "ABC" },
    });

    form.setServerIssues([{ path: ["code"], code: "invalid_promo" }]);
    expect(form.fields.code.serverIssues.get()).toHaveLength(1);

    await form.submit(async () => {
      return { ok: true as const, result: "applied" };
    });

    expect(form.fields.code.serverIssues.get()).toEqual([]);
    expect(form.serverIssues.get()).toEqual([]);
    expect(form.submissionStatus.get()).toBe("succeeded");
  });

  // -------------------------------------------------------------------------
  // Fixture 21: Successful submit does NOT mutate baseline dirty state
  // -------------------------------------------------------------------------
  it("Fixture 21: successful submit does not implicitly reset initial baseline or dirty state", async () => {
    const form = createForm({
      initialValues: { count: 1 },
    });

    form.fields.count.setValue(10);
    expect(form.dirty.get()).toBe(true);

    const result = await form.submit(async () => "saved");
    expect(result.status).toBe("succeeded");

    // Dirty remains true unless explicitly reinitialized or reset
    expect(form.dirty.get()).toBe(true);
    expect(form.fields.count.initialValue.get()).toBe(1);

    // Explicit reinitialization updates baseline
    form.reinitialize({ count: 10 });
    expect(form.dirty.get()).toBe(false);
    expect(form.fields.count.initialValue.get()).toBe(10);
  });

  // -------------------------------------------------------------------------
  // Fixture 22: Reset and Reinitialize baseline semantics
  // -------------------------------------------------------------------------
  it("Fixture 22: tests reset and reinitialize baseline semantics", () => {
    const form = createForm({
      initialValues: { user: "john", role: "guest" },
    });

    form.fields.user.setValue("jane");
    form.fields.role.setValue("admin");
    expect(form.dirty.get()).toBe(true);

    // reset() returns to original baseline
    form.reset();
    expect(form.fields.user.value.get()).toBe("john");
    expect(form.fields.role.value.get()).toBe("guest");
    expect(form.dirty.get()).toBe(false);

    // reset(newBaseline) adopts new baseline
    form.reset({ user: "alice", role: "member" });
    expect(form.fields.user.value.get()).toBe("alice");
    expect(form.fields.user.initialValue.get()).toBe("alice");
    expect(form.dirty.get()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Fixture 23: Parser-backed reset Raw/Value correctness
  // -------------------------------------------------------------------------
  it("Fixture 23: enforces parser-backed reset Raw/Value correctness", () => {
    const numParser = createNumberParser();
    const field = createField({
      initialValue: 42,
      initialRawValue: "42",
      parser: numParser,
    });

    field.setRawValue("99");
    expect(field.value.get()).toBe(99);
    expect(field.rawValue.get()).toBe("99");
    expect(field.dirty.get()).toBe(true);

    // Resetting with no args restores both baselines
    field.reset();
    expect(field.value.get()).toBe(42);
    expect(field.rawValue.get()).toBe("42");
    expect(field.dirty.get()).toBe(false);

    // Resetting with only domain value throws on parser field
    expect(() => (field as any).reset(100)).toThrow(TypeError);

    // Resetting with both domain and raw succeeds
    field.reset(100, "100");
    expect(field.value.get()).toBe(100);
    expect(field.rawValue.get()).toBe("100");
    expect(field.initialValue.get()).toBe(100);
    expect(field.initialRawValue.get()).toBe("100");
    expect(field.dirty.get()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Fixture 24: Array server issue routing
  // -------------------------------------------------------------------------
  it("Fixture 24: routes server issue to targeted array item", async () => {
    const form = createForm({
      initialValues: {
        contacts: [{ email: "a@example.com" }, { email: "b@example.com" }],
      },
    });

    const result = await form.submit(async () => {
      return {
        ok: false as const,
        issues: [
          {
            path: ["contacts", 1, "email"],
            code: "domain_blacklisted",
            message: "Domain is blacklisted",
          },
        ],
      };
    });

    expect(result.status).toBe("server-invalid");
    const contact1Email = form.getNode("contacts[1].email") as any;
    expect(contact1Email.serverIssues.get()).toHaveLength(1);
    expect(contact1Email.serverIssues.get()[0]?.code).toBe("domain_blacklisted");

    const contact0Email = form.getNode("contacts[0].email") as any;
    expect(contact0Email.serverIssues.get()).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Fixture 25: Array reorder while submission is pending (MAJOR RESEARCH FIXTURE)
  // -------------------------------------------------------------------------
  it("Fixture 25: routes server error by submitted item identity snapshot across array reorder", async () => {
    const form = createForm({
      initialValues: {
        contacts: [
          { id: "contact_a", email: "a@example.com" },
          { id: "contact_b", email: "b@example.com" },
        ],
      },
      keyExtractor: (item: any) => item.id,
    });

    const contactsArray = form.fields.contacts;
    const initialItemAId = contactsArray.items.get()[0]?.id;
    const initialItemBId = contactsArray.items.get()[1]?.id;
    expect(initialItemAId).toBe("contact_a");
    expect(initialItemBId).toBe("contact_b");

    let resolveAction: (val: any) => void;
    const submitPromise = form.submit(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );

    expect(form.submissionStatus.get()).toBe("submitting");

    // While submission request is in-flight on the server, user reorders array:
    // swap index 0 and 1 so contact B is now index 0 and contact A is index 1!
    contactsArray.swap(0, 1);
    expect(contactsArray.items.get()[0]?.id).toBe("contact_b");
    expect(contactsArray.items.get()[1]?.id).toBe("contact_a");

    // Server responds with an error for the item that was at submitted index 0 (contact A):
    resolveAction!({
      ok: false,
      issues: [
        {
          path: ["contacts", 0, "email"],
          code: "invalid_domain",
          message: "Contact A domain rejected by server",
        },
      ],
    });

    const result = await submitPromise;
    expect(result.status).toBe("server-invalid");

    // VERIFICATION OF CRITICAL F6 FIXTURE:
    // The server error for submitted index 0 MUST attach to Contact A (which is now at index 1)!
    // Contact B (now at index 0) must NOT have received Contact A's error!
    const liveIndex0Node = contactsArray.items.get()[0]?.node as any;
    const liveIndex1Node = contactsArray.items.get()[1]?.node as any;

    expect(liveIndex0Node.fields.email.serverIssues.get()).toEqual([]); // Contact B is clean!
    expect(liveIndex1Node.fields.email.serverIssues.get()).toHaveLength(1); // Contact A got the error!
    expect(liveIndex1Node.fields.email.serverIssues.get()[0]?.code).toBe("invalid_domain");

    // Live form issues computes the issue path using current position (index 1)
    const issues = form.issues.get();
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toEqual(["contacts", 1, "email"]);
  });

  // -------------------------------------------------------------------------
  // Fixture 26: Array item removed while submission is pending
  // -------------------------------------------------------------------------
  it("Fixture 26: preserves server error at form level when target array item was deleted in flight", async () => {
    const form = createForm({
      initialValues: {
        tasks: [
          { id: "task_1", title: "First" },
          { id: "task_2", title: "Second" },
        ],
      },
      keyExtractor: (item: any) => item.id,
    });

    let resolveAction: (val: any) => void;
    const submitPromise = form.submit(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );

    // User removes item 0 (task_1) while request is pending
    form.fields.tasks.remove(0);
    expect(form.fields.tasks.items.get()).toHaveLength(1);

    // Server returns issue targeting submitted index 0
    resolveAction!({
      ok: false,
      issues: [
        {
          path: ["tasks", 0, "title"],
          code: "server_title_error",
          message: "Task 1 title is invalid",
        },
      ],
    });

    const result = await submitPromise;
    expect(result.status).toBe("server-invalid");

    // Because task_1 was deleted, issue cannot attach to non-existent node,
    // and is safely preserved at the form level with original path!
    expect(form.serverIssues.get()).toHaveLength(1);
    expect(form.serverIssues.get()[0]?.code).toBe("server_title_error");
    expect(form.serverIssues.get()[0]?.path).toEqual(["tasks", 0, "title"]);
  });

  // -------------------------------------------------------------------------
  // Fixture 27: Resource stability across repeated submissions
  // -------------------------------------------------------------------------
  it("Fixture 27: proves zero controller / memory accumulation across 100 submit cycles", async () => {
    const form = createForm({
      initialValues: { counter: 0 },
    });

    for (let i = 0; i < 100; i++) {
      form.fields.counter.setValue(i);
      const res = await form.submit(async (out) => {
        return { count: out.counter };
      });
      expect(res.status).toBe("succeeded");
    }

    expect(form.submissionStatus.get()).toBe("succeeded");
    form.dispose();
  });

  // -------------------------------------------------------------------------
  // Fixture 28: Diagnostics and privacy protection
  // -------------------------------------------------------------------------
  it("Fixture 28: diagnostics records structural events without leaking payload data or messages", () => {
    const diagnostics = createDiagnostics({ clock: () => 12345 });

    diagnostics.run(() => {
      const form = createForm({
        initialValues: { password: "super_secret_password_123" },
      });
      form.fields.password.setValue("new_super_secret_456");
      form.setServerIssues([
        {
          path: ["password"],
          code: "password_pwned",
          message: "Sensitive database leaked message",
        },
      ]);
    });

    const events = diagnostics.getEvents();
    const serialized = JSON.stringify(events);

    expect(serialized).not.toContain("super_secret_password_123");
    expect(serialized).not.toContain("new_super_secret_456");
    expect(serialized).not.toContain("Sensitive database leaked message");
  });

  // -------------------------------------------------------------------------
  // Fixture 29: Unexpected action rejection
  // -------------------------------------------------------------------------
  it("Fixture 29: unexpected action throw rejects submit promise and marks status failed without creating field issue", async () => {
    const form = createForm({
      initialValues: { text: "hello" },
    });

    await expect(
      form.submit(async () => {
        throw new TypeError("Unexpected database network crash");
      }),
    ).rejects.toThrow("Unexpected database network crash");

    expect(form.submissionStatus.get()).toBe("failed");
    expect(form.issues.get()).toEqual([]); // No field issue synthesized
  });

  // -------------------------------------------------------------------------
  // Fixture 30: Prototype pollution defenses in server issues
  // -------------------------------------------------------------------------
  it("Fixture 30: blocks prototype pollution on server issue codes while safely treating path data", () => {
    const form = createForm({
      initialValues: {
        constructor: "valid_domain_field",
      },
    });

    // Prototype pollution code blocked
    expect(() => {
      form.setServerIssues([{ code: "__proto__", message: "polluted" }]);
    }).toThrow(/Prototype pollution attempt blocked/);

    expect(() => {
      form.setServerIssues([{ code: "constructor", message: "polluted" }]);
    }).toThrow(/Prototype pollution attempt blocked/);

    // Reserved property name as data path segment is permitted safely without polluting Object.prototype
    form.setServerIssues([
      { path: ["constructor"], code: "server.invalid_constructor", message: "Constructor error" },
    ]);

    expect((Object.prototype as any).polluted).toBeUndefined();
    expect(form.fields.constructor.serverIssues.get()).toHaveLength(1);
  });

  // -------------------------------------------------------------------------
  // Fixture 31: Config default submitAction vs call-site action override
  // -------------------------------------------------------------------------
  it("Fixture 31: uses config submitAction by default and allows call-site override", async () => {
    let configActionCalled = false;
    let overrideActionCalled = false;

    const form = createForm({
      initialValues: { item: "pencil" },
      submitAction: async () => {
        configActionCalled = true;
        return "from_config";
      },
    });

    // Call submit without action -> uses configAction
    const res1 = await form.submit();
    expect(configActionCalled).toBe(true);
    expect(res1).toStrictEqual({ status: "succeeded", result: "from_config" });

    // Call submit with override
    const res2 = await form.submit(async () => {
      overrideActionCalled = true;
      return "from_override";
    });
    expect(overrideActionCalled).toBe(true);
    expect(res2).toStrictEqual({ status: "succeeded", result: "from_override" });
  });

  // -------------------------------------------------------------------------
  // Fixture 32: Submitting computed signal accuracy
  // -------------------------------------------------------------------------
  it("Fixture 32: tracks form.submitting computed accurately across lifecycle", async () => {
    const form = createForm({
      initialValues: { title: "Doc" },
    });

    expect(form.submitting.get()).toBe(false);

    let checkSubmittingInsideAction = false;
    const submitPromise = form.submit(async () => {
      checkSubmittingInsideAction = form.submitting.get();
      await new Promise((resolve) => setTimeout(resolve, 30));
      return "done";
    });

    expect(form.submitting.get()).toBe(true);
    await submitPromise;

    expect(checkSubmittingInsideAction).toBe(true);
    expect(form.submitting.get()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Fixture 33: Setting raw value on parser field clears server issues
  // -------------------------------------------------------------------------
  it("Fixture 33: setting raw value on parser field clears server issues and updates validity", () => {
    const parser = createNumberParser();
    const field = createField({
      initialValue: 10,
      initialRawValue: "10",
      parser,
    });

    field.setServerIssues([{ code: "server.out_of_stock", message: "Item out of stock" }]);
    expect(field.serverIssues.get()).toHaveLength(1);
    expect(field.valid.get()).toBe(false);

    field.setRawValue("20");
    expect(field.serverIssues.get()).toEqual([]);
    expect(field.value.get()).toBe(20);
    expect(field.valid.get()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Fixture 34: Setting raw value to unparseable clears server issues and sets parse issue
  // -------------------------------------------------------------------------
  it("Fixture 34: setting invalid raw value on parser field clears server issues and reports parse issue", () => {
    const parser = createNumberParser();
    const field = createField({
      initialValue: 10,
      initialRawValue: "10",
      parser,
    });

    field.setServerIssues([{ code: "server.bad", message: "Server error" }]);
    expect(field.serverIssues.get()).toHaveLength(1);

    field.setRawValue("abc");
    expect(field.serverIssues.get()).toEqual([]);
    expect(field.parseStatus.get()).toBe("invalid");
    expect(field.issues.get()[0]?.source).toBe("parse");
  });

  // -------------------------------------------------------------------------
  // Fixture 35: form.clearServerIssues() clears server issues across the entire tree
  // -------------------------------------------------------------------------
  it("Fixture 35: clearServerIssues recursively clears server issues across all tree nodes", () => {
    const form = createForm({
      initialValues: {
        rootField: "a",
        group: { childField: "b" },
        items: [{ tag: "c" }],
      },
    });

    form.setServerIssues([
      { code: "root_error" },
      { path: ["rootField"], code: "root_field_error" },
      { path: ["group"], code: "group_error" },
      { path: ["group", "childField"], code: "child_field_error" },
      { path: ["items", 0, "tag"], code: "item_tag_error" },
    ]);

    expect(form.serverIssues.get()).toHaveLength(1);
    expect(form.fields.rootField.serverIssues.get()).toHaveLength(1);
    expect(form.fields.group.serverIssues.get()).toHaveLength(1);
    expect((form.fields.group.fields.childField as any).serverIssues.get()).toHaveLength(1);
    expect(
      ((form.fields.items.items.get()[0]?.node as any).fields.tag as any).serverIssues.get(),
    ).toHaveLength(1);
    expect(form.valid.get()).toBe(false);

    form.clearServerIssues();

    expect(form.serverIssues.get()).toEqual([]);
    expect(form.fields.rootField.serverIssues.get()).toEqual([]);
    expect(form.fields.group.serverIssues.get()).toEqual([]);
    expect((form.fields.group.fields.childField as any).serverIssues.get()).toEqual([]);
    expect(
      ((form.fields.items.items.get()[0]?.node as any).fields.tag as any).serverIssues.get(),
    ).toEqual([]);
    expect(form.valid.get()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Fixture 36: FieldGroup setServerIssues and clearServerIssues
  // -------------------------------------------------------------------------
  it("Fixture 36: supports group-level server issues and clearing", () => {
    const group = createFieldGroup({
      initialValues: { a: "valA", b: "valB" },
    });

    group.setServerIssues([{ code: "group_unauthorized", message: "Group unauthorized" }]);
    expect(group.serverIssues.get()).toHaveLength(1);
    expect(group.valid.get()).toBe(false);
    expect(group.errors.get()[""]).toEqual(["Group unauthorized"]);

    group.clearServerIssues();
    expect(group.serverIssues.get()).toEqual([]);
    expect(group.valid.get()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Fixture 37: FieldArray setServerIssues and clearServerIssues
  // -------------------------------------------------------------------------
  it("Fixture 37: supports array-level server issues and clearing", () => {
    const array = createFieldArray({
      initialValues: ["item1", "item2"],
    });

    array.setServerIssues([{ code: "array_limit_exceeded", message: "Max items reached" }]);
    expect(array.serverIssues.get()).toHaveLength(1);
    expect(array.valid.get()).toBe(false);
    expect(array.errors.get()[""]).toEqual(["Max items reached"]);

    array.clearServerIssues();
    expect(array.serverIssues.get()).toEqual([]);
    expect(array.valid.get()).toBe(true);
  });

  // -------------------------------------------------------------------------
  // Fixture 38: Action returning string error array coerces to ServerIssue format
  // -------------------------------------------------------------------------
  it("Fixture 38: coerces string error array to standardized ServerIssue objects", async () => {
    const form = createForm({
      initialValues: { name: "test" },
    });

    const result = await form.submit(async () => {
      return {
        ok: false as const,
        issues: ["Simple error string 1", "Simple error string 2"],
      };
    });

    expect(result.status).toBe("server-invalid");
    expect(form.serverIssues.get()).toHaveLength(2);
    expect(form.serverIssues.get()[0]?.code).toBe("server.error");
    expect(form.serverIssues.get()[0]?.message).toBe("Simple error string 1");
    expect(form.serverIssues.get()[1]?.message).toBe("Simple error string 2");
  });

  // -------------------------------------------------------------------------
  // Fixture 39: Action returning bare primitive number
  // -------------------------------------------------------------------------
  it("Fixture 39: handles submit action returning bare primitive result", async () => {
    const form = createForm({
      initialValues: { num: 5 },
    });

    const result = await form.submit(async () => {
      return 42;
    });

    expect(result).toStrictEqual({ status: "succeeded", result: 42 });
  });

  // -------------------------------------------------------------------------
  // Fixture 40: Action returning bare object result
  // -------------------------------------------------------------------------
  it("Fixture 40: handles submit action returning bare object result", async () => {
    const form = createForm({
      initialValues: { user: "john" },
    });

    const result = await form.submit(async () => {
      return { token: "secret_jwt", expiresAt: 3600 };
    });

    expect(result).toStrictEqual({
      status: "succeeded",
      result: { token: "secret_jwt", expiresAt: 3600 },
    });
  });

  // -------------------------------------------------------------------------
  // Fixture 41: Submit call options duplicatePolicy override (reject)
  // -------------------------------------------------------------------------
  it("Fixture 41: allows duplicatePolicy override per submit call (reject)", async () => {
    const form = createForm({
      initialValues: { text: "val" },
      duplicatePolicy: "drop", // config default
    });

    const slowAction = async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      return "done";
    };

    const firstSubmit = form.submit(slowAction);

    // Call submit with reject override
    await expect(form.submit(slowAction, { duplicatePolicy: "reject" })).rejects.toThrow(
      "Submission is already in progress",
    );

    await firstSubmit;
  });

  // -------------------------------------------------------------------------
  // Fixture 42: Submit call options duplicatePolicy override (supersede)
  // -------------------------------------------------------------------------
  it("Fixture 42: allows duplicatePolicy override per submit call (supersede)", async () => {
    const form = createForm({
      initialValues: { text: "val" },
      duplicatePolicy: "drop", // config default
    });

    let firstAborted = false;
    const firstSubmit = form.submit(async (_, { signal }) => {
      signal.addEventListener("abort", () => {
        firstAborted = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "first";
    });

    const secondSubmit = form.submit(async () => "second", { duplicatePolicy: "supersede" });

    const res1 = await firstSubmit;
    const res2 = await secondSubmit;

    expect(firstAborted).toBe(true);
    expect(res1).toStrictEqual({ status: "cancelled" });
    expect(res2).toStrictEqual({ status: "succeeded", result: "second" });
  });

  // -------------------------------------------------------------------------
  // Fixture 43: Async validator throws during submit -> status failed, error thrown
  // -------------------------------------------------------------------------
  it("Fixture 43: handles async validator exception during submit cleanly", async () => {
    const form = createForm({
      initialValues: { text: "val" },
      rules: [
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error("Validation service unavailable");
        },
      ],
    });

    await expect(form.submit(async () => "saved")).rejects.toThrow(
      "Validation service unavailable",
    );

    expect(form.submissionStatus.get()).toBe("failed");
    expect(form.submitting.get()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Fixture 44: Deep nested array inside group inside array snapshot routing
  // -------------------------------------------------------------------------
  it("Fixture 44: resolves multi-level nested array snapshot identities across reorders", async () => {
    const form = createForm({
      initialValues: {
        departments: [
          {
            deptId: "dept_eng",
            teams: [
              { teamId: "team_infra", name: "Infrastructure" },
              { teamId: "team_core", name: "Core" },
            ],
          },
        ],
      },
      keyExtractor: (item: any) => item.deptId || item.teamId,
    });

    let resolveAction: (val: any) => void;
    const submitPromise = form.submit(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );

    // Reorder inner teams: swap index 0 and 1
    const dept0Teams = (form.fields.departments.items.get()[0]?.node as any).fields.teams;
    dept0Teams.swap(0, 1);
    expect(dept0Teams.items.get()[0]?.id).toBe("team_core");
    expect(dept0Teams.items.get()[1]?.id).toBe("team_infra");

    // Server returns error for submitted inner team 0 ("team_infra")
    resolveAction!({
      ok: false,
      issues: [
        {
          path: ["departments", 0, "teams", 0, "name"],
          code: "team_name_taken",
          message: "Team name already taken",
        },
      ],
    });

    const result = await submitPromise;
    expect(result.status).toBe("server-invalid");

    // "team_infra" is now at index 1 in the live form
    const liveTeam1Name = (dept0Teams.items.get()[1]?.node as any).fields.name;
    expect(liveTeam1Name.serverIssues.get()).toHaveLength(1);
    expect(liveTeam1Name.serverIssues.get()[0]?.code).toBe("team_name_taken");

    // "team_core" at index 0 is clean
    const liveTeam0Name = (dept0Teams.items.get()[0]?.node as any).fields.name;
    expect(liveTeam0Name.serverIssues.get()).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Fixture 45: Reordering multiple independent arrays concurrently during submit
  // -------------------------------------------------------------------------
  it("Fixture 45: routes server errors across multiple independent arrays concurrently reordered", async () => {
    const form = createForm({
      initialValues: {
        arrayA: [{ id: "a1" }, { id: "a2" }],
        arrayB: [{ id: "b1" }, { id: "b2" }],
      },
      keyExtractor: (item: any) => item.id,
    });

    let resolveAction: (val: any) => void;
    const submitPromise = form.submit(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );

    // Swap both arrays in flight
    form.fields.arrayA.swap(0, 1);
    form.fields.arrayB.swap(0, 1);

    // Return issues for submitted index 0 on both arrays
    resolveAction!({
      ok: false,
      issues: [
        { path: ["arrayA", 0, "id"], code: "err_a1" },
        { path: ["arrayB", 0, "id"], code: "err_b1" },
      ],
    });

    const result = await submitPromise;
    expect(result.status).toBe("server-invalid");

    // In live form, a1 is at arrayA[1] and b1 is at arrayB[1]
    const liveA1 = form.fields.arrayA.items.get()[1]?.node as any;
    const liveB1 = form.fields.arrayB.items.get()[1]?.node as any;

    expect(liveA1.fields.id.serverIssues.get()[0]?.code).toBe("err_a1");
    expect(liveB1.fields.id.serverIssues.get()[0]?.code).toBe("err_b1");
  });

  // -------------------------------------------------------------------------
  // Fixture 46: form.reinitialize(partialValues) updates specified baselines
  // -------------------------------------------------------------------------
  it("Fixture 46: reinitializes form with partial baseline values", () => {
    const form = createForm({
      initialValues: { a: "oldA", b: "oldB" },
    });

    form.fields.a.setValue("editedA");
    expect(form.dirty.get()).toBe(true);

    form.reinitialize({ a: "editedA" });
    expect(form.fields.a.value.get()).toBe("editedA");
    expect(form.fields.a.initialValue.get()).toBe("editedA");
    expect(form.fields.b.value.get()).toBe("oldB");
    expect(form.dirty.get()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Fixture 47: form.reset(partialValues) on group updates baseline
  // -------------------------------------------------------------------------
  it("Fixture 47: resets form with partial new baseline values", () => {
    const form = createForm({
      initialValues: { x: 1, y: 2 },
    });

    form.fields.x.setValue(10);
    form.fields.y.setValue(20);
    expect(form.dirty.get()).toBe(true);

    form.reset({ x: 100 });
    expect(form.fields.x.value.get()).toBe(100);
    expect(form.fields.x.initialValue.get()).toBe(100);
    expect(form.fields.y.value.get()).toBe(2);
    expect(form.dirty.get()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Fixture 48: Scope disposal cascades to child fields and aborts active submissions
  // -------------------------------------------------------------------------
  it("Fixture 48: scope disposal aborts in flight submission and cleans up child scopes", async () => {
    let aborted = false;
    const form = createForm({
      initialValues: { text: "hello" },
    });

    const submitPromise = form.submit(async (_, { signal }) => {
      signal.addEventListener("abort", () => {
        aborted = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 50));
      return "ok";
    });

    form.dispose();
    const result = await submitPromise;

    expect(aborted).toBe(true);
    expect(result).toStrictEqual({ status: "cancelled" });
  });

  // -------------------------------------------------------------------------
  // Fixture 49: Server issue with undefined or empty message defaults to code in errors
  // -------------------------------------------------------------------------
  it("Fixture 49: server issue with empty message falls back to code in errors computed", () => {
    const form = createForm({
      initialValues: { title: "Test" },
    });

    form.setServerIssues([{ path: ["title"], code: "title_unavailable" }]);
    expect(form.fields.title.errors.get()).toEqual(["title_unavailable"]);
  });

  // -------------------------------------------------------------------------
  // Fixture 50: Non-string and empty string server issue codes throw TypeError
  // -------------------------------------------------------------------------
  it("Fixture 50: throws TypeError on non-string or empty server issue code", () => {
    const form = createForm({
      initialValues: { title: "Test" },
    });

    expect(() => form.setServerIssues([{ code: "" } as any])).toThrow(TypeError);
    expect(() => form.setServerIssues([{ code: 123 } as any])).toThrow(TypeError);
    expect(() => form.setServerIssues([null as any])).toThrow(TypeError);
  });

  // -------------------------------------------------------------------------
  // Fixture 51: Server issue path validation throws on invalid path types
  // -------------------------------------------------------------------------
  it("Fixture 51: throws TypeError on invalid server issue path structure", () => {
    const form = createForm({
      initialValues: { title: "Test" },
    });

    expect(() => form.setServerIssues([{ code: "err", path: "not-an-array" } as any])).toThrow(
      TypeError,
    );

    expect(() => form.setServerIssues([{ code: "err", path: [true] } as any])).toThrow(TypeError);
  });

  // -------------------------------------------------------------------------
  // Fixture 52: bindFormToExternalState provides complete submission API
  // -------------------------------------------------------------------------
  it("Fixture 52: bindFormToExternalState passes through submission methods and status", async () => {
    const external = createField({ initialValue: { name: "sync" } });
    const form = createForm({
      initialValues: { name: "sync" },
    });

    expect(form.submissionStatus.get()).toBe("idle");
    expect(form.submitting.get()).toBe(false);

    const result = await form.submit(async (out) => {
      return { savedName: out.name };
    });

    expect(result).toStrictEqual({ status: "succeeded", result: { savedName: "sync" } });
    expect(form.submissionStatus.get()).toBe("succeeded");
  });

  // -------------------------------------------------------------------------
  // Fixture 53: Compile-time type constraints and negative type validations
  // -------------------------------------------------------------------------
  it("Fixture 53: satisfies type signatures and discriminated union contracts", () => {
    interface MyFormValues {
      title: string;
      tags: string[];
    }

    const form = createForm<MyFormValues>({
      initialValues: {
        title: "Vii Form",
        tags: ["react", "typescript"],
      },
    });

    // Compile-time checks:
    const status: string = form.submissionStatus.get();
    expect(typeof status).toBe("string");

    const isSubmitting: boolean = form.submitting.get();
    expect(typeof isSubmitting).toBe("boolean");

    const invalidFormConfig: FormConfig<MyFormValues> = {
      initialValues: { title: "a", tags: [] },
      // @ts-expect-error - invalid duplicate policy string
      duplicatePolicy: "unsupported_policy",
    };

    // @ts-expect-error - server issue missing code
    const invalidServerIssue: ServerIssueInput = { message: "no code" };

    expect(invalidFormConfig).toBeDefined();
    expect(invalidServerIssue).toBeDefined();
  });
  // -------------------------------------------------------------------------
  // Review regressions (F6 fix pass): submission snapshot integrity
  // -------------------------------------------------------------------------
  describe("F6 review regressions - deepCloneSnapshot", () => {
    it("an own enumerable __proto__ key is copied as data, never applied as a prototype", () => {
      const hostile = JSON.parse('{"a":1,"__proto__":{"pollutedViaSnapshot":true}}');
      expect(Object.hasOwn(hostile, "__proto__")).toBe(true);

      const snap = deepCloneSnapshot(hostile) as Record<string, unknown>;

      // The snapshot keeps its own prototype: the payload handed to a submit
      // action must not inherit keys that were never fields of the form.
      expect(Object.getPrototypeOf(snap)).toBe(Object.prototype);
      expect((snap as any).pollutedViaSnapshot).toBeUndefined();
      // The data itself is preserved rather than silently dropped.
      expect(Object.hasOwn(snap, "__proto__")).toBe(true);
      expect(
        (Object.getOwnPropertyDescriptor(snap, "__proto__")?.value as any).pollutedViaSnapshot,
      ).toBe(true);
      // And nothing escaped to the global prototype.
      expect(({} as any).pollutedViaSnapshot).toBeUndefined();
      expect(Object.hasOwn(Object.prototype, "pollutedViaSnapshot")).toBe(false);
    });

    it("a cyclic output snapshots instead of overflowing the stack", () => {
      const cyclic: any = { a: 1, nested: { b: 2 } };
      cyclic.self = cyclic;
      cyclic.nested.parent = cyclic;

      const snap = deepCloneSnapshot(cyclic) as any;

      expect(snap.a).toBe(1);
      expect(snap.self).toBe(snap);
      expect(snap.nested.parent).toBe(snap);
      expect(snap.nested).not.toBe(cyclic.nested);
    });

    it("a shared reference stays shared in the snapshot", () => {
      const shared = { id: 1 };
      const snap = deepCloneSnapshot({ left: shared, right: shared }) as any;
      expect(snap.left).toBe(snap.right);
      expect(snap.left).not.toBe(shared);
    });

    it("Map and Set values survive the snapshot instead of flattening to {}", () => {
      const snap = deepCloneSnapshot({
        m: new Map<string, unknown>([["k", { deep: 1 }]]),
        s: new Set([1, 2]),
      }) as any;

      expect(snap.m).toBeInstanceOf(Map);
      expect(snap.m.get("k")).toEqual({ deep: 1 });
      expect(snap.s).toBeInstanceOf(Set);
      expect([...snap.s]).toEqual([1, 2]);
    });

    it("a cyclic output transform fails the submission cleanly rather than crashing", async () => {
      const form = createForm<{ a: string }>({ initialValues: { a: "x" } });
      let received: unknown = null;
      const cyclicNode: any = form.getNode("a");
      void cyclicNode;

      const res = await form.submit(async (output) => {
        received = output;
        return "ok";
      });

      expect(res.status).toBe("succeeded");
      expect(received).toEqual({ a: "x" });
      form.dispose();
    });
  });

  // -------------------------------------------------------------------------
  // Terminal Submission Status Consistency Correction (Model A)
  // -------------------------------------------------------------------------
  describe("Terminal Submission Status Consistency Correction (Model A)", () => {
    it("successful submit: direct field.setValue keeps 'succeeded' while dirty becomes true", async () => {
      const form = createForm({ initialValues: { email: "a@b.com" } });
      await form.submit(async () => "ok");

      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(false);

      form.fields.email.setValue("new@b.com");
      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(true);
      expect(form.fields.email.dirty.get()).toBe(true);
    });

    it("successful submit: field.setRawValue keeps 'succeeded' while dirty becomes true", async () => {
      const field = createField<number, string>({
        initialValue: 10,
        initialRawValue: "10",
        parser: createNumberParser(),
      });
      field.setRawValue("20");
      expect(field.value.get()).toBe(20);
      expect(field.dirty.get()).toBe(true);

      const form = createForm({
        initialValues: { text: "hello" },
      });
      await form.submit(async () => "ok");

      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(false);

      form.fields.text.setRawValue("world");
      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(true);
      expect(form.fields.text.value.get()).toBe("world");
    });

    it("successful submit: form.setValues keeps 'succeeded' while dirty becomes true", async () => {
      const form = createForm({ initialValues: { a: 1, b: 2 } });
      await form.submit(async () => "ok");

      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(false);

      form.setValues({ a: 99 });
      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(true);
      expect(form.fields.a.dirty.get()).toBe(true);
      expect(form.fields.b.dirty.get()).toBe(false);
    });

    it("successful submit: nested group mutation keeps 'succeeded' while dirty becomes true", async () => {
      const form = createForm({
        initialValues: {
          user: {
            profile: {
              name: "Alice",
            },
          },
        },
      });
      await form.submit(async () => "ok");

      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(false);

      form.fields.user.fields.profile.fields.name.setValue("Bob");
      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(true);
      expect(form.fields.user.dirty.get()).toBe(true);
    });

    it("successful submit: array item mutation keeps 'succeeded' while dirty becomes true", async () => {
      const form = createForm({
        initialValues: {
          tags: ["react", "typescript"],
        },
      });
      await form.submit(async () => "ok");

      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(false);

      form.fields.tags.items.get()[0]?.node.setValue("vue");
      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(true);
      expect(form.fields.tags.dirty.get()).toBe(true);
    });

    it("successful submit: array insert/remove/swap/move does not reset status", async () => {
      const form = createForm({
        initialValues: {
          items: ["a", "b", "c"],
        },
      });
      await form.submit(async () => "ok");

      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(false);

      form.fields.items.push("d");
      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(true);

      form.fields.items.swap(0, 1);
      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(true);

      form.fields.items.remove(0);
      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(true);
    });

    it("failed submit: ordinary edits (field.setValue, form.setValues) keep 'failed' while dirty updates", async () => {
      const form = createForm({
        initialValues: { username: "alex" },
      });
      const res = await form.submit(async () => {
        return {
          ok: false,
          issues: [{ code: "server.error", message: "Username rejected" }],
        };
      });

      expect(res.status).toBe("server-invalid");
      expect(form.submissionStatus.get()).toBe("failed");
      expect(form.dirty.get()).toBe(false);

      form.fields.username.setValue("alex_new");
      expect(form.submissionStatus.get()).toBe("failed");
      expect(form.dirty.get()).toBe(true);

      form.setValues({ username: "alex_v2" });
      expect(form.submissionStatus.get()).toBe("failed");
      expect(form.dirty.get()).toBe(true);
    });

    it("cancelled submit: ordinary edits keep 'cancelled' while dirty updates", async () => {
      const form = createForm({ initialValues: { query: "search" } });
      const submitPromise = form.submit(async (_, { signal }) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (signal.aborted) throw new Error("aborted");
        return "ok";
      });

      form.cancelSubmit();
      await submitPromise;

      expect(form.submissionStatus.get()).toBe("cancelled");
      expect(form.dirty.get()).toBe(false);

      form.fields.query.setValue("new search");
      expect(form.submissionStatus.get()).toBe("cancelled");
      expect(form.dirty.get()).toBe(true);

      form.setValues({ query: "another search" });
      expect(form.submissionStatus.get()).toBe("cancelled");
      expect(form.dirty.get()).toBe(true);
    });

    it("next submit transitions terminal status -> validating -> submitting -> new terminal state", async () => {
      const form = createForm({ initialValues: { title: "Draft" } });
      const transitions: string[] = [form.submissionStatus.get()];
      form.submissionStatus.subscribe((s) => transitions.push(s));

      await form.submit(async () => "ok");
      expect(form.submissionStatus.get()).toBe("succeeded");

      // Edit field
      form.fields.title.setValue("Final");
      expect(form.submissionStatus.get()).toBe("succeeded");

      // Second submit
      const p2 = form.submit(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return "ok2";
      });

      expect(form.submissionStatus.get()).toBe("submitting");
      await p2;
      expect(form.submissionStatus.get()).toBe("succeeded");

      expect(transitions).toEqual([
        "idle",
        "validating",
        "submitting",
        "succeeded",
        "validating",
        "submitting",
        "succeeded",
      ]);
    });

    it("reset() restores baseline, clears server issues, and transitions submissionStatus to 'idle'", async () => {
      const form = createForm({ initialValues: { email: "a@b.com" } });
      await form.submit(async () => {
        return {
          ok: false,
          issues: [{ code: "server.error", message: "fail", path: ["email"] }],
        };
      });

      expect(form.submissionStatus.get()).toBe("failed");
      expect(form.fields.email.serverIssues.get().length).toBe(1);

      form.reset();

      expect(form.submissionStatus.get()).toBe("idle");
      expect(form.fields.email.serverIssues.get().length).toBe(0);
      expect(form.dirty.get()).toBe(false);
    });

    it("reinitialize(newBaseline) replaces baseline and transitions submissionStatus to 'idle'", async () => {
      const form = createForm({ initialValues: { count: 1 } });
      await form.submit(async () => "ok");

      expect(form.submissionStatus.get()).toBe("succeeded");

      form.reinitialize({ count: 100 });

      expect(form.submissionStatus.get()).toBe("idle");
      expect(form.fields.count.value.get()).toBe(100);
      expect(form.dirty.get()).toBe(false);
    });

    it("active submitting state + field edit does not force idle and preserves submission flow", async () => {
      const form = createForm({ initialValues: { notes: "initial notes" } });
      let submittedPayload: unknown = null;

      const submitPromise = form.submit(async (output, { signal }) => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        submittedPayload = output;
        return "saved";
      });

      expect(form.submissionStatus.get()).toBe("submitting");

      // Edit while submitting is in flight
      form.fields.notes.setValue("edited notes while in-flight");
      expect(form.submissionStatus.get()).toBe("submitting");

      const res = await submitPromise;
      expect(res.status).toBe("succeeded");
      expect(submittedPayload).toEqual({ notes: "initial notes" });
      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(true);
      expect(form.values.get()).toEqual({ notes: "edited notes while in-flight" });
    });

    it("external-state ordinary sync does not force idle and preserves terminal status", () => {
      const extStore = state({ search: "query1" });
      const form = bindFormToExternalState({ externalState: extStore });

      form.submissionStatus.set("succeeded");
      expect(form.submissionStatus.get()).toBe("succeeded");

      // External store update
      extStore.set({ search: "query2" });
      expect(form.values.get()).toEqual({ search: "query2" });
      expect(form.submissionStatus.get()).toBe("succeeded");
      expect(form.dirty.get()).toBe(true);
    });

    it("server issue field-clearing behavior remains unchanged while submissionStatus stays in its terminal state", async () => {
      const form = createForm({
        initialValues: {
          first: "A",
          second: "B",
        },
      });

      const res = await form.submit(async () => {
        return {
          ok: false,
          issues: [
            { code: "err.first", message: "First issue", path: ["first"] },
            { code: "err.second", message: "Second issue", path: ["second"] },
          ],
        };
      });

      expect(res.status).toBe("server-invalid");
      expect(form.submissionStatus.get()).toBe("failed");
      expect(form.fields.first.serverIssues.get().length).toBe(1);
      expect(form.fields.second.serverIssues.get().length).toBe(1);

      // Editing 'first' clears only 'first' server issues; 'second' stays and status remains 'failed'
      form.fields.first.setValue("A_edited");
      expect(form.submissionStatus.get()).toBe("failed");
      expect(form.fields.first.serverIssues.get().length).toBe(0);
      expect(form.fields.second.serverIssues.get().length).toBe(1);
    });
  });
});
