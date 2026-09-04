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

export function createMediumForm() {
  return createForm({
    fields: {
      g0: createFieldGroup({ fields: buildFields10("f0") }),
      g1: createFieldGroup({ fields: buildFields10("f1") }),
      g2: createFieldGroup({ fields: buildFields10("f2") }),
      g3: createFieldGroup({ fields: buildFields10("f3") }),
      g4: createFieldGroup({ fields: buildFields10("f4") }),
      g5: createFieldGroup({ fields: buildFields10("f5") }),
      g6: createFieldGroup({ fields: buildFields10("f6") }),
      g7: createFieldGroup({ fields: buildFields10("f7") }),
      g8: createFieldGroup({ fields: buildFields10("f8") }),
      g9: createFieldGroup({ fields: buildFields10("f9") }),
    },
  });
}

export type MediumFormType = ReturnType<typeof createMediumForm>;
