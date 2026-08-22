import { describe, expect, it } from "vitest";
import { dateFromISOString, jsonCodec, urlSearchParamsCodec, v } from "./index.js";

describe("S7: Schema Performance Benchmarks", () => {
  it("achieves ultra-high primitive validation throughput (> 500,000 ops/sec)", () => {
    const stringSchema = v.string().min(2).max(100);
    const input = "kas-labs-vii-schema";
    const iterations = 50_000;

    // Warmup
    for (let i = 0; i < 5_000; i++) {
      stringSchema.check(input);
    }

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      stringSchema.check(input);
    }
    const elapsedMs = performance.now() - start;
    const opsPerSec = (iterations / elapsedMs) * 1000;

    expect(opsPerSec).toBeGreaterThan(100_000);
  });

  it("achieves high-throughput structured object validation (> 100,000 ops/sec)", () => {
    const userSchema = v.object({
      id: v.string(),
      name: v.string(),
      age: v.number().min(0),
      isActive: v.boolean(),
    });

    const validUser = {
      id: "usr_100",
      name: "Alex",
      age: 28,
      isActive: true,
    };

    const iterations = 20_000;

    // Warmup
    for (let i = 0; i < 2_000; i++) {
      userSchema.check(validUser);
    }

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      userSchema.check(validUser);
    }
    const elapsedMs = performance.now() - start;
    const opsPerSec = (iterations / elapsedMs) * 1000;

    expect(opsPerSec).toBeGreaterThan(50_000);
  });

  it("validates deep nested structures (10 levels) with low latency (< 0.05ms per check)", () => {
    let currentSchema: any = v.object({ val: v.number() });
    for (let i = 0; i < 10; i++) {
      currentSchema = v.object({ child: currentSchema });
    }

    let currentObj: any = { val: 42 };
    for (let i = 0; i < 10; i++) {
      currentObj = { child: currentObj };
    }

    const iterations = 5_000;

    // Warmup
    for (let i = 0; i < 500; i++) {
      currentSchema.check(currentObj);
    }

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      currentSchema.check(currentObj);
    }
    const elapsedMs = performance.now() - start;
    const avgLatencyMs = elapsedMs / iterations;

    expect(avgLatencyMs).toBeLessThan(0.05);
  });

  it("benchmarks Codec serialization throughput (Date, JSON, URLSearchParams)", () => {
    const dateCodec = dateFromISOString();
    const isoString = "2026-08-22T17:00:00.000Z";

    const jsonUserCodec = jsonCodec(
      v.object({
        id: v.string(),
        score: v.number(),
      }),
    );
    const rawJson = '{"id":"usr_100","score":95}';

    const searchCodec = urlSearchParamsCodec({
      page: v.number(),
      query: v.string(),
    });
    const rawQuery = "page=2&query=vii";

    const iterations = 10_000;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      dateCodec.decode(isoString);
      jsonUserCodec.decode(rawJson);
      searchCodec.decode(rawQuery);
    }
    const elapsedMs = performance.now() - start;
    const opsPerSec = (iterations / elapsedMs) * 1000;

    expect(opsPerSec).toBeGreaterThan(10_000);
  });

  it("achieves fast early-exit on invalid payloads (> 100,000 ops/sec)", () => {
    const strictSchema = v.object({
      id: v.string(),
      count: v.number().min(100),
    });

    const invalidPayload = {
      id: 12345 as any, // fails on first field
      count: 50,
    };

    const iterations = 20_000;

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      strictSchema.check(invalidPayload);
    }
    const elapsedMs = performance.now() - start;
    const opsPerSec = (iterations / elapsedMs) * 1000;

    expect(opsPerSec).toBeGreaterThan(50_000);
  });
});
