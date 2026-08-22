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

export function computeManifestIntegrity(manifest: RegistryItemManifest): string {
  const normalized = {
    schemaVersion: manifest.schemaVersion,
    name: manifest.name,
    type: manifest.type,
    version: manifest.version,
    target: manifest.target,
    mode: manifest.mode,
    files: manifest.files.map((f: RegistryFileEntry) => ({
      source: f.source,
      target: f.target,
      integrity: f.integrity,
    })),
    dependencies: manifest.dependencies,
    tokens: manifest.tokens,
    capabilities: manifest.capabilities,
  };

  const canonicalString = JSON.stringify(normalized, Object.keys(normalized).sort());
  return computeSha256(canonicalString);
}
