/// <reference types="node" />

import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  addState,
  createMachineOutput,
  detectProject,
  doctorProject,
  initProject,
  inspectTrace,
  stringifyMachineOutput,
  type AddStateResult,
  type TraceInspection,
} from "@vii/cli-core";
import { createDiagnostics, createScope, state } from "@vii/core";

const root = fileURLToPath(new URL("..", import.meta.url));
const detection = await detectProject(root);
const result = await initProject(root, { dryRun: true });
const stateResult = await addState(root, { dryRun: true });
const doctorResult = await doctorProject(root);
const initOutput = createMachineOutput("init", result);
const stateOutput = createMachineOutput("add state", stateResult);
const doctorOutput = createMachineOutput("doctor", doctorResult);
const diagnostics = createDiagnostics({ clock: () => 123 });
diagnostics.run(() => {
  const count = state(0);
  count.set(1);
});
const traceInspection = inspectTrace(diagnostics.exportTrace());
const ownershipDiagnostics = createDiagnostics({ clock: () => 456 });
ownershipDiagnostics.run(() => {
  const scope = createScope({ name: "private-scope" });
  scope.use(() => undefined);
  scope.dispose();
});
const ownershipInspection = inspectTrace(ownershipDiagnostics.exportTrace());
const securityRoot = await mkdtemp(path.join(os.tmpdir(), "vii-packed-security-"));
const securitySource = await mkdtemp(path.join(os.tmpdir(), "vii-packed-source-"));
let securityResult: AddStateResult;
let securityInspection: TraceInspection;
try {
  await writeFile(
    path.join(securityRoot, "package.json"),
    JSON.stringify({ dependencies: { "@vii/core": "0.0.0" } }),
  );
  await symlink(securitySource, path.join(securityRoot, "src"), "dir");
  const securityDiagnostics = createDiagnostics({ clock: () => 789 });
  securityResult = await addState(securityRoot, {
    dryRun: true,
    diagnostics: securityDiagnostics,
  });
  securityInspection = inspectTrace(securityDiagnostics.exportTrace());
} finally {
  await rm(securityRoot, { recursive: true, force: true });
  await rm(securitySource, { recursive: true, force: true });
}

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
export const traceInspectionEventCount = traceInspection.eventCount;
export const traceInspectionDroppedEvents = traceInspection.droppedEvents;
export const traceInspectionEventTypes = traceInspection.eventTypes;
export const traceInspectionScopeGraph = ownershipInspection.scopeGraph;
export const securityProducerStatus = securityResult.report.status;
export const securityInspectionEventTypes = securityInspection.eventTypes;
