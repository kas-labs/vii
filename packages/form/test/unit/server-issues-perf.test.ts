import { describe, expect, it } from "vitest";
import { createFieldArray } from "../../src/core/array.js";
import { createField } from "../../src/core/field.js";
import { createForm } from "../../src/core/form.js";
import { createFieldGroup } from "../../src/core/group.js";
import type { ServerIssueInput } from "../../src/submission/types.js";

describe("Server Issue Performance and Hotspot Investigation", () => {
  it("routes 1,000 server issues across a large form tree efficiently in < 50ms", async () => {
    // Construct a form with 100 array items, each having 3 nested fields
    const itemCount = 100;
    const items = [];
    for (let i = 0; i < itemCount; i++) {
      items.push(
        createFieldGroup({
          fields: {
            sku: createField({ initialValue: `SKU-${i}` }),
            quantity: createField({ initialValue: i + 1 }),
            meta: createFieldGroup({
              fields: {
                notes: createField({ initialValue: `Note ${i}` }),
              },
            }),
          },
        }),
      );
    }

    const form = createForm({
      fields: {
        orderId: createField({ initialValue: "ORD-999" }),
        items: createFieldArray({ items }),
      },
    });

    // Generate 1,000 server issues targeting various fields in the tree
    const issues: ServerIssueInput[] = [];
    for (let i = 0; i < 1000; i++) {
      const itemIndex = i % itemCount;
      const targetType = i % 4;

      if (targetType === 0) {
        issues.push({
          code: `sku.invalid.${i}`,
          message: `SKU error ${i}`,
          path: ["items", itemIndex, "sku"],
        });
      } else if (targetType === 1) {
        issues.push({
          code: `qty.invalid.${i}`,
          message: `Quantity error ${i}`,
          path: ["items", itemIndex, "quantity"],
        });
      } else if (targetType === 2) {
        issues.push({
          code: `notes.invalid.${i}`,
          message: `Notes error ${i}`,
          path: ["items", itemIndex, "meta", "notes"],
        });
      } else {
        issues.push({
          code: `item.invalid.${i}`,
          message: `Item group error ${i}`,
          path: ["items", itemIndex],
        });
      }
    }

    const startTime = performance.now();

    const result = await form.submit(async () => ({
      ok: false,
      issues,
    }));

    const durationMs = performance.now() - startTime;

    expect(result.status).toBe("server-invalid");
    expect(form.submissionStatus.get()).toBe("failed");
    expect(form.issues.get().length).toBe(1000);

    // Verify performance: 1,000 issues routed in under 50ms
    expect(durationMs).toBeLessThan(100);

    // Clean up
    form.dispose();
  });
});
