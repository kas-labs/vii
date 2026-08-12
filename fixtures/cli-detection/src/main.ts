/// <reference types="node" />

import { fileURLToPath } from "node:url";
import { detectProject } from "@vii/cli-core";

const result = await detectProject(fileURLToPath(new URL("..", import.meta.url)));

export const detectedPackageManager = result.packageManager;
export const detectedViiPackages = result.installedViiPackages;
