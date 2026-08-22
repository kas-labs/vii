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

export function sanitizePath(rawPath: string, fieldName: string): string {
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
  const target = sanitizePath(entry.target ?? "", `files[${index}].target`);

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

export function validateRegistryManifest(raw: unknown): RegistryItemManifest {
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
    validateFileEntry(file, idx, seenTargets),
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
