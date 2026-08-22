import { describe, expect, it } from "vitest";
import buttonManifest from "./fixtures/button.manifest.json" with { type: "json" };
import { computeManifestIntegrity, computeSha256, verifyContentIntegrity } from "./integrity.js";
import { validateRegistryManifest } from "./manifest-validator.js";
import type { RegistryItemManifest } from "./types.js";

describe("Registry Integrity Verification", () => {
  const sampleCode = "export function Button() { return <button>Click</button>; }";

  it("computes standard SHA-256 base64 integrity hash", () => {
    const hash = computeSha256(sampleCode);
    expect(hash).toMatch(/^sha256-[A-Za-z0-9+/=]+$/);
  });

  it("verifies valid file content integrity against expected hash", () => {
    const hash = computeSha256(sampleCode);
    const verification = verifyContentIntegrity(sampleCode, hash);

    expect(verification.valid).toBe(true);
    expect(verification.actual).toBe(hash);
  });

  it("detects tampered content and fails integrity verification", () => {
    const originalHash = computeSha256(sampleCode);
    const tamperedCode = "export function Button() { return <button>Malicious</button>; }";

    const verification = verifyContentIntegrity(tamperedCode, originalHash);
    expect(verification.valid).toBe(false);
    expect(verification.actual).not.toBe(originalHash);
  });

  it("computes deterministic manifest integrity hash across identical structures", () => {
    const manifest = validateRegistryManifest(buttonManifest);
    const hash1 = computeManifestIntegrity(manifest);
    const hash2 = computeManifestIntegrity(manifest);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^sha256-/);
  });
});
