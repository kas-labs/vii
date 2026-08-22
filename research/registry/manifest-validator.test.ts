import { describe, expect, it } from "vitest";
import buttonManifest from "./fixtures/button.manifest.json" with { type: "json" };
import dialogManifest from "./fixtures/dialog.manifest.json" with { type: "json" };
import { ManifestValidationError, validateRegistryManifest } from "./manifest-validator.js";

describe("Registry Manifest Validator", () => {
  it("validates standard valid component manifests", () => {
    const validatedButton = validateRegistryManifest(buttonManifest);
    expect(validatedButton.name).toBe("button");
    expect(validatedButton.type).toBe("ui:component");
    expect(validatedButton.files).toHaveLength(1);

    const validatedDialog = validateRegistryManifest(dialogManifest);
    expect(validatedDialog.name).toBe("dialog");
    expect(validatedDialog.capabilities).toContain("focus-trap");
  });

  it("rejects unsupported schemaVersion", () => {
    const invalidVersion = { ...buttonManifest, schemaVersion: 2 };
    expect(() => validateRegistryManifest(invalidVersion)).toThrow(ManifestValidationError);
    expect(() => validateRegistryManifest(invalidVersion)).toThrow(/Unsupported schemaVersion/);
  });

  it("rejects prototype pollution attempts in manifest payload", () => {
    const malicious = JSON.parse(
      '{"schemaVersion": 1, "name": "exploit", "__proto__": {"polluted": true}}',
    );
    expect(() => validateRegistryManifest(malicious)).toThrow(ManifestValidationError);
    expect(() => validateRegistryManifest(malicious)).toThrow(/Prototype pollution key/);
  });

  it("rejects executable scripts or lifecycle hooks in file entries", () => {
    const maliciousHook = {
      ...buttonManifest,
      files: [
        {
          source: "postinstall.sh",
          target: "scripts/postinstall.sh",
          integrity: "sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=",
        },
      ],
    };
    expect(() => validateRegistryManifest(maliciousHook)).toThrow(ManifestValidationError);
    expect(() => validateRegistryManifest(maliciousHook)).toThrow(/Executable file extensions/);

    const flaggedExecutable = {
      ...buttonManifest,
      files: [
        {
          source: "button.tsx",
          target: "components/ui/button.tsx",
          integrity: "sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=",
          executable: true,
        },
      ],
    };
    expect(() => validateRegistryManifest(flaggedExecutable)).toThrow(ManifestValidationError);
    expect(() => validateRegistryManifest(flaggedExecutable)).toThrow(
      /Executable files and lifecycle hooks/,
    );
  });

  it("rejects invalid item types and target frameworks", () => {
    const badType = { ...buttonManifest, type: "unsupported:type" as any };
    expect(() => validateRegistryManifest(badType)).toThrow(/Invalid item type/);

    const badTarget = { ...buttonManifest, target: "unsupported-fw" as any };
    expect(() => validateRegistryManifest(badTarget)).toThrow(/Invalid target framework/);
  });
});
