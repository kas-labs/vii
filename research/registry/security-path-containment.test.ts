import { describe, expect, it } from "vitest";
import buttonManifest from "./fixtures/button.manifest.json" with { type: "json" };
import {
  ManifestValidationError,
  sanitizePath,
  validateRegistryManifest,
} from "./manifest-validator.js";

describe("Registry Path Containment Security", () => {
  it("sanitizes and allows safe relative paths inside project root", () => {
    expect(sanitizePath("components/ui/button.tsx", "target")).toBe("components/ui/button.tsx");
    expect(sanitizePath("./src/components/button.tsx", "target")).toBe("src/components/button.tsx");
    expect(sanitizePath("styles\\tokens.css", "target")).toBe("styles/tokens.css");
  });

  it("rejects parent directory traversal (..) attempts", () => {
    expect(() => sanitizePath("../etc/passwd", "target")).toThrow(ManifestValidationError);
    expect(() => sanitizePath("../etc/passwd", "target")).toThrow(/Directory traversal/);

    expect(() => sanitizePath("components/../../secret.env", "target")).toThrow(
      /Directory traversal/,
    );
  });

  it("rejects encoded directory traversal variants (%2e%2e)", () => {
    expect(() => sanitizePath("%2e%2e/etc/passwd", "target")).toThrow(ManifestValidationError);
    expect(() => sanitizePath("%2E%2E/system32/cmd.exe", "target")).toThrow(
      ManifestValidationError,
    );
  });

  it("rejects absolute paths on POSIX and Windows", () => {
    expect(() => sanitizePath("/var/www/html/index.js", "target")).toThrow(/Absolute paths/);
    expect(() => sanitizePath("\\Windows\\System32", "target")).toThrow(/Absolute paths/);
    expect(() => sanitizePath("C:\\Users\\admin", "target")).toThrow(/Absolute paths/);
  });

  it("rejects null byte injection attempts in paths", () => {
    expect(() => sanitizePath("components/button.tsx\0.jpg", "target")).toThrow(/null byte/);
  });

  it("rejects manifests containing duplicate target destinations", () => {
    const duplicateDestinations = {
      ...buttonManifest,
      files: [
        {
          source: "button-a.tsx",
          target: "components/ui/button.tsx",
          integrity: "sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=",
        },
        {
          source: "button-b.tsx",
          target: "components/ui/button.tsx",
          integrity: "sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=",
        },
      ],
    };

    expect(() => validateRegistryManifest(duplicateDestinations)).toThrow(ManifestValidationError);
    expect(() => validateRegistryManifest(duplicateDestinations)).toThrow(
      /Duplicate target destination/,
    );
  });
});
