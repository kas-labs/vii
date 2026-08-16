import path from "node:path";
import type {
  DetectedProject,
  DetectedWorkspaceProject,
  DetectionConflict,
  DetectionConfidence,
  DetectionEvidence,
  PackageManager,
  ProjectFramework,
  ProjectLanguage,
  ProjectRuntime,
  RenderingMode,
  WorkspaceType,
} from "./types.js";
import {
  isRecord,
  readManifest,
  readRootFiles,
  readSourceFiles,
  type DetectionContext,
  type PackageManifest,
} from "./project-files.js";

interface PackageManagerSignal {
  readonly manager: Exclude<PackageManager, "unknown">;
  readonly source: string;
}

const packageManagerLockfiles = [
  ["npm", "package-lock.json"],
  ["npm", "npm-shrinkwrap.json"],
  ["pnpm", "pnpm-lock.yaml"],
  ["yarn", "yarn.lock"],
  ["bun", "bun.lock"],
  ["bun", "bun.lockb"],
] as const satisfies readonly [PackageManager, string][];

export async function detectProject(inputRoot: string): Promise<DetectedProject> {
  const root = path.resolve(inputRoot);
  const files = await readRootFiles(root);
  const evidence: DetectionEvidence[] = [];
  const conflicts: DetectionConflict[] = [];
  const manifest = await readManifest(root, evidence, conflicts);
  const context: DetectionContext = { root, files, manifest, evidence, conflicts };

  const packageManager = detectPackageManager(context);
  const framework = detectFramework(context);
  const workspace = detectWorkspace(context);
  const language = await detectLanguage(context);
  const runtime = detectRuntime(context, framework);
  const rendering = detectRendering(context, framework);
  const installedViiPackages = detectInstalledViiPackages(manifest);
  const project = createWorkspaceProject(context, framework, runtime, language, rendering);

  return {
    root,
    workspace,
    framework,
    runtime,
    packageManager,
    language,
    rendering,
    installedViiPackages,
    projects: [project],
    evidence,
    confidence: calculateConfidence(context, framework, packageManager, language),
    conflicts,
  };
}

function detectPackageManager(context: DetectionContext): PackageManager {
  const signals: PackageManagerSignal[] = packageManagerLockfiles
    .filter(([, file]) => context.files.has(file))
    .map(([manager, file]) => ({ manager, source: file }));
  const explicit = readPackageManagerField(context.manifest.packageManager);
  if (explicit !== undefined) {
    signals.push({ manager: explicit, source: "package.json:packageManager" });
  }

  const managers = [...new Set(signals.map((signal) => signal.manager))];
  for (const signal of signals) {
    context.evidence.push({
      field: "packageManager",
      source: signal.source,
      detail: `detected ${signal.manager}`,
    });
  }

  if (managers.length > 1) {
    context.conflicts.push({
      field: "packageManager",
      message: "multiple package managers were detected; select one explicitly",
      sources: signals.map((signal) => signal.source),
    });
    return "unknown";
  }

  return managers[0] ?? "unknown";
}

function detectFramework(context: DetectionContext): ProjectFramework {
  const dependencies = collectDependencyNames(context.manifest);
  const signals: Array<{
    framework: Exclude<ProjectFramework, "mixed" | "unknown">;
    source: string;
  }> = [];

  if (dependencies.has("react") || dependencies.has("react-dom") || dependencies.has("next")) {
    signals.push({ framework: "react", source: "package.json dependencies" });
  }
  if (dependencies.has("@angular/core") || context.files.has("angular.json")) {
    signals.push({
      framework: "angular",
      source: dependencies.has("@angular/core") ? "package.json dependencies" : "angular.json",
    });
  }
  if (dependencies.has("vue") || hasFilePrefix(context.files, "nuxt.config.")) {
    signals.push({
      framework: "vue",
      source: dependencies.has("vue") ? "package.json dependencies" : "nuxt.config",
    });
  }

  const frameworks = [...new Set(signals.map((signal) => signal.framework))];
  for (const signal of signals) {
    context.evidence.push({
      field: "framework",
      source: signal.source,
      detail: `detected ${signal.framework}`,
    });
  }

  if (frameworks.length > 1) {
    context.conflicts.push({
      field: "framework",
      message: "multiple frameworks were detected; select a target project",
      sources: signals.map((signal) => signal.source),
    });
    return "mixed";
  }
  if (frameworks.length === 1) {
    return frameworks[0] ?? "unknown";
  }
  if (context.files.has("tsconfig.json")) {
    context.evidence.push({
      field: "framework",
      source: "tsconfig.json",
      detail: "no framework marker; classified as vanilla",
    });
    return "vanilla";
  }
  return "unknown";
}

function detectWorkspace(context: DetectionContext): WorkspaceType {
  if (context.files.has("nx.json")) {
    context.evidence.push({
      field: "workspace",
      source: "nx.json",
      detail: "detected Nx workspace",
    });
    return "nx";
  }
  if (context.files.has("pnpm-workspace.yaml") || hasWorkspaces(context.manifest.workspaces)) {
    context.evidence.push({
      field: "workspace",
      source: context.files.has("pnpm-workspace.yaml")
        ? "pnpm-workspace.yaml"
        : "package.json:workspaces",
      detail: "detected monorepo workspace",
    });
    return "other-monorepo";
  }
  return "single";
}

async function detectLanguage(context: DetectionContext): Promise<ProjectLanguage> {
  const sourceFiles = await readSourceFiles(context.root);
  const typescript =
    context.files.has("tsconfig.json") || sourceFiles.some((file) => /\.(ts|tsx)$/.test(file));
  const javascript = sourceFiles.some((file) => /\.(js|jsx|mjs|cjs)$/.test(file));
  if (typescript && javascript) {
    context.evidence.push({
      field: "language",
      source: "source files",
      detail: "detected TypeScript and JavaScript",
    });
    return "mixed";
  }
  if (typescript) {
    context.evidence.push({
      field: "language",
      source: context.files.has("tsconfig.json") ? "tsconfig.json" : "source files",
      detail: "detected TypeScript",
    });
    return "typescript";
  }
  if (javascript) {
    context.evidence.push({
      field: "language",
      source: "source files",
      detail: "detected JavaScript",
    });
    return "javascript";
  }
  return "unknown";
}

function detectRuntime(context: DetectionContext, framework: ProjectFramework): ProjectRuntime {
  const signals: Array<{ runtime: ProjectRuntime; source: string }> = [];
  if (context.files.has("deno.json") || context.files.has("deno.jsonc")) {
    signals.push({
      runtime: "deno",
      source: context.files.has("deno.json") ? "deno.json" : "deno.jsonc",
    });
  }
  if (context.files.has("bunfig.toml")) {
    signals.push({ runtime: "bun", source: "bunfig.toml" });
  }
  if (hasNodeEngine(context.manifest.engines)) {
    signals.push({ runtime: "node", source: "package.json:engines.node" });
  }
  if (signals.length === 0 && framework !== "unknown" && framework !== "mixed") {
    signals.push({ runtime: "browser", source: "framework marker" });
  }

  const runtimes = [...new Set(signals.map((signal) => signal.runtime))];
  for (const signal of signals) {
    context.evidence.push({
      field: "runtime",
      source: signal.source,
      detail: `detected ${signal.runtime}`,
    });
  }
  if (runtimes.length > 1) {
    context.conflicts.push({
      field: "runtime",
      message: "multiple runtime markers were detected",
      sources: signals.map((signal) => signal.source),
    });
    return "unknown";
  }
  return runtimes[0] ?? "unknown";
}

function detectRendering(context: DetectionContext, framework: ProjectFramework): RenderingMode {
  const ssr =
    hasFilePrefix(context.files, "next.config.") ||
    hasFilePrefix(context.files, "nuxt.config.") ||
    hasDependency(context.manifest, "@angular/ssr") ||
    hasDependency(context.manifest, "react-dom/server");
  const client = framework !== "unknown" && framework !== "mixed";
  if (ssr && client) {
    context.evidence.push({
      field: "rendering",
      source: "framework and SSR markers",
      detail: "detected client and SSR rendering",
    });
    return "mixed";
  }
  if (ssr) {
    context.evidence.push({
      field: "rendering",
      source: "SSR markers",
      detail: "detected SSR rendering",
    });
    return "ssr";
  }
  if (client) {
    context.evidence.push({
      field: "rendering",
      source: "framework marker",
      detail: "detected client rendering",
    });
    return "client";
  }
  return "unknown";
}

function createWorkspaceProject(
  context: DetectionContext,
  framework: ProjectFramework,
  runtime: ProjectRuntime,
  language: ProjectLanguage,
  rendering: RenderingMode,
): DetectedWorkspaceProject {
  const name =
    typeof context.manifest.name === "string" ? context.manifest.name : path.basename(context.root);
  return { root: context.root, name, framework, runtime, language, rendering };
}

function calculateConfidence(
  context: DetectionContext,
  framework: ProjectFramework,
  packageManager: PackageManager,
  language: ProjectLanguage,
): DetectionConfidence {
  if (context.conflicts.length > 0) {
    return "low";
  }
  if (framework !== "unknown" && packageManager !== "unknown" && language !== "unknown") {
    return "high";
  }
  return context.evidence.length > 0 ? "medium" : "low";
}

function collectDependencyNames(manifest: PackageManifest): ReadonlySet<string> {
  const dependencies = [manifest.dependencies, manifest.devDependencies, manifest.peerDependencies];
  return new Set(dependencies.flatMap((value) => (isRecord(value) ? Object.keys(value) : [])));
}

function detectInstalledViiPackages(manifest: PackageManifest): readonly string[] {
  return [...collectDependencyNames(manifest)]
    .filter((name) => name.startsWith("@vii-labs/"))
    .sort();
}

function hasDependency(manifest: PackageManifest, dependency: string): boolean {
  return collectDependencyNames(manifest).has(dependency);
}

function hasFilePrefix(files: ReadonlySet<string>, prefix: string): boolean {
  return [...files].some((file) => file.startsWith(prefix));
}

function hasWorkspaces(value: unknown): boolean {
  return Array.isArray(value) || isRecord(value);
}

function hasNodeEngine(value: unknown): boolean {
  return isRecord(value) && typeof value["node"] === "string";
}

function readPackageManagerField(value: unknown): Exclude<PackageManager, "unknown"> | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const manager = value.split("@")[0];
  return manager === "npm" || manager === "pnpm" || manager === "yarn" || manager === "bun"
    ? manager
    : undefined;
}
