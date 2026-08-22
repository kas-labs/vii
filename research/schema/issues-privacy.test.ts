import { describe, expect, it } from "vitest";
import {
  createFormErrors,
  createLocalizer,
  formatPath,
  groupIssuesByPath,
  toDiagnosticSafeSummary,
  v,
} from "./index.js";

describe("S2: Structured Issues & Absolute Privacy", () => {
  describe("Path Formatting & Grouping", () => {
    it("formats nested and array paths consistently", () => {
      expect(formatPath([])).toBe("");
      expect(formatPath(["username"])).toBe("username");
      expect(formatPath(["profile", "address", "city"])).toBe("profile.address.city");
      expect(formatPath(["items", 0, "title"])).toBe("items[0].title");
      expect(formatPath(["matrix", 2, 5])).toBe("matrix[2][5]");
    });

    it("groups issues by formatted path for form consumption", () => {
      const formSchema = v.object({
        account: v.object({
          email: v.string().email(),
          password: v.string().min(8),
        }),
      });

      const result = formSchema.check({
        account: {
          email: "invalid",
          password: "short",
        },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const grouped = groupIssuesByPath(result.issues);
        expect(Object.keys(grouped)).toEqual(["account.email", "account.password"]);
        expect(grouped["account.email"]![0]!.code).toBe("invalid_email");
        expect(grouped["account.password"]![0]!.code).toBe("string_too_short");
      }
    });

    it("generates form field errors with custom or default formatting", () => {
      const schema = v.object({
        age: v.number().min(18),
      });

      const result = schema.check({ age: 15 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        const formErrors = createFormErrors(result.issues);
        expect(formErrors["age"]).toEqual(["Must be greater than or equal to 18"]);
      }
    });
  });

  describe("Externalized Localization", () => {
    it("localizes error messages without touching validation core", () => {
      const germanDictionary = {
        invalid_email: "Ungültige E-Mail-Adresse",
        string_too_short: (issue: any) =>
          `Mindestens ${issue.expected?.replace(">= ", "")} Zeichen erforderlich`,
      };

      const localizer = createLocalizer(germanDictionary);

      const userSchema = v.object({
        email: v.string().email(),
        bio: v.string().min(10),
      });

      const result = userSchema.check({
        email: "bad-email",
        bio: "short",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        const formErrors = createFormErrors(result.issues, localizer);
        expect(formErrors["email"]).toEqual(["Ungültige E-Mail-Adresse"]);
        expect(formErrors["bio"]).toEqual(["Mindestens 10 Zeichen erforderlich"]);
      }
    });
  });

  describe("Absolute Privacy & Value Isolation", () => {
    it("never includes sensitive raw values in issues, messages, or diagnostics", () => {
      const secretPassword = "SuperSecretPassword123!#$";
      const bearerToken = "eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitivePayload";
      const creditCard = "4111-2222-3333-4444";

      const secureSchema = v.object({
        auth: v.object({
          password: v.number(), // Mismatch: string provided
          token: v.number(), // Mismatch: token string provided
          cardNumber: v.number(), // Mismatch
        }),
      });

      const result = secureSchema.check({
        auth: {
          password: secretPassword,
          token: bearerToken,
          cardNumber: creditCard,
        },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        // Stringify full issues array to inspect all possible fields
        const serializedIssues = JSON.stringify(result.issues);

        expect(serializedIssues.includes(secretPassword)).toBe(false);
        expect(serializedIssues.includes(bearerToken)).toBe(false);
        expect(serializedIssues.includes(creditCard)).toBe(false);

        // Verify diagnostic safe summary
        const diagSummary = toDiagnosticSafeSummary(result.issues);
        const serializedDiag = JSON.stringify(diagSummary);

        expect(serializedDiag.includes(secretPassword)).toBe(false);
        expect(serializedDiag.includes(bearerToken)).toBe(false);
        expect(serializedDiag.includes(creditCard)).toBe(false);

        expect(diagSummary.issueCount).toBe(3);
        expect(diagSummary.codes).toEqual(["invalid_type"]);
        expect(diagSummary.affectedPaths).toEqual([
          "auth.password",
          "auth.token",
          "auth.cardNumber",
        ]);
      }
    });
  });
});
