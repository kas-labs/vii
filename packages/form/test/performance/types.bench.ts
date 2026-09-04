import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export interface TypeDiagnosticResult {
  files: number;
  linesOfTs: number;
  symbols: number;
  types: number;
  instantiations: number;
  memoryUsedMb: number;
  checkTimeSeconds: number;
  totalTimeSeconds: number;
  hasRecursionError: boolean;
}

export function runTypeDiagnostics(): TypeDiagnosticResult {
  const tsconfigPath = resolve(__dirname, "typescript/tsconfig.json");

  let output = "";
  try {
    output = execFileSync(
      "pnpm",
      ["exec", "tsc", "-p", tsconfigPath, "--extendedDiagnostics", "--noEmit"],
      { encoding: "utf8" },
    );
  } catch (err: unknown) {
    const errorWithOutput = err as { stdout?: string; stderr?: string };
    output = (errorWithOutput.stdout ?? "") + "\n" + (errorWithOutput.stderr ?? "");
  }

  const parseNumber = (regex: RegExp): number => {
    const match = output.match(regex);
    return match ? parseFloat(match[1]!) : 0;
  };

  const files = parseNumber(/Files:\s+(\d+)/);
  const linesOfTs = parseNumber(/Lines of TypeScript:\s+(\d+)/);
  const symbols = parseNumber(/Symbols:\s+(\d+)/);
  const types = parseNumber(/Types:\s+(\d+)/);
  const instantiations = parseNumber(/Instantiations:\s+(\d+)/);
  const memoryUsedMb = parseNumber(/Memory used:\s+(\d+)K/) / 1024;
  const checkTimeSeconds = parseNumber(/Check time:\s+([\d.]+)s/);
  const totalTimeSeconds = parseNumber(/Total time:\s+([\d.]+)s/);
  const hasRecursionError = output.includes("TS2589") || output.includes("excessively deep");

  return {
    files,
    linesOfTs,
    symbols,
    types,
    instantiations,
    memoryUsedMb,
    checkTimeSeconds,
    totalTimeSeconds,
    hasRecursionError,
  };
}
