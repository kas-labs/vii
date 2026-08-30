import type { FormNode } from "../core/tree-types.js";
import type { ArraySnapshotMap } from "./types.js";

/**
 * Creates an injective, collision-free key for an array path, preserving string vs number segment types.
 */
export function createArraySnapshotKey(path: readonly (string | number)[]): string {
  return JSON.stringify(path.map((seg) => (typeof seg === "number" ? ["n", seg] : ["s", seg])));
}

/**
 * Recursively collects immutable submission-time array identity snapshots across the form tree.
 *
 * Captures mapping from submitted positional indices to stable item IDs for every FieldArray node,
 * enabling reorder-resilient server response routing.
 */
export function collectArraySnapshots(root: FormNode): ArraySnapshotMap {
  const map: ArraySnapshotMap = new Map();

  function traverse(node: FormNode, currentPath: readonly (string | number)[]): void {
    if (!node) {
      return;
    }

    if (node.kind === "array") {
      const pathKey = createArraySnapshotKey(currentPath);
      const items = node.items.get();
      const itemIds: (string | number)[] = new Array(items.length);
      for (let i = 0; i < items.length; i++) {
        itemIds[i] = items[i]!.id;
      }
      map.set(pathKey, Object.freeze(itemIds));

      for (let i = 0; i < items.length; i++) {
        traverse(items[i]!.node, [...currentPath, i]);
      }
    } else if (node.kind === "group" || node.kind === "form") {
      const fieldKeys = Object.keys(node.fields);
      for (let i = 0; i < fieldKeys.length; i++) {
        const key = fieldKeys[i]!;
        const child = (node.fields as Record<string, FormNode>)[key];
        if (child) {
          traverse(child, [...currentPath, key]);
        }
      }
    }
  }

  traverse(root, []);
  return map;
}
