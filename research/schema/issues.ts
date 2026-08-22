import type { SchemaIssue } from "./types.js";

export function formatPath(path: readonly (string | number)[]): string {
  if (path.length === 0) return "";
  let formatted = "";
  for (let i = 0; i < path.length; i++) {
    const segment = path[i]!;
    if (typeof segment === "number") {
      formatted += `[${segment}]`;
    } else {
      formatted += (i > 0 ? "." : "") + segment;
    }
  }
  return formatted;
}

export function groupIssuesByPath(issues: readonly SchemaIssue[]): Record<string, SchemaIssue[]> {
  const grouped: Record<string, SchemaIssue[]> = {};
  for (const issue of issues) {
    const key = formatPath(issue.path);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key]!.push(issue);
  }
  return grouped;
}

export function createFormErrors(
  issues: readonly SchemaIssue[],
  formatter?: (issue: SchemaIssue) => string,
): Record<string, string[]> {
  const formErrors: Record<string, string[]> = {};
  const resolveMessage = formatter ?? defaultIssueMessage;

  for (const issue of issues) {
    const key = formatPath(issue.path);
    if (!formErrors[key]) {
      formErrors[key] = [];
    }
    formErrors[key]!.push(resolveMessage(issue));
  }
  return formErrors;
}

export interface DiagnosticSafeIssueSummary {
  readonly issueCount: number;
  readonly codes: readonly string[];
  readonly affectedPaths: readonly string[];
}

export function toDiagnosticSafeSummary(
  issues: readonly SchemaIssue[],
): DiagnosticSafeIssueSummary {
  const codesSet = new Set<string>();
  const pathsSet = new Set<string>();

  for (const issue of issues) {
    codesSet.add(issue.code);
    pathsSet.add(formatPath(issue.path));
  }

  return {
    issueCount: issues.length,
    codes: Array.from(codesSet),
    affectedPaths: Array.from(pathsSet),
  };
}

export type LocaleDictionary = Record<string, string | ((issue: SchemaIssue) => string)>;

export function createLocalizer(
  dictionary: LocaleDictionary,
  fallbackFormatter: (issue: SchemaIssue) => string = defaultIssueMessage,
): (issue: SchemaIssue) => string {
  return (issue: SchemaIssue): string => {
    const entry = dictionary[issue.code];
    if (typeof entry === "function") {
      return entry(issue);
    }
    if (typeof entry === "string") {
      return entry;
    }
    return fallbackFormatter(issue);
  };
}

export function defaultIssueMessage(issue: SchemaIssue): string {
  if (issue.message) return issue.message;
  switch (issue.code) {
    case "invalid_type":
      return `Expected ${issue.expected ?? "valid type"}`;
    case "string_too_short":
      return `Must be at least ${issue.expected?.replace(">= ", "")} characters`;
    case "string_too_long":
      return `Must be at most ${issue.expected?.replace("<= ", "")} characters`;
    case "number_too_small":
      return `Must be greater than or equal to ${issue.expected?.replace(">= ", "")}`;
    case "number_too_large":
      return `Must be less than or equal to ${issue.expected?.replace("<= ", "")}`;
    case "not_integer":
      return "Must be an integer";
    case "not_finite":
      return "Must be a finite number";
    case "invalid_email":
      return "Invalid email address format";
    case "invalid_format":
      return "Invalid format";
    case "invalid_literal":
      return `Expected literal value ${issue.expected}`;
    case "invalid_union":
      return "Invalid input for union options";
    case "forbidden_property":
      return "Property name is forbidden";
    case "unreadable_property":
      return "Property could not be accessed safely";
    default:
      return "Invalid value";
  }
}
