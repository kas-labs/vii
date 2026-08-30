import { batch } from "@vii-labs/core";
import { getInternalNode, safeHasProperty } from "../core/internal.js";
import type { FormNode } from "../core/tree-types.js";
import type { FieldPathSegment } from "../validation/types.js";
import { createArraySnapshotKey } from "./array-snapshot.js";
import type { ArraySnapshotMap, ServerIssue } from "./types.js";

/**
 * Validates and normalizes raw server issue input into an immutable ServerIssue.
 */
export function sanitizeServerIssue(
  raw: unknown,
  defaultPath?: readonly FieldPathSegment[],
): ServerIssue {
  if (typeof raw === "string") {
    return Object.freeze({
      code: "server.error",
      message: raw,
      path: defaultPath ? Object.freeze([...defaultPath]) : undefined,
      source: "server" as const,
    });
  }

  if (raw === null || typeof raw !== "object") {
    throw new TypeError(
      `Server issue must be an object or string, received ${raw === null ? "null" : typeof raw}`,
    );
  }

  const rawObj = raw as Record<string, unknown>;
  const rawCode = rawObj["code"];
  if (typeof rawCode !== "string" || rawCode.trim() === "") {
    throw new TypeError('Server issue missing or non-string "code" property');
  }

  let sanitizedPath: readonly FieldPathSegment[] | undefined = defaultPath;
  const rawPath = rawObj["path"];
  if (rawPath !== undefined && rawPath !== null) {
    if (!Array.isArray(rawPath)) {
      throw new TypeError('Server issue "path" must be an array');
    }
    const segments: FieldPathSegment[] = new Array(rawPath.length);
    for (let i = 0; i < rawPath.length; i++) {
      const seg = rawPath[i];
      if (typeof seg === "string" || typeof seg === "number") {
        segments[i] = seg;
      } else {
        throw new TypeError(
          `Server issue path segment must be string or number, received ${typeof seg}`,
        );
      }
    }
    sanitizedPath = Object.freeze(segments);
  }

  const rawMessage = rawObj["message"];
  return Object.freeze({
    code: rawCode,
    message: typeof rawMessage === "string" ? rawMessage : undefined,
    path: sanitizedPath,
    source: "server" as const,
  });
}

/**
 * Recursively clears all server issues across the entire form tree.
 */
export function clearTreeServerIssues(root: FormNode): void {
  function clearNode(node: FormNode): void {
    if (!node) return;
    const internal = getInternalNode(node);
    internal?.clearServerIssues?.();

    if (node.kind === "group" || node.kind === "form") {
      const fieldKeys = Object.keys(node.fields);
      for (let i = 0; i < fieldKeys.length; i++) {
        const child = (node.fields as Record<string, FormNode>)[fieldKeys[i]!];
        if (child) {
          clearNode(child);
        }
      }
    } else if (node.kind === "array") {
      const items = node.items.get();
      for (let i = 0; i < items.length; i++) {
        clearNode(items[i]!.node);
      }
    }
  }

  clearNode(root);
}

/**
 * Routes structured server issues to matching leaf fields, groups, or array items,
 * translating submitted array indices to live array items via submission snapshots.
 *
 * Unmatched, malformed, or deleted-item server issues are returned as fallback issues.
 */
export function routeServerIssuesToTree(
  root: FormNode,
  issues: readonly ServerIssue[],
  arraySnapshots?: ArraySnapshotMap,
): readonly ServerIssue[] {
  const unmatched: ServerIssue[] = [];

  batch(() => {
    for (let issueIdx = 0; issueIdx < issues.length; issueIdx++) {
      const issue = issues[issueIdx]!;
      if (!issue.path || issue.path.length === 0) {
        unmatched.push(issue);
        continue;
      }

      let curr: FormNode | null = root;
      let segmentIdx = 0;
      const pathSegments = issue.path;
      const traversedSegments: FieldPathSegment[] = [];

      while (segmentIdx < pathSegments.length && curr !== null) {
        const seg = pathSegments[segmentIdx]!;

        if (curr.kind === "group" || curr.kind === "form") {
          if (typeof seg !== "string" || !safeHasProperty(curr.fields, seg)) {
            curr = null;
            break;
          }
          traversedSegments.push(seg);
          curr = (curr.fields as Record<string, FormNode>)[seg] ?? null;
          segmentIdx++;
        } else if (curr.kind === "array") {
          if (typeof seg !== "number") {
            curr = null;
            break;
          }
          const arrayPathKey = createArraySnapshotKey(traversedSegments);
          const snapshotItemIds = arraySnapshots?.get(arrayPathKey);
          let targetItem: { id: string | number; node: FormNode } | undefined;

          if (snapshotItemIds && seg in snapshotItemIds) {
            const targetItemId = snapshotItemIds[seg];
            const currentItems = curr.items.get();
            for (let k = 0; k < currentItems.length; k++) {
              if (currentItems[k]!.id === targetItemId) {
                targetItem = currentItems[k];
                break;
              }
            }
          } else {
            const currentItems = curr.items.get();
            targetItem = currentItems[seg];
          }

          if (!targetItem) {
            curr = null;
            break;
          }
          traversedSegments.push(seg);
          curr = targetItem.node;
          segmentIdx++;
        } else if (curr.kind === "field") {
          // A leaf field cannot have child path segments
          curr = null;
          break;
        } else {
          curr = null;
          break;
        }
      }

      const internal = curr ? getInternalNode(curr) : undefined;
      if (curr && internal && typeof internal.setServerIssues === "function") {
        const remainingPath = pathSegments.slice(segmentIdx);
        const localizedIssue: ServerIssue = Object.freeze({
          ...issue,
          path: remainingPath.length > 0 ? Object.freeze(remainingPath) : undefined,
        });
        const currentServerIssues = curr.serverIssues.get();
        internal.setServerIssues([...currentServerIssues, localizedIssue]);
      } else {
        unmatched.push(issue);
      }
    }
  });

  return Object.freeze(unmatched);
}
