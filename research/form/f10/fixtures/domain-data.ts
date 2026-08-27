/**
 * Form Research F10 — Domain Fixtures, Sentinels, and Test Data
 *
 * Synthetic fixtures for Consumer A (Vanilla Onboarding) and Consumer B (React Task Board).
 * Includes privacy sentinels, security edge cases, and server issue generators.
 */

import { type ServerIssueInput } from "../../form-core.js";

// ============================================================================
// 1. Privacy Sentinel Constants (Must Never Appear in Diagnostics / Traces)
// ============================================================================

export const SECRET_PASSWORD_F10_DO_NOT_LOG = "SECRET_PASSWORD_F10_DO_NOT_LOG_987654";
export const SECRET_TOKEN_F10_DO_NOT_LOG = "SECRET_TOKEN_F10_DO_NOT_LOG_abcdef123456";
export const SECRET_CARD_F10_DO_NOT_LOG = "4111_2222_3333_4444_SECRET_CARD_F10_DO_NOT_LOG";

export const PRIVACY_SENTINELS = [
  SECRET_PASSWORD_F10_DO_NOT_LOG,
  SECRET_TOKEN_F10_DO_NOT_LOG,
  SECRET_CARD_F10_DO_NOT_LOG,
] as const;

// ============================================================================
// 2. Consumer A: Onboarding Domain Types & Fixtures
// ============================================================================

export interface AddressItem {
  id?: string;
  street: string;
  city: string;
  postalCode: string;
  isPrimary?: boolean;
}

export interface OnboardingFormValues {
  account: {
    email: string;
    password: string;
    confirmPassword: string;
    username: string;
  };
  profile: {
    firstName: string;
    lastName: string;
    middleName?: string;
    birthDate: string; // parsed Date
    age: number; // parsed number
  };
  addresses: AddressItem[];
  preferences: {
    newsletter: boolean;
    smsAlerts: boolean;
    accountType: "individual" | "business";
    taxId?: string; // conditional when accountType === 'business'
  };
}

export const VALID_ONBOARDING_DATA: OnboardingFormValues = {
  account: {
    email: "test.candidate@example.com",
    password: SECRET_PASSWORD_F10_DO_NOT_LOG,
    confirmPassword: SECRET_PASSWORD_F10_DO_NOT_LOG,
    username: "candidate_vii",
  },
  profile: {
    firstName: "Alex",
    lastName: "Morgan",
    middleName: "Taylor",
    birthDate: "1992-05-15",
    age: 34,
  },
  addresses: [
    {
      id: "addr_1",
      street: "123 Market St",
      city: "San Francisco",
      postalCode: "94105",
      isPrimary: true,
    },
    {
      id: "addr_2",
      street: "456 Pine Ave",
      city: "Oakland",
      postalCode: "94612",
      isPrimary: false,
    },
  ],
  preferences: {
    newsletter: true,
    smsAlerts: false,
    accountType: "individual",
  },
};

export const INITIAL_ONBOARDING_DATA: OnboardingFormValues = {
  account: {
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
  },
  profile: {
    firstName: "",
    lastName: "",
    middleName: "",
    birthDate: "",
    age: 0,
  },
  addresses: [
    {
      id: "addr_initial",
      street: "",
      city: "",
      postalCode: "",
      isPrimary: true,
    },
  ],
  preferences: {
    newsletter: false,
    smsAlerts: false,
    accountType: "individual",
    taxId: "",
  },
};

// ============================================================================
// 3. Consumer B: Task Board Domain Types & Fixtures
// ============================================================================

export interface ChecklistItem {
  id?: string;
  title: string;
  done: boolean;
}

export interface TaskBoardFormValues {
  title: string;
  description: string;
  project: string;
  assignee: string;
  priority: "low" | "medium" | "high" | "critical";
  estimateStoryPoints: number; // parser-backed
  dueDate: string; // parser-backed
  labels: string[]; // FieldArray of strings
  checklist: ChecklistItem[]; // FieldArray of items with stable IDs
  settings: {
    notifyAssignee: boolean;
    isMilestone: boolean;
  };
  taskType: "feature" | "bug";
  // Conditional fields
  featureUserStory?: string;
  bugReproductionSteps?: string;
}

export const VALID_TASK_DATA: TaskBoardFormValues = {
  title: "Implement Form F10 Graduation Suite",
  description: "Comprehensive real-consumer validation and Build-vs-Buy comparative benchmarks.",
  project: "Vii Ecosystem",
  assignee: "maintainer@vii.dev",
  priority: "high",
  estimateStoryPoints: 5,
  dueDate: "2026-09-01",
  labels: ["research", "form", "f10", "benchmark"],
  checklist: [
    { id: "chk_1", title: "Implement Consumer A", done: true },
    { id: "chk_2", title: "Implement Consumer B", done: true },
    { id: "chk_3", title: "Execute Comparative Benchmarks", done: true },
    { id: "chk_4", title: "Complete Graduation Verdict", done: true },
  ],
  settings: {
    notifyAssignee: true,
    isMilestone: true,
  },
  taskType: "feature",
  featureUserStory:
    "As an engineer, I need evidence-backed form evaluation to make a buy decision.",
};

export const INITIAL_TASK_DATA: TaskBoardFormValues = {
  title: "",
  description: "",
  project: "Default Project",
  assignee: "",
  priority: "medium",
  estimateStoryPoints: 1,
  dueDate: "",
  labels: ["task"],
  checklist: [{ id: "chk_init_1", title: "Initial requirement", done: false }],
  settings: {
    notifyAssignee: true,
    isMilestone: false,
  },
  taskType: "feature",
  featureUserStory: "",
  bugReproductionSteps: "",
};

// ============================================================================
// 4. Server Issue Generators (10, 50, 100, 1000 Issues)
// ============================================================================

export function generateServerIssues(
  count: number,
  domain: "onboarding" | "task",
): ServerIssueInput[] {
  const issues: ServerIssueInput[] = [];

  if (domain === "onboarding") {
    // Standard known fields
    issues.push({
      code: "invalid_email_domain",
      message: "The email domain is blacklisted by server policy.",
      path: ["account", "email"],
      source: "server",
    });
    issues.push({
      code: "postal_code_mismatch",
      message: "Postal code does not match city.",
      path: ["addresses", 0, "postalCode"],
      source: "server",
    });
    // Unknown form-level issue
    issues.push({
      code: "fraud_score_exceeded",
      message: "Application score exceeded automated risk threshold.",
      path: ["securityScore", "riskEngine"],
      source: "server",
    });
  } else {
    // Task domain
    issues.push({
      code: "title_conflict",
      message: "A task with this title already exists in project.",
      path: ["title"],
      source: "server",
    });
    issues.push({
      code: "checklist_title_empty",
      message: "Checklist item must have a non-empty title.",
      path: ["checklist", 0, "title"],
      source: "server",
    });
    // Unknown form-level
    issues.push({
      code: "project_archived",
      message: "Target project has been archived on server.",
      path: ["externalSystem", "jiraSync"],
      source: "server",
    });
  }

  // Fill up to target count with synthetic paths
  for (let i = issues.length; i < count; i++) {
    const isArrayTarget = i % 2 === 0;
    const path = isArrayTarget
      ? domain === "onboarding"
        ? ["addresses", i % 5, "street"]
        : ["checklist", i % 10, "title"]
      : domain === "onboarding"
        ? ["profile", `customField_${i}`]
        : ["settings", `configKey_${i}`];

    issues.push({
      code: `server_error_${i}`,
      message: `Server validation error at position ${i}`,
      path,
      source: "server",
    });
  }

  return issues;
}

// ============================================================================
// 5. Hostile Security Payloads
// ============================================================================

export const HOSTILE_XSS_PAYLOADS = [
  "<script>window.__vii_xss_injected = true;</script>",
  '<img src=x onerror="window.__vii_xss_injected = true;">',
  '<svg onload="window.__vii_xss_injected = true;">',
  "javascript:alert('xss')",
  '<iframe src="javascript:alert(1)"></iframe>',
] as const;

export const RESERVED_OBJECT_PROPERTIES = ["__proto__", "constructor", "prototype"] as const;
