import { createHash } from "node:crypto";
import type { RegistryFileEntry, RegistryItemManifest } from "./types.js";

export function computeSha256(content: string | Uint8Array): string {
  const hash = createHash("sha256").update(content).digest("base64");
  return `sha256-${hash}`;
}

export function verifyContentIntegrity(
  content: string | Uint8Array,
  expectedIntegrity: string,
): { valid: boolean; actual: string; expected: string } {
  const actual = computeSha256(content);
  return {
    valid: actual === expectedIntegrity,
    actual,
    expected: expectedIntegrity,
  };
}

export function canonicalJsonStringify(value: unknown): string {
  if (value === undefined) {
    return "null";
  }
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((item) => canonicalJsonStringify(item));
    return `[${items.join(",")}]`;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`);
    return `{${pairs.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function computeManifestIntegrity(manifest: RegistryItemManifest): string {
  const canonicalString = canonicalJsonStringify(manifest);
  return computeSha256(canonicalString);
}
