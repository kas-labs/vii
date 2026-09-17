/** Detects real module imports of peer frameworks in bundled adapter code. */
export function bundlesForeignFrameworkImport(code, framework) {
  switch (framework) {
    case "react":
      return /(?:from|import)\s*["']react(?:\/|-|$)/.test(code);
    case "vue":
      return /(?:from|import)\s*["']vue(?:\/|-|$)/.test(code);
    case "angular":
      return /(?:from|import)\s*["']@angular\//.test(code);
    default:
      return false;
  }
}
