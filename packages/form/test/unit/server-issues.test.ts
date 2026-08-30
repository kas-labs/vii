import { describe, expect, it } from "vitest";
import { createFieldArray } from "../../src/core/array.js";
import { createField } from "../../src/core/field.js";
import { createForm } from "../../src/core/form.js";
import { createFieldGroup } from "../../src/core/group.js";
import { sanitizeServerIssue } from "../../src/submission/server-issues.js";

describe("Server Issue Taxonomy and Routing", () => {
  describe("sanitizeServerIssue", () => {
    it("normalizes string issues to server.error code", () => {
      const issue = sanitizeServerIssue("Server internal error", ["root"]);
      expect(issue).toEqual({
        code: "server.error",
        message: "Server internal error",
        path: ["root"],
        source: "server",
      });
      expect(Object.isFrozen(issue)).toBe(true);
    });

    it("normalizes structured server issue objects", () => {
      const issue = sanitizeServerIssue({
        code: "user.conflict",
        message: "Email already registered",
        path: ["user", "email"],
      });

      expect(issue).toEqual({
        code: "user.conflict",
        message: "Email already registered",
        path: ["user", "email"],
        source: "server",
      });
      expect(Object.isFrozen(issue)).toBe(true);
      expect(Object.isFrozen(issue.path)).toBe(true);
    });

    it("protects against prototype pollution keys", () => {
      const evil = JSON.parse(
        '{"code": "pollute", "message": "bad", "path": ["__proto__", "polluted"], "__proto__": {"polluted": true}}',
      );
      const issue = sanitizeServerIssue(evil);
      expect(issue.path).toEqual(["__proto__", "polluted"]);
      expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
    });
  });

  describe("Routing to Leaf and Group Nodes", () => {
    it("routes leaf issues and localized clears on edit", async () => {
      const form = createForm({
        fields: {
          email: createField({ initialValue: "test@example.com" }),
          username: createField({ initialValue: "alice" }),
        },
      });

      await form.submit(async () => ({
        ok: false,
        issues: [
          { code: "duplicate.email", message: "Email taken", path: ["email"] },
          { code: "invalid.username", message: "Username reserved", path: ["username"] },
        ],
      }));

      expect(form.submissionStatus.get()).toBe("failed");
      expect(form.fields.email.serverIssues.get()).toHaveLength(1);
      expect(form.fields.email.issues.get()[0]?.message).toBe("Email taken");
      expect(form.fields.username.serverIssues.get()).toHaveLength(1);
      expect(form.fields.username.issues.get()[0]?.message).toBe("Username reserved");
      expect(form.valid.get()).toBe(false);

      // Localized clearing: editing email clears ONLY email's server issues
      form.fields.email.setValue("new@example.com");

      expect(form.fields.email.serverIssues.get()).toHaveLength(0);
      expect(form.fields.email.issues.get()).toHaveLength(0);
      expect(form.fields.email.valid.get()).toBe(true);

      // Sibling field remains untouched
      expect(form.fields.username.serverIssues.get()).toHaveLength(1);
      expect(form.fields.username.valid.get()).toBe(false);
      expect(form.valid.get()).toBe(false);
    });

    it("routes to nested group fields and group nodes", async () => {
      const form = createForm({
        fields: {
          address: createFieldGroup({
            fields: {
              street: createField({ initialValue: "" }),
              city: createField({ initialValue: "Stockholm" }),
            },
          }),
        },
      });

      await form.submit(async () => ({
        ok: false,
        issues: [
          { code: "group.invalid", message: "Address invalid", path: ["address"] },
          { code: "field.invalid", message: "Street required", path: ["address", "street"] },
        ],
      }));

      expect(form.fields.address.serverIssues.get()).toHaveLength(1);
      expect(form.fields.address.serverIssues.get()[0]?.message).toBe("Address invalid");

      expect(form.fields.address.fields.street.serverIssues.get()).toHaveLength(1);
      expect(form.fields.address.fields.street.serverIssues.get()[0]?.message).toBe(
        "Street required",
      );

      expect(form.fields.address.fields.city.serverIssues.get()).toHaveLength(0);

      expect(form.issues.get()).toHaveLength(2);
    });

    it("falls back unresolvable or root issues to form.serverIssues", async () => {
      const form = createForm({
        fields: {
          name: createField({ initialValue: "Alice" }),
        },
      });

      await form.submit(async () => ({
        ok: false,
        issues: [
          { code: "global.error", message: "Database connection failed", path: [] },
          { code: "unresolvable", message: "Unknown field error", path: ["nonexistent", "deep"] },
        ],
      }));

      expect(form.serverIssues.get()).toHaveLength(2);
      expect(form.serverIssues.get()[0]?.message).toBe("Database connection failed");
      expect(form.serverIssues.get()[1]?.message).toBe("Unknown field error");
      expect(form.fields.name.serverIssues.get()).toHaveLength(0);
      expect(form.valid.get()).toBe(false);
    });
  });

  describe("FieldArray In-Flight Mutation Resilience", () => {
    it("routes server issues by stable item ID when items are reordered in flight", async () => {
      const createItem = (name: string) =>
        createFieldGroup({
          fields: {
            name: createField({ initialValue: name }),
          },
        });

      const form = createForm({
        fields: {
          contacts: createFieldArray({
            items: [createItem("Alice"), createItem("Bob"), createItem("Charlie")],
          }),
        },
      });

      // Submit begins; in-flight submit action reorders items before returning server issues
      await form.submit(async () => {
        // Swap item 0 (Alice) and item 2 (Charlie)
        form.fields.contacts.swap(0, 2);
        // Current array order is now: Charlie (0), Bob (1), Alice (2)

        return {
          ok: false,
          issues: [
            // Issue for index 0 in the submitted snapshot (which was Alice)
            { code: "name.taken", message: "Alice is taken", path: ["contacts", 0, "name"] },
          ],
        };
      });

      // Alice is now at index 2. The issue must attach to Alice at index 2!
      const items = form.fields.contacts.items.get();
      expect(items[0]?.node.fields.name.value.get()).toBe("Charlie");
      expect(items[0]?.node.fields.name.serverIssues.get()).toHaveLength(0);

      expect(items[2]?.node.fields.name.value.get()).toBe("Alice");
      expect(items[2]?.node.fields.name.serverIssues.get()).toHaveLength(1);
      expect(items[2]?.node.fields.name.serverIssues.get()[0]?.message).toBe("Alice is taken");

      // Aggregate issues report path with live index 2
      expect(form.issues.get()).toEqual([
        {
          code: "name.taken",
          message: "Alice is taken",
          path: ["contacts", 2, "name"],
          source: "server",
        },
      ]);
    });

    it("safely routes server issues to form.serverIssues if item was removed in flight", async () => {
      const createItem = (name: string) =>
        createFieldGroup({
          fields: {
            name: createField({ initialValue: name }),
          },
        });

      const form = createForm({
        fields: {
          contacts: createFieldArray({
            items: [createItem("Alice"), createItem("Bob")],
          }),
        },
      });

      await form.submit(async () => {
        // Remove item 0 (Alice) in flight
        form.fields.contacts.remove(0);
        // Only Bob remains at index 0

        return {
          ok: false,
          issues: [
            // Server error for submitted item 0 (Alice)
            { code: "name.invalid", message: "Alice invalid", path: ["contacts", 0, "name"] },
          ],
        };
      });

      // Bob (now at index 0) must NOT receive Alice's error
      const items = form.fields.contacts.items.get();
      expect(items[0]?.node.fields.name.value.get()).toBe("Bob");
      expect(items[0]?.node.fields.name.serverIssues.get()).toHaveLength(0);

      // The issue falls back to root form.serverIssues without crashing or resurrecting Alice
      expect(form.serverIssues.get()).toHaveLength(1);
      expect(form.serverIssues.get()[0]?.message).toBe("Alice invalid");
    });
  });
});
