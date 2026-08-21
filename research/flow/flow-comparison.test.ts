import { Subject } from "rxjs";
import { distinctUntilChanged, filter as rxFilter, map as rxMap } from "rxjs/operators";
import { describe, expect, test } from "vitest";
import { createManualSource, distinct, filter, map } from "./flow-prototype.js";

const CORRECTNESS_INPUTS = [1, 1, 2, 2, 3, 4, 4, 5];
const MEASUREMENT_PATTERN = [0, 1, 2, 3, 4, 5, 6, 7];
const WARMUP_SAMPLES = 3;
const MEASUREMENT_SAMPLES = 10;
const EMISSIONS_PER_SAMPLE = 100_000;
const MEASUREMENT_INPUTS = Array.from(
  { length: EMISSIONS_PER_SAMPLE },
  (_, index) => MEASUREMENT_PATTERN[index % MEASUREMENT_PATTERN.length]!,
);
const RETENTION_CYCLES = 1_000;

interface PipelineSnapshot {
  readonly count: number;
  readonly checksum: number;
  readonly completed: number;
  readonly values?: readonly number[];
}

interface ComparisonPipeline {
  emit(value: number): void;
  complete(): void;
  dispose(): void;
  snapshot(): PipelineSnapshot;
}

interface MeasurementSample {
  readonly elapsedMs: number;
  readonly result: Omit<PipelineSnapshot, "values">;
}

interface RetentionMeasurement {
  readonly status: "observed" | "unavailable";
  readonly cycles: number;
  readonly heapBeforeBytes?: number;
  readonly heapAfterBytes?: number;
  readonly heapDeltaBytes?: number;
  readonly reason?: string;
}

type RuntimeWithDiagnostics = typeof globalThis & {
  readonly gc?: () => void;
  readonly process?: {
    readonly version?: string;
    memoryUsage?: () => { readonly heapUsed: number };
  };
};

interface Runner {
  readonly name: "direct" | "rxjs" | "prototype";
  readonly create: () => ComparisonPipeline;
}

function transform(value: number): number | undefined {
  const mapped = value % 4;
  return mapped % 2 === 0 ? mapped : undefined;
}

function createDirectPipeline(): ComparisonPipeline {
  let active = true;
  let hasPrevious = false;
  let previous = 0;
  let count = 0;
  let checksum = 0;
  let completed = 0;
  const values: number[] = [];

  return {
    emit: (value) => {
      if (!active) {
        return;
      }
      const next = transform(value);
      if (next === undefined || (hasPrevious && Object.is(previous, next))) {
        return;
      }
      hasPrevious = true;
      previous = next;
      count += 1;
      checksum += next;
      values.push(next);
    },
    complete: () => {
      if (active) {
        active = false;
        completed += 1;
      }
    },
    dispose: () => {
      active = false;
    },
    snapshot: () => ({ count, checksum, completed, values }),
  };
}

function createRxjsPipeline(): ComparisonPipeline {
  const values: number[] = [];
  let completed = 0;
  const subject = new Subject<number>();
  const subscription = subject
    .pipe(
      rxMap<number, number>((value) => value % 4),
      rxFilter<number>((value) => value % 2 === 0),
      distinctUntilChanged(),
    )
    .subscribe({
      next: (value) => values.push(value),
      complete: () => {
        completed += 1;
      },
    });

  return {
    emit: (value) => subject.next(value),
    complete: () => subject.complete(),
    dispose: () => subscription.unsubscribe(),
    snapshot: () => ({
      count: values.length,
      checksum: values.reduce((sum, value) => sum + value, 0),
      completed,
      values,
    }),
  };
}

function createPrototypePipeline(): ComparisonPipeline {
  const values: number[] = [];
  let completed = 0;
  const source = createManualSource<number>();
  const subscription = distinct<number>()(
    filter<number>((value) => value % 2 === 0)(
      map<number, number>((value) => value % 4)(source.source),
    ),
  ).subscribe({
    next: (value) => values.push(value),
    error: () => undefined,
    complete: () => {
      completed += 1;
    },
  });

  return {
    emit: (value) => source.emit(value),
    complete: () => source.complete(),
    dispose: () => subscription.dispose(),
    snapshot: () => ({
      count: values.length,
      checksum: values.reduce((sum, value) => sum + value, 0),
      completed,
      values,
    }),
  };
}

function createRunners(): readonly Runner[] {
  return [
    { name: "direct", create: createDirectPipeline },
    { name: "rxjs", create: createRxjsPipeline },
    { name: "prototype", create: createPrototypePipeline },
  ];
}

function runInputs(pipeline: ComparisonPipeline, inputs: readonly number[]): PipelineSnapshot {
  for (const input of inputs) {
    pipeline.emit(input);
  }
  pipeline.complete();
  return pipeline.snapshot();
}

function withoutValues(snapshot: PipelineSnapshot): Omit<PipelineSnapshot, "values"> {
  const { values: _values, ...structural } = snapshot;
  return structural;
}

function expectedSnapshot(inputs: readonly number[]): Omit<PipelineSnapshot, "values"> {
  const values: number[] = [];
  for (const input of inputs) {
    const next = transform(input);
    if (next !== undefined && values.at(-1) !== next) {
      values.push(next);
    }
  }
  return {
    count: values.length,
    checksum: values.reduce((sum, value) => sum + value, 0),
    completed: 1,
  };
}

function measureRunner(runner: Runner): readonly MeasurementSample[] {
  for (let sample = 0; sample < WARMUP_SAMPLES; sample += 1) {
    const pipeline = runner.create();
    runInputs(pipeline, MEASUREMENT_INPUTS);
    pipeline.dispose();
  }

  const expected = expectedSnapshot(MEASUREMENT_INPUTS);
  const samples: MeasurementSample[] = [];
  for (let sample = 0; sample < MEASUREMENT_SAMPLES; sample += 1) {
    const pipeline = runner.create();
    const start = performance.now();
    const result = runInputs(pipeline, MEASUREMENT_INPUTS);
    const elapsedMs = performance.now() - start;
    pipeline.dispose();
    const structural = withoutValues(result);
    expect(structural).toEqual(expected);
    samples.push({ elapsedMs, result: structural });
  }
  return samples;
}

function summarize(samples: readonly MeasurementSample[]): Record<string, number> {
  const durations = samples.map(({ elapsedMs }) => elapsedMs).sort((left, right) => left - right);
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  return {
    minMs: durations[0]!,
    p50Ms: durations[Math.floor(durations.length / 2)]!,
    maxMs: durations.at(-1)!,
    meanMs: total / durations.length,
  };
}

function measureRetention(runner: Runner, runtime: RuntimeWithDiagnostics): RetentionMeasurement {
  const gc = runtime.gc;
  const memoryUsage = runtime.process?.memoryUsage;
  if (gc === undefined || memoryUsage === undefined) {
    return {
      status: "unavailable",
      cycles: RETENTION_CYCLES,
      reason: "Run the harness with --expose-gc to collect comparable heap readings.",
    };
  }

  gc();
  const heapBeforeBytes = memoryUsage().heapUsed;
  for (let cycle = 0; cycle < RETENTION_CYCLES; cycle += 1) {
    const pipeline = runner.create();
    pipeline.dispose();
  }
  gc();
  const heapAfterBytes = memoryUsage().heapUsed;
  return {
    status: "observed",
    cycles: RETENTION_CYCLES,
    heapBeforeBytes,
    heapAfterBytes,
    heapDeltaBytes: heapAfterBytes - heapBeforeBytes,
  };
}

describe("Flow comparison harness", () => {
  test("passes correctness before collecting bounded runtime evidence", () => {
    const runners = createRunners();
    const expectedValues = [2, 0];
    for (const runner of runners) {
      const pipeline = runner.create();
      const result = runInputs(pipeline, CORRECTNESS_INPUTS);
      expect(result.values).toEqual(expectedValues);
      expect(withoutValues(result)).toEqual(expectedSnapshot(CORRECTNESS_INPUTS));
      pipeline.dispose();
    }

    const runtime = globalThis as RuntimeWithDiagnostics;
    const report = {
      status: "correctness-passed",
      fixture: "explicit hot synchronous source: map -> filter -> distinct",
      semantics: {
        source: "subscription-driven hot source; no replay",
        ordering: "synchronous FIFO",
        completion: "explicit complete before disposal",
        disposal: "subscription disposal after measurement",
      },
      environment: {
        node: runtime.process?.version ?? "unavailable",
        pnpm: "10.12.4 (recorded repository environment)",
        rxjs: "7.8.2",
        timerMode: "not applicable",
        gcAvailable: runtime.gc !== undefined,
      },
      methodology: {
        warmupSamples: WARMUP_SAMPLES,
        measurementSamples: MEASUREMENT_SAMPLES,
        emissionsPerSample: EMISSIONS_PER_SAMPLE,
        retentionCycles: RETENTION_CYCLES,
        measurementClock: "performance.now()",
        rawValues: "not emitted in report; only structural counts/checksums",
      },
      runners: runners.map((runner) => {
        const samples = measureRunner(runner);
        return {
          name: runner.name,
          rawSamples: samples,
          summary: summarize(samples),
          retention: measureRetention(runner, runtime),
        };
      }),
      deferred: [
        "bundle and tree-shaking cost",
        "TypeScript compiler cost",
        "broader retained-memory and allocation study",
        "temporal and async switching runtime measurements",
      ],
      limitations: [
        "One synchronous fixture cannot support global performance claims.",
        "Heap readings are optional and process-sensitive even with explicit GC.",
        "Prototype remains throwaway research code and is not a Vii package API.",
      ],
    };
    console.log(JSON.stringify(report, null, 2));
  });
});
