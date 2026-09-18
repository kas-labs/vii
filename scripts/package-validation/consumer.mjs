import { execFileSync } from "node:child_process";
import { cp, writeFile } from "node:fs/promises";
import path from "node:path";

export async function prepareConsumer({
  directory,
  fixtureDirectory,
  packageJson,
  repositoryRoot,
  pnpm,
}) {
  await cp(path.join(fixtureDirectory, "src"), path.join(directory, "src"), {
    recursive: true,
  });
  await writeFile(path.join(directory, "package.json"), JSON.stringify(packageJson, null, 2));
  await writeFile(
    path.join(directory, "tsconfig.json"),
    JSON.stringify(
      {
        extends: path.join(repositoryRoot, "tsconfig.base.json"),
        compilerOptions: {
          noEmit: false,
          outDir: "dist",
          rootDir: "src",
          experimentalDecorators: true,
          useDefineForClassFields: false,
        },
        include: ["src/**/*.ts"],
      },
      null,
      2,
    ),
  );

  run(pnpm, ["install", "--ignore-scripts", "--no-frozen-lockfile"], directory);
  run(pnpm, ["exec", "tsc", "-p", path.join(directory, "tsconfig.json")], repositoryRoot);
}

function run(command, args, cwd) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, CI: "1" },
  });
}
