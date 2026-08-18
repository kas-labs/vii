/// <reference types="node" />

import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
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
  type MachineMutationOutput,
  type TraceInspection,
} from "@vii-labs/cli-core";
import { createDiagnostics, createScope, state } from "@vii-labs/core";

const root = fileURLToPath(new URL("..", import.meta.url));
const detection = await detectProject(root);
const result = await initProject(root, { dryRun: true });
const stateResult = await addState(root, { dryRun: true });
const doctorResult = await doctorProject(root);
const initOutput = createMachineOutput("init", result);
const stateOutput = createMachineOutput("add state", stateResult);
const doctorOutput = createMachineOutput("doctor", doctorResult);
const mutationRoot = await mkdtemp(path.join(os.tmpdir(), "vii-packed-mutations-"));
const initRoot = path.join(mutationRoot, "init");
const addStateRoot = path.join(mutationRoot, "add-state");
await mkdir(initRoot, { recursive: true });
await mkdir(path.join(addStateRoot, "src"), { recursive: true });
await writeFile(
  path.join(initRoot, "package.json"),
  JSON.stringify({ dependencies: { react: "19.0.0" } }),
);
await writeFile(path.join(initRoot, "package-lock.json"), "lockfile\n");
await writeFile(path.join(initRoot, "tsconfig.json"), "{}\n");
await writeFile(
  path.join(addStateRoot, "package.json"),
  JSON.stringify({ dependencies: { "@vii-labs/core": "0.0.0" } }),
);
await writeFile(path.join(addStateRoot, "package-lock.json"), "lockfile\n");
await writeFile(path.join(addStateRoot, "src/main.ts"), "export {};\n");
let initAppliedOutput: MachineMutationOutput;
let initUnchangedOutput: MachineMutationOutput;
let addStateAppliedOutput: MachineMutationOutput;
let addStateUnchangedOutput: MachineMutationOutput;
let addStateBlockedOutput: MachineMutationOutput;
try {
  const initApplied = await initProject(initRoot);
  const initUnchanged = await initProject(initRoot);
  const addStateApplied = await addState(addStateRoot);
  const addStateUnchanged = await addState(addStateRoot);
  await writeFile(path.join(addStateRoot, "src/state.ts"), "export const custom = true;\n");
  const addStateBlocked = await addState(addStateRoot);
  initAppliedOutput = createMachineOutput("init", initApplied);
  initUnchangedOutput = createMachineOutput("init", initUnchanged);
  addStateAppliedOutput = createMachineOutput("add state", addStateApplied);
  addStateUnchangedOutput = createMachineOutput("add state", addStateUnchanged);
  addStateBlockedOutput = createMachineOutput("add state", addStateBlocked);
} finally {
  await rm(mutationRoot, { recursive: true, force: true });
}
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
    JSON.stringify({ dependencies: { "@vii-labs/core": "0.0.0" } }),
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
export const mutationStatuses = [
  initAppliedOutput.status,
  initUnchangedOutput.status,
  addStateAppliedOutput.status,
  addStateUnchangedOutput.status,
  addStateBlockedOutput.status,
];
export const mutationFiles = [
  initAppliedOutput.report.files,
  initUnchangedOutput.report.files,
  addStateAppliedOutput.report.files,
  addStateUnchangedOutput.report.files,
  addStateBlockedOutput.report.files,
];
export const mutationValidation = [
  initAppliedOutput.validation.passed,
  initUnchangedOutput.validation.passed,
  addStateAppliedOutput.validation.passed,
  addStateUnchangedOutput.validation.passed,
  addStateBlockedOutput.validation.passed,
];
export const mutationJsonRoundTrips = [
  JSON.parse(stringifyMachineOutput(initAppliedOutput)),
  JSON.parse(stringifyMachineOutput(initUnchangedOutput)),
  JSON.parse(stringifyMachineOutput(addStateAppliedOutput)),
  JSON.parse(stringifyMachineOutput(addStateUnchangedOutput)),
  JSON.parse(stringifyMachineOutput(addStateBlockedOutput)),
];
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
