/// <reference types="node" />

import { fileURLToPath } from "node:url";
import { addState, detectProject, doctorProject, initProject } from "@vii/cli-core";

const root = fileURLToPath(new URL("..", import.meta.url));
const detection = await detectProject(root);
const result = await initProject(root, { dryRun: true });
const stateResult = await addState(root, { dryRun: true });
const doctorResult = await doctorProject(root);

export const detectedPackageManager = detection.packageManager;
export const detectedViiPackages = detection.installedViiPackages;
export const initStatus = result.report.status;
export const initFiles = result.report.files;
export const addStateStatus = stateResult.report.status;
export const addStateFiles = stateResult.report.files;
export const doctorStatus = doctorResult.report.status;
export const doctorFindingCodes = doctorResult.report.findings.map((finding) => finding.code);
