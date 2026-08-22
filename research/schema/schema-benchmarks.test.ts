import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Type } from "@sinclair/typebox";
import { type as arkType } from "arktype";
import * as valibot from "valibot";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { v } from "./index.js";

// Pinned Competitor Versions:
// - Handwritten Baseline: Pure conditional JavaScript function
// - Zod 4: zod@4.4.3
// - Valibot: valibot@1.4.2
// - ArkType: arktype@2.2.3
// - TypeBox (Compiled): @sinclair/typebox@0.34.52 (TypeCompiler.Compile)
// - Vii Prototype: Current zero-copy research prototype

interface BenchmarkResult {
  readonly competitor: string;
  readonly opsPerSec: number;
  readonly meanMs: number;
}

function runBenchmark(name: string, iterations: number, fn: () => void): BenchmarkResult {
  // Warmup (10% of iterations)
  const warmupCount = Math.max(100, Math.floor(iterations * 0.1));
  for (let i = 0; i < warmupCount; i++) {
    fn();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const elapsedMs = performance.now() - start;
  const opsPerSec = Math.round((iterations / elapsedMs) * 1000);
  const meanMs = elapsedMs / iterations;

  return { competitor: name, opsPerSec, meanMs };
}

describe("S7: Comprehensive Empirical Build-vs-Buy Benchmarks", () => {
  const iterations = 25_000;

  const validUserData = {
    id: "usr_999",
    name: "Kasap",
    age: 32,
    isActive: true,
  };

  const invalidUserData = {
    id: "usr_999",
    name: "K", // min length 2 violation
    age: -10, // min value 0 violation
    isActive: true,
  };

  // 1. Handwritten Baseline
  const handwrittenCheck = (input: unknown) => {
    if (typeof input !== "object" || input === null) return { ok: false };
    const r = input as Record<string, unknown>;
    if (typeof r.id !== "string") return { ok: false };
    if (typeof r.name !== "string" || r.name.length < 2) return { ok: false };
    if (typeof r.age !== "number" || r.age < 0) return { ok: false };
    if (typeof r.isActive !== "boolean") return { ok: false };
    return { ok: true, value: input };
  };

  // 2. Zod 4 Schema
  const zodSchema = z.object({
    id: z.string(),
    name: z.string().min(2),
    age: z.number().min(0),
    isActive: z.boolean(),
  });

  // 3. Valibot Schema
  const valibotSchema = valibot.object({
    id: valibot.string(),
    name: valibot.pipe(valibot.string(), valibot.minLength(2)),
    age: valibot.pipe(valibot.number(), valibot.minValue(0)),
    isActive: valibot.boolean(),
  });

  // 4. ArkType Schema
  const arkSchema = arkType({
    id: "string",
    name: "string >= 2",
    age: "number >= 0",
    isActive: "boolean",
  });

  // 5. TypeBox Compiled Validator
  const typeboxType = Type.Object({
    id: Type.String(),
    name: Type.String({ minLength: 2 }),
    age: Type.Number({ minimum: 0 }),
    isActive: Type.Boolean(),
  });
  const typeboxValidator = TypeCompiler.Compile(typeboxType);

  // 6. Vii Research Prototype Schema
  const viiSchema = v.object({
    id: v.string(),
    name: v.string().min(2),
    age: v.number().min(0),
    isActive: v.boolean(),
  });

  describe("Benchmark 1: Structured Object Validation (Valid Path)", () => {
    it("measures throughput across all competitors under identical dataset", () => {
      const results = [
        runBenchmark("Handwritten", iterations, () => {
          handwrittenCheck(validUserData);
        }),
        runBenchmark("Vii Prototype", iterations, () => {
          viiSchema.check(validUserData);
        }),
        runBenchmark("TypeBox (Compiled)", iterations, () => {
          typeboxValidator.Check(validUserData);
        }),
        runBenchmark("Valibot", iterations, () => {
          valibot.safeParse(valibotSchema, validUserData);
        }),
        runBenchmark("Zod 4", iterations, () => {
          zodSchema.safeParse(validUserData);
        }),
        runBenchmark("ArkType", iterations, () => {
          arkSchema(validUserData);
        }),
      ];

      expect(results.length).toBe(6);
      process.stdout.write("\n--- Benchmark 1: Valid Path Results ---\n");
      for (const res of results) {
        process.stdout.write(
          `${res.competitor.padEnd(20)}: ${res.opsPerSec.toLocaleString().padStart(10)} ops/sec (${(res.meanMs * 1000).toFixed(2)} µs/op)\n`,
        );
        expect(res.opsPerSec).toBeGreaterThan(1_000);
      }
    });
  });

  describe("Benchmark 2: Structured Object Validation (Invalid Path / Error Materialization)", () => {
    it("measures fail-closed throughput when constraints are violated", () => {
      const results = [
        runBenchmark("Handwritten", iterations, () => {
          handwrittenCheck(invalidUserData);
        }),
        runBenchmark("Vii Prototype", iterations, () => {
          viiSchema.check(invalidUserData);
        }),
        runBenchmark("TypeBox (Compiled)", iterations, () => {
          typeboxValidator.Check(invalidUserData);
        }),
        runBenchmark("Valibot", iterations, () => {
          valibot.safeParse(valibotSchema, invalidUserData);
        }),
        runBenchmark("Zod 4", iterations, () => {
          zodSchema.safeParse(invalidUserData);
        }),
        runBenchmark("ArkType", iterations, () => {
          arkSchema(invalidUserData);
        }),
      ];

      expect(results.length).toBe(6);
      process.stdout.write("\n--- Benchmark 2: Invalid Path Results ---\n");
      for (const res of results) {
        process.stdout.write(
          `${res.competitor.padEnd(20)}: ${res.opsPerSec.toLocaleString().padStart(10)} ops/sec (${(res.meanMs * 1000).toFixed(2)} µs/op)\n`,
        );
        expect(res.opsPerSec).toBeGreaterThan(1_000);
      }
    });
  });

  describe("Benchmark 3: Schema Construction / Factory Overhead", () => {
    it("measures cost of dynamic schema construction (500 schemas)", () => {
      const constructIterations = 500;

      const results = [
        runBenchmark("Vii Prototype", constructIterations, () => {
          v.object({
            id: v.string(),
            name: v.string().min(2),
            age: v.number().min(0),
            isActive: v.boolean(),
          });
        }),
        runBenchmark("Valibot", constructIterations, () => {
          valibot.object({
            id: valibot.string(),
            name: valibot.pipe(valibot.string(), valibot.minLength(2)),
            age: valibot.pipe(valibot.number(), valibot.minValue(0)),
            isActive: valibot.boolean(),
          });
        }),
        runBenchmark("Zod 4", constructIterations, () => {
          z.object({
            id: z.string(),
            name: z.string().min(2),
            age: z.number().min(0),
            isActive: z.boolean(),
          });
        }),
      ];

      expect(results.length).toBe(3);
      process.stdout.write("\n--- Benchmark 3: Factory Overhead Results ---\n");
      for (const res of results) {
        process.stdout.write(
          `${res.competitor.padEnd(20)}: ${res.opsPerSec.toLocaleString().padStart(10)} ops/sec (${(res.meanMs * 1000).toFixed(2)} µs/op)\n`,
        );
        expect(res.opsPerSec).toBeGreaterThan(100);
      }
    });
  });
});
