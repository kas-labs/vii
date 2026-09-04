import { createFieldArray } from "../../src/core/array.js";
import { createField } from "../../src/core/field.js";
import type { FieldArray, FieldState } from "../../src/core/types.js";
import { benchmarkWithSetup, type BenchmarkResult } from "./helpers.js";

export interface FieldArrayBenchmarkSuiteResults {
  operations10: Record<string, BenchmarkResult>;
  operations100: Record<string, BenchmarkResult>;
  identityVerified: boolean;
}

export function runFieldArrayBenchmarks(): FieldArrayBenchmarkSuiteResults {
  const runOperationsForCount = (count: number): Record<string, BenchmarkResult> => {
    const results: Record<string, BenchmarkResult> = {};

    // Append / Push (isolated: remove in teardown)
    results["push"] = benchmarkWithSetup<{
      array: FieldArray<FieldState<string>>;
      pushed: FieldState<string>;
    }>({
      name: `array_${count}_push`,
      iterations: 100,
      warmup: 10,
      setup: () => {
        const items: FieldState<string>[] = [];
        for (let i = 0; i < count; i++) {
          items.push(createField({ initialValue: `item_${i}` }));
        }
        const array = createFieldArray({ items });
        const pushed = createField({ initialValue: `pushed_item` });
        return { array, pushed };
      },
      operation: ({ array, pushed }) => {
        array.append(pushed);
      },
      teardown: ({ array, pushed }) => {
        pushed.dispose();
        array.dispose();
      },
    });

    // Insert at index 0 (isolated)
    results["insert"] = benchmarkWithSetup<{
      array: FieldArray<FieldState<string>>;
      inserted: FieldState<string>;
    }>({
      name: `array_${count}_insert`,
      iterations: 100,
      warmup: 10,
      setup: () => {
        const items: FieldState<string>[] = [];
        for (let i = 0; i < count; i++) {
          items.push(createField({ initialValue: `item_${i}` }));
        }
        const array = createFieldArray({ items });
        const inserted = createField({ initialValue: `inserted_item` });
        return { array, inserted };
      },
      operation: ({ array, inserted }) => {
        array.insert(0, inserted);
      },
      teardown: ({ array, inserted }) => {
        inserted.dispose();
        array.dispose();
      },
    });

    // Remove at index 0 (isolated)
    results["remove"] = benchmarkWithSetup<{
      array: FieldArray<FieldState<string>>;
    }>({
      name: `array_${count}_remove`,
      iterations: 100,
      warmup: 10,
      setup: () => {
        const items: FieldState<string>[] = [];
        for (let i = 0; i < count; i++) {
          items.push(createField({ initialValue: `item_${i}` }));
        }
        return { array: createFieldArray({ items }) };
      },
      operation: ({ array }) => {
        array.remove(0);
      },
      teardown: ({ array }) => {
        array.dispose();
      },
    });

    // Swap (isolated)
    results["swap"] = benchmarkWithSetup<{
      array: FieldArray<FieldState<string>>;
    }>({
      name: `array_${count}_swap`,
      iterations: 100,
      warmup: 10,
      setup: () => {
        const items: FieldState<string>[] = [];
        for (let i = 0; i < count; i++) {
          items.push(createField({ initialValue: `item_${i}` }));
        }
        return { array: createFieldArray({ items }) };
      },
      operation: ({ array }) => {
        array.swap(0, 1);
      },
      teardown: ({ array }) => {
        array.dispose();
      },
    });

    // Move (isolated)
    results["move"] = benchmarkWithSetup<{
      array: FieldArray<FieldState<string>>;
    }>({
      name: `array_${count}_move`,
      iterations: 100,
      warmup: 10,
      setup: () => {
        const items: FieldState<string>[] = [];
        for (let i = 0; i < count; i++) {
          items.push(createField({ initialValue: `item_${i}` }));
        }
        return { array: createFieldArray({ items }) };
      },
      operation: ({ array }) => {
        array.move(count - 1, 0);
      },
      teardown: ({ array }) => {
        array.dispose();
      },
    });

    return results;
  };

  const operations10 = runOperationsForCount(10);
  const operations100 = runOperationsForCount(100);

  // Assert stable identity during mutations
  const testItems = [
    createField({ initialValue: "item_0" }),
    createField({ initialValue: "item_1" }),
    createField({ initialValue: "item_2" }),
  ];
  const testArray = createFieldArray({ items: testItems });
  const id0 = testArray.items.get()[0]!.id;
  const id1 = testArray.items.get()[1]!.id;
  const node0 = testArray.items.get()[0]!.node;
  const node1 = testArray.items.get()[1]!.node;

  testArray.swap(0, 1);
  const swapped0 = testArray.items.get()[0]!;
  const swapped1 = testArray.items.get()[1]!;

  const identityVerified =
    swapped0.id === id1 &&
    swapped0.node === node1 &&
    swapped1.id === id0 &&
    swapped1.node === node0;

  testArray.dispose();

  return {
    operations10,
    operations100,
    identityVerified,
  };
}
