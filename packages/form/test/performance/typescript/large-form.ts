import { createField, createFieldGroup, createForm } from "../../../src/index.js";

function buildFields10(prefix: string) {
  return {
    [`${prefix}_0`]: createField({ initialValue: "val_0" }),
    [`${prefix}_1`]: createField({ initialValue: 1 }),
    [`${prefix}_2`]: createField({ initialValue: true }),
    [`${prefix}_3`]: createField({ initialValue: "val_3" }),
    [`${prefix}_4`]: createField({ initialValue: 4 }),
    [`${prefix}_5`]: createField({ initialValue: false }),
    [`${prefix}_6`]: createField({ initialValue: "val_6" }),
    [`${prefix}_7`]: createField({ initialValue: 7 }),
    [`${prefix}_8`]: createField({ initialValue: true }),
    [`${prefix}_9`]: createField({ initialValue: "val_9" }),
  };
}

function buildGroup50(prefix: string) {
  return {
    sub0: createFieldGroup({ fields: buildFields10(`${prefix}_s0`) }),
    sub1: createFieldGroup({ fields: buildFields10(`${prefix}_s1`) }),
    sub2: createFieldGroup({ fields: buildFields10(`${prefix}_s2`) }),
    sub3: createFieldGroup({ fields: buildFields10(`${prefix}_s3`) }),
    sub4: createFieldGroup({ fields: buildFields10(`${prefix}_s4`) }),
  };
}

export function createLargeForm() {
  return createForm({
    fields: {
      group0: createFieldGroup({ fields: buildGroup50("g0") }),
      group1: createFieldGroup({ fields: buildGroup50("g1") }),
      group2: createFieldGroup({ fields: buildGroup50("g2") }),
      group3: createFieldGroup({ fields: buildGroup50("g3") }),
      group4: createFieldGroup({ fields: buildGroup50("g4") }),
      group5: createFieldGroup({ fields: buildGroup50("g5") }),
    },
  });
}

export type LargeFormType = ReturnType<typeof createLargeForm>;
