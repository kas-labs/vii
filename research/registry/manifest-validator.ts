import type {
  DistributionMode,
  RegistryFileEntry,
  RegistryItemManifest,
  RegistryItemType,
  TargetFramework,
} from "./types.js";

export class ManifestValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string = "INVALID_MANIFEST",
    public readonly field?: string,
  ) {
    super(`[${code}]${field ? ` at "${field}"` : ""}: ${message}`);
    this.name = "ManifestValidationError";
  }
}

const ALLOWED_TYPES: ReadonlySet<RegistryItemType> = new Set([
  "ui:component",
  "ui:primitive",
  "ui:block",
  "ui:theme",
  "ui:tokens",
  "example:application",
  "template:project",
]);

const ALLOWED_TARGETS: ReadonlySet<TargetFramework> = new Set([
  "react",
  "angular",
  "vue",
  "vanilla",
  "elements",
]);

const ALLOWED_MODES: ReadonlySet<DistributionMode> = new Set(["source", "package"]);
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const DISALLOWED_EXTENSIONS = new Set([".sh", ".bash", ".exe", ".bat", ".cmd", ".ps1", ".vbs"]);

export interface SanitizePathOptions {
  allowedRoots?: readonly string[] | string[] | undefined;
}

export interface ManifestValidationOptions {
  allowedRoots?: readonly string[] | string[] | undefined;
}

export function sanitizePath(
  rawPath: string,
  fieldName: string,
  options?: SanitizePathOptions,
): string {
  if (typeof rawPath !== "string" || rawPath.trim().length === 0) {
    throw new ManifestValidationError("Path must be a non-empty string", "EMPTY_PATH", fieldName);
  }
  if (rawPath.includes("\0")) {
    throw new ManifestValidationError(
      "Path contains null byte injection",
      "NULL_BYTE_INJECTION",
      fieldName,
    );
  }
  if (/^([a-zA-Z]:|[\\/])/.test(rawPath)) {
    throw new ManifestValidationError(
      "Absolute paths are strictly forbidden",
      "ABSOLUTE_PATH",
      fieldName,
    );
  }

  const normalized = rawPath.replace(/\\/g, "/");
  const segments = normalized.split("/");

  for (const seg of segments) {
    if (seg === ".." || seg === "%2e%2e" || seg === "%2E%2E") {
      throw new ManifestValidationError(
        "Directory traversal (..) is strictly forbidden",
        "PATH_TRAVERSAL",
        fieldName,
      );
    }
  }

  const cleaned = segments.filter((s) => s.length > 0 && s !== ".").join("/");
  if (cleaned.length === 0) {
    throw new ManifestValidationError(
      "Path resolves to empty or root directory",
      "EMPTY_PATH",
      fieldName,
    );
  }

  const cleanSegments = cleaned.split("/");

  if (cleanSegments[0]!.startsWith(".")) {
    throw new ManifestValidationError(
      `Root dotfile or hidden directory paths ("${cleanSegments[0]}") are strictly forbidden`,
      "FORBIDDEN_ROOT_DOTPATH",
      fieldName,
    );
  }

  if (cleanSegments.some((seg) => seg === "node_modules")) {
    throw new ManifestValidationError(
      'Paths containing "node_modules" are strictly forbidden',
      "FORBIDDEN_NODE_MODULES",
      fieldName,
    );
  }

  if (cleanSegments.length === 1) {
    const fileName = cleanSegments[0]!;
    if (
      fileName === "package.json" ||
      fileName === "package-lock.json" ||
      fileName === "pnpm-lock.yaml" ||
      (fileName.startsWith("tsconfig") && fileName.endsWith(".json")) ||
      fileName.includes(".config.")
    ) {
      throw new ManifestValidationError(
        `Modifying root toolchain configuration file "${fileName}" is strictly forbidden`,
        "FORBIDDEN_CONFIG_FILE",
        fieldName,
      );
    }
  }

  if (options?.allowedRoots && options.allowedRoots.length > 0) {
    const isAllowed = options.allowedRoots.some((root) => {
      const normRoot = root.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
      return cleaned === normRoot || cleaned.startsWith(`${normRoot}/`);
    });
    if (!isAllowed) {
      throw new ManifestValidationError(
        `Destination path "${cleaned}" is outside of allowed roots [${options.allowedRoots.join(", ")}]`,
        "DISALLOWED_ROOT",
        fieldName,
      );
    }
  }

  for (const ext of DISALLOWED_EXTENSIONS) {
    if (cleaned.toLowerCase().endsWith(ext)) {
      throw new ManifestValidationError(
        `Executable file extensions (${ext}) are forbidden`,
        "EXECUTABLE_REJECTED",
        fieldName,
      );
    }
  }

  return cleaned;
}

function checkPrototypePollution(node: unknown, depth = 0): void {
  if (depth > 15) {
    throw new ManifestValidationError(
      "Manifest nesting exceeds safe depth limit",
      "DEPTH_LIMIT_EXCEEDED",
    );
  }
  if (typeof node !== "object" || node === null) return;

  for (const key of Object.keys(node)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new ManifestValidationError(
        `Prototype pollution key "${key}" detected`,
        "SECURITY_VIOLATION",
        key,
      );
    }
    checkPrototypePollution((node as Record<string, unknown>)[key], depth + 1);
  }
}

function validateFileEntry(
  file: unknown,
  index: number,
  seenTargets: Set<string>,
  options?: ManifestValidationOptions,
): RegistryFileEntry {
  if (typeof file !== "object" || file === null) {
    throw new ManifestValidationError(
      `File entry [${index}] must be an object`,
      "INVALID_FILE_ENTRY",
      `files[${index}]`,
    );
  }
  const entry = file as Partial<RegistryFileEntry>;

  if (entry.executable === true) {
    throw new ManifestValidationError(
      "Executable files and lifecycle hooks are strictly forbidden",
      "EXECUTABLE_REJECTED",
      `files[${index}].executable`,
    );
  }

  const source = sanitizePath(entry.source ?? "", `files[${index}].source`);
  const target = sanitizePath(entry.target ?? "", `files[${index}].target`, options);

  if (seenTargets.has(target)) {
    throw new ManifestValidationError(
      `Duplicate target destination "${target}" in file plan`,
      "DUPLICATE_DESTINATION",
      `files[${index}].target`,
    );
  }
  seenTargets.add(target);

  if (!entry.integrity || !/^sha256-[A-Za-z0-9+/=_-]+$/.test(entry.integrity)) {
    throw new ManifestValidationError(
      `Invalid SHA-256 integrity format for "${source}"`,
      "INVALID_INTEGRITY",
      `files[${index}].integrity`,
    );
  }

  return {
    source,
    target,
    integrity: entry.integrity,
  };
}

export function validateRegistryManifest(
  raw: unknown,
  options?: ManifestValidationOptions,
): RegistryItemManifest {
  checkPrototypePollution(raw);

  if (typeof raw !== "object" || raw === null) {
    throw new ManifestValidationError("Manifest must be a JSON object", "INVALID_MANIFEST");
  }
  const manifest = raw as Partial<RegistryItemManifest>;

  if (manifest.schemaVersion !== 1) {
    throw new ManifestValidationError(
      `Unsupported schemaVersion: ${manifest.schemaVersion}`,
      "UNSUPPORTED_SCHEMA_VERSION",
      "schemaVersion",
    );
  }
  if (!manifest.name || typeof manifest.name !== "string" || !/^[a-z0-9-]+$/.test(manifest.name)) {
    throw new ManifestValidationError(
      "Manifest name must be non-empty kebab-case",
      "INVALID_NAME",
      "name",
    );
  }
  if (!manifest.type || !ALLOWED_TYPES.has(manifest.type)) {
    throw new ManifestValidationError(
      `Invalid item type: "${manifest.type}"`,
      "INVALID_TYPE",
      "type",
    );
  }
  if (!manifest.target || !ALLOWED_TARGETS.has(manifest.target)) {
    throw new ManifestValidationError(
      `Invalid target framework: "${manifest.target}"`,
      "INVALID_TARGET",
      "target",
    );
  }
  if (!manifest.mode || !ALLOWED_MODES.has(manifest.mode)) {
    throw new ManifestValidationError(
      `Invalid distribution mode: "${manifest.mode}"`,
      "INVALID_MODE",
      "mode",
    );
  }
  if (!manifest.version || typeof manifest.version !== "string") {
    throw new ManifestValidationError(
      "Manifest version must be a valid string",
      "INVALID_VERSION",
      "version",
    );
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new ManifestValidationError(
      "Manifest must contain a non-empty files array",
      "EMPTY_FILES",
      "files",
    );
  }

  const seenTargets = new Set<string>();
  const validatedFiles = manifest.files.map((file, idx) =>
    validateFileEntry(file, idx, seenTargets, options),
  );

  return {
    schemaVersion: 1,
    name: manifest.name,
    type: manifest.type,
    version: manifest.version,
    target: manifest.target,
    mode: manifest.mode,
    description: manifest.description,
    files: validatedFiles,
    dependencies: manifest.dependencies ?? [],
    tokens: manifest.tokens ?? [],
    capabilities: manifest.capabilities ?? [],
    provenance: manifest.provenance,
  };
}
