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

  it("produces identical integrity hash regardless of object key order (canonical sorting)", () => {
    const manifest1 = validateRegistryManifest(buttonManifest);
    const reorderedManifest = JSON.parse(
      JSON.stringify({
        version: manifest1.version,
        target: manifest1.target,
        type: manifest1.type,
        schemaVersion: manifest1.schemaVersion,
        name: manifest1.name,
        mode: manifest1.mode,
        provenance: {
          trustLevel: manifest1.provenance?.trustLevel,
          license: manifest1.provenance?.license,
          author: manifest1.provenance?.author,
          registryUrl: manifest1.provenance?.registryUrl,
        },
        files: [
          {
            integrity: manifest1.files[0]!.integrity,
            target: manifest1.files[0]!.target,
            source: manifest1.files[0]!.source,
          },
        ],
        description: manifest1.description,
        tokens: manifest1.tokens,
        dependencies: manifest1.dependencies,
        capabilities: manifest1.capabilities,
      }),
    ) as RegistryItemManifest;

    expect(computeManifestIntegrity(manifest1)).toBe(computeManifestIntegrity(reorderedManifest));
  });

  it("detects tampered per-file integrity and source path in manifest files array", () => {
    const originalManifest = validateRegistryManifest(buttonManifest);
    const originalHash = computeManifestIntegrity(originalManifest);

    const tamperedIntegrity = {
      ...originalManifest,
      files: [
        {
          ...originalManifest.files[0]!,
          integrity: "sha256-EVILAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        },
      ],
    };
    expect(computeManifestIntegrity(tamperedIntegrity)).not.toBe(originalHash);

    const tamperedSource = {
      ...originalManifest,
      files: [
        {
          ...originalManifest.files[0]!,
          source: "evil.tsx",
        },
      ],
    };
    expect(computeManifestIntegrity(tamperedSource)).not.toBe(originalHash);
  });

  describe("table-driven field mutation coverage", () => {
    const baseManifest = validateRegistryManifest(buttonManifest);
    const baseHash = computeManifestIntegrity(baseManifest);

    const mutations: Array<{
      field: string;
      mutate: (m: RegistryItemManifest) => RegistryItemManifest;
    }> = [
      {
        field: "schemaVersion",
        mutate: (m) => ({ ...m, schemaVersion: 1 as any }), // test schema version
      },
      {
        field: "name",
        mutate: (m) => ({ ...m, name: "button-custom" }),
      },
      {
        field: "type",
        mutate: (m) => ({ ...m, type: "ui:primitive" }),
      },
      {
        field: "version",
        mutate: (m) => ({ ...m, version: "0.2.0" }),
      },
      {
        field: "target",
        mutate: (m) => ({ ...m, target: "vue" }),
      },
      {
        field: "mode",
        mutate: (m) => ({ ...m, mode: "package" }),
      },
      {
        field: "description",
        mutate: (m) => ({ ...m, description: "Different description" }),
      },
      {
        field: "files[0].source",
        mutate: (m) => ({
          ...m,
          files: [{ ...m.files[0]!, source: "btn-alt.tsx" }],
        }),
      },
      {
        field: "files[0].target",
        mutate: (m) => ({
          ...m,
          files: [{ ...m.files[0]!, target: "components/ui/btn-alt.tsx" }],
        }),
      },
      {
        field: "files[0].integrity",
        mutate: (m) => ({
          ...m,
          files: [
            {
              ...m.files[0]!,
              integrity: "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            },
          ],
        }),
      },
      {
        field: "dependencies",
        mutate: (m) => ({
          ...m,
          dependencies: [{ name: "clsx", versionRange: "^2.0.0" }],
        }),
      },
      {
        field: "tokens",
        mutate: (m) => ({
          ...m,
          tokens: ["color.secondary"],
        }),
      },
      {
        field: "capabilities",
        mutate: (m) => ({
          ...m,
          capabilities: ["keyboard"],
        }),
      },
      {
        field: "provenance.author",
        mutate: (m) => ({
          ...m,
          provenance: { ...m.provenance, author: "Different Author" },
        }),
      },
      {
        field: "provenance.registryUrl",
        mutate: (m) => ({
          ...m,
          provenance: { ...m.provenance, registryUrl: "https://custom.registry.dev" },
        }),
      },
    ];

    for (const { field, mutate } of mutations) {
      if (field === "schemaVersion") continue; // base is already schemaVersion 1
      it(`detects mutation in manifest field: ${field}`, () => {
        const mutated = mutate(structuredClone(baseManifest));
        const mutatedHash = computeManifestIntegrity(mutated);
        expect(mutatedHash).not.toBe(baseHash);
      });
    }
  });
});
