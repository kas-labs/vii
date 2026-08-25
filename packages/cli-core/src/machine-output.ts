import path from "node:path";
import type {
  AddStateResult,
  DoctorResult,
  DoctorStatus,
  InitResult,
  InitReportStatus,
  AddStateReportStatus,
  DetectedProject,
} from "./types.js";

export const CLI_MACHINE_OUTPUT_PROTOCOL = "vii.cli" as const;
export const CLI_MACHINE_OUTPUT_VERSION = 1 as const;

export type MachineCommand = "init" | "add state" | "doctor";
export type MachineMutationStatus = InitReportStatus | AddStateReportStatus;

export interface MachineOutputOptions {
  /**
   * If true, redacts absolute filesystem paths to relative roots (".").
   */
  readonly redactPaths?: boolean;
}

interface MachineOutputBase {
  readonly command: MachineCommand;
  readonly detection: DetectedProject;
  readonly phases: readonly string[];
  readonly protocol: typeof CLI_MACHINE_OUTPUT_PROTOCOL;
  readonly status: DoctorStatus | MachineMutationStatus;
  readonly version: typeof CLI_MACHINE_OUTPUT_VERSION;
}

export interface MachineMutationOutput extends MachineOutputBase {
  readonly command: "init" | "add state";
  readonly kind: "mutation";
  readonly plan: InitResult["plan"] | AddStateResult["plan"];
  readonly report: InitResult["report"] | AddStateResult["report"];
  readonly validation: InitResult["validation"] | AddStateResult["validation"];
}

export interface MachineDoctorOutput extends MachineOutputBase {
  readonly command: "doctor";
  readonly findings: DoctorResult["findings"];
  readonly kind: "diagnostics";
  readonly report: DoctorResult["report"];
  readonly validation: DoctorResult["validation"];
}

export type MachineOutput = MachineMutationOutput | MachineDoctorOutput;

export function createMachineOutput(
  command: "init",
  result: InitResult,
  options?: MachineOutputOptions,
): MachineMutationOutput;
export function createMachineOutput(
  command: "add state",
  result: AddStateResult,
  options?: MachineOutputOptions,
): MachineMutationOutput;
export function createMachineOutput(
  command: "doctor",
  result: DoctorResult,
  options?: MachineOutputOptions,
): MachineDoctorOutput;
export function createMachineOutput(
  command: MachineCommand,
  result: InitResult | AddStateResult | DoctorResult,
  options: MachineOutputOptions = {},
): MachineOutput {
  const detection = options.redactPaths ? redactDetectionPaths(result.detection) : result.detection;

  const base = {
    detection,
    phases: result.phases,
    protocol: CLI_MACHINE_OUTPUT_PROTOCOL,
    version: CLI_MACHINE_OUTPUT_VERSION,
  };
  if (command === "doctor") {
    const doctor = result as DoctorResult;
    return {
      ...base,
      command: "doctor",
      findings: doctor.findings,
      kind: "diagnostics",
      report: doctor.report,
      status: doctor.report.status,
      validation: doctor.validation,
    };
  }
  const mutation = result as InitResult | AddStateResult;
  return {
    ...base,
    command,
    kind: "mutation",
    plan: mutation.plan,
    report: mutation.report,
    status: mutation.report.status,
    validation: mutation.validation,
  };
}

export function stringifyMachineOutput(
  output: MachineOutput,
  options: MachineOutputOptions = {},
): string {
  if (options.redactPaths) {
    const redactedOutput = {
      ...output,
      detection: redactDetectionPaths(output.detection),
    };
    return JSON.stringify(redactedOutput);
  }
  return JSON.stringify(output);
}

function redactDetectionPaths(detection: DetectedProject): DetectedProject {
  const root = ".";
  return {
    ...detection,
    root,
    projects: (detection.projects ?? []).map((proj) => ({
      ...proj,
      root: path.relative(detection.root, proj.root) || ".",
    })),
  };
}
