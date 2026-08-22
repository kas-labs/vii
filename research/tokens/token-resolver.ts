import type { DTCGDocument, DTCGTokenType, ResolvedToken, TokenGraph } from "./dtcg-types.js";
import {
  extractAliasPath,
  isAlias,
  TokenValidationError,
  validateAndCollectTokens,
} from "./token-validator.js";

export function normalizeCssVarName(path: string[], prefix = "vii"): string {
  const sanitized = path.map((segment) =>
    segment
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .toLowerCase(),
  );
  return `--${prefix}-${sanitized.join("-")}`;
}

export function resolveTokenGraph(
  doc: DTCGDocument,
  options: { prefix?: string } = {},
): TokenGraph {
  const prefix = options.prefix ?? "vii";
  const discovered = validateAndCollectTokens(doc);

  const rawMap = new Map<string, (typeof discovered)[0]>();
  const cssVarMap = new Map<string, string>();

  for (const item of discovered) {
    const key = item.path.join(".");
    if (rawMap.has(key)) {
      throw new TokenValidationError(`Duplicate token key "${key}"`, item.path, "DUPLICATE_TOKEN");
    }
    rawMap.set(key, item);

    const cssVar = normalizeCssVarName(item.path, prefix);
    if (cssVarMap.has(cssVar)) {
      const existing = cssVarMap.get(cssVar)!;
      throw new TokenValidationError(
        `CSS variable collision: "${cssVar}" generated for both "${existing}" and "${key}"`,
        item.path,
        "CSS_VAR_COLLISION",
      );
    }
    cssVarMap.set(cssVar, key);
  }

  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  for (const [key, item] of rawMap) {
    dependencies.set(key, new Set());
    dependents.set(key, new Set());
    if (isAlias(item.token.$value)) {
      const targetPath = extractAliasPath(item.token.$value);
      const targetKey = targetPath.join(".");
      if (!rawMap.has(targetKey)) {
        throw new TokenValidationError(
          `Unresolved alias "${item.token.$value}" pointing to non-existent token "${targetKey}"`,
          item.path,
          "UNRESOLVED_ALIAS",
        );
      }
      dependencies.get(key)!.add(targetKey);
    }
  }

  for (const [key, deps] of dependencies) {
    for (const dep of deps) {
      dependents.get(dep)!.add(key);
    }
  }

  detectCycles(dependencies);

  const resolvedTokens = new Map<string, ResolvedToken>();
  const byType = new Map<DTCGTokenType, ResolvedToken[]>();

  function resolveValue(key: string, visited: Set<string>): ResolvedToken {
    if (resolvedTokens.has(key)) return resolvedTokens.get(key)!;
    const item = rawMap.get(key)!;
    const isAliased = isAlias(item.token.$value);

    let concreteValue = item.token.$value;
    let originalAlias: string | undefined;

    if (isAliased) {
      originalAlias = item.token.$value as string;
      const targetKey = extractAliasPath(originalAlias).join(".");
      const targetToken = resolveValue(targetKey, new Set([...visited, key]));

      if (targetToken.type !== item.effectiveType) {
        throw new TokenValidationError(
          `Type mismatch in alias chain: token of type "${item.effectiveType}" references token "${targetKey}" of type "${targetToken.type}"`,
          item.path,
          "TYPE_MISMATCH",
        );
      }
      concreteValue = targetToken.value;
    }

    const resolved: ResolvedToken = {
      name: key,
      path: item.path,
      type: item.effectiveType,
      raw: item.token,
      value: concreteValue,
      isAlias: isAliased,
      originalAlias,
      cssVariable: normalizeCssVarName(item.path, prefix),
    };

    resolvedTokens.set(key, resolved);
    if (!byType.has(resolved.type)) {
      byType.set(resolved.type, []);
    }
    byType.get(resolved.type)!.push(resolved);
    return resolved;
  }

  for (const key of rawMap.keys()) {
    resolveValue(key, new Set());
  }

  return {
    tokens: resolvedTokens,
    dependencies,
    dependents,
    byType,
  };
}

function detectCycles(dependencies: Map<string, Set<string>>): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (visiting.has(node)) {
      const cyclePath = [...path, node].join(" -> ");
      throw new TokenValidationError(
        `Circular alias dependency detected: ${cyclePath}`,
        node.split("."),
        "CIRCULAR_DEPENDENCY",
      );
    }
    if (visited.has(node)) return;

    visiting.add(node);
    const deps = dependencies.get(node) ?? new Set();
    for (const dep of deps) {
      dfs(dep, [...path, node]);
    }
    visiting.delete(node);
    visited.add(node);
  }

  for (const key of dependencies.keys()) {
    if (!visited.has(key)) {
      dfs(key, []);
    }
  }
}
