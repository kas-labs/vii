/// <reference types="node" />

import { fileURLToPath } from "node:url";
import {
  addState,
  createMachineOutput,
  detectProject,
  doctorProject,
  initProject,
  stringifyMachineOutput,
} from "@vii/cli-core";

const root = fileURLToPath(new URL("..", import.meta.url));
const detection = await detectProject(root);
const result = await initProject(root, { dryRun: true });
const stateResult = await addState(root, { dryRun: true });
const doctorResult = await doctorProject(root);
const initOutput = createMachineOutput("init", result);
const stateOutput = createMachineOutput("add state", stateResult);
const doctorOutput = createMachineOutput("doctor", doctorResult);

export const detectedPackageManager = detection.packageManager;
export const detectedViiPackages = detection.installedViiPackages;
export const initStatus = result.report.status;
export const initFiles = result.report.files;
export const addStateStatus = stateResult.report.status;
export const addStateFiles = stateResult.report.files;
export const doctorStatus = doctorResult.report.status;
export const doctorFindingCodes = doctorResult.report.findings.map((finding) => finding.code);
export const machineOutputProtocols = [
  initOutput.protocol,
  stateOutput.protocol,
  doctorOutput.protocol,
];
export const machineOutputVersions = [
  initOutput.version,
  stateOutput.version,
  doctorOutput.version,
];
export const machineOutputJsonRoundTrip = JSON.parse(stringifyMachineOutput(doctorOutput));
