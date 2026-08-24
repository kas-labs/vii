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

  describe("destination denylist enforcement", () => {
    it("rejects root dotfiles and dot-directories with FORBIDDEN_ROOT_DOTPATH", () => {
      const dotPaths = [
        ".git/hooks/pre-commit",
        ".husky/pre-commit",
        ".github/workflows/ci.yml",
        ".vscode/settings.json",
        ".env",
        ".env.local",
        ".npmrc",
      ];

      for (const dotPath of dotPaths) {
        expect(() => sanitizePath(dotPath, "target")).toThrow(
          expect.objectContaining({
            code: "FORBIDDEN_ROOT_DOTPATH",
          }),
        );
      }
    });

    it("rejects paths containing node_modules with FORBIDDEN_NODE_MODULES", () => {
      const nodeModulesPaths = [
        "node_modules/malicious/index.js",
        "src/node_modules/malicious.js",
        "nested/deep/node_modules/foo.ts",
      ];

      for (const nmPath of nodeModulesPaths) {
        expect(() => sanitizePath(nmPath, "target")).toThrow(
          expect.objectContaining({
            code: "FORBIDDEN_NODE_MODULES",
          }),
        );
      }
    });

    it("rejects root toolchain manifests and configuration files with FORBIDDEN_CONFIG_FILE", () => {
      const configPaths = [
        "package.json",
        "package-lock.json",
        "pnpm-lock.yaml",
        "tsconfig.json",
        "tsconfig.base.json",
        "tsconfig.app.json",
        "vite.config.ts",
        "next.config.js",
        "postcss.config.js",
        "tailwind.config.mjs",
      ];

      for (const configPath of configPaths) {
        expect(() => sanitizePath(configPath, "target")).toThrow(
          expect.objectContaining({
            code: "FORBIDDEN_CONFIG_FILE",
          }),
        );
      }
    });

    it("still accepts normal component destination paths", () => {
      expect(sanitizePath("components/ui/button.tsx", "target")).toBe("components/ui/button.tsx");
      expect(sanitizePath("src/components/dialog.tsx", "target")).toBe("src/components/dialog.tsx");
      expect(sanitizePath("styles/globals.css", "target")).toBe("styles/globals.css");
      expect(sanitizePath("lib/utils.ts", "target")).toBe("lib/utils.ts");
    });
  });

  describe("allowedRoots enforcement", () => {
    it("accepts paths inside allowedRoots and rejects paths outside with DISALLOWED_ROOT", () => {
      const options = { allowedRoots: ["components", "src/components", "styles"] };

      expect(sanitizePath("components/ui/button.tsx", "target", options)).toBe(
        "components/ui/button.tsx",
      );
      expect(sanitizePath("src/components/button.tsx", "target", options)).toBe(
        "src/components/button.tsx",
      );
      expect(sanitizePath("styles/tokens.css", "target", options)).toBe("styles/tokens.css");

      expect(() => sanitizePath("utils/helper.ts", "target", options)).toThrow(
        expect.objectContaining({
          code: "DISALLOWED_ROOT",
        }),
      );
      expect(() => sanitizePath("src/utils/helper.ts", "target", options)).toThrow(
        expect.objectContaining({
          code: "DISALLOWED_ROOT",
        }),
      );
    });
  });
});
