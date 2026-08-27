import { createForm } from "../../form-core.js";

// Medium Form: 100 fields with nested groups and field arrays
export interface MediumFormModel {
  [key: `field_${number}`]: string;
  [key: `num_${number}`]: number;
  groupA: {
    a1: string;
    a2: string;
    a3: string;
    a4: string;
    a5: string;
    nestedGroup: {
      n1: number;
      n2: number;
      n3: number;
      n4: number;
      n5: number;
    };
  };
  groupB: {
    b1: boolean;
    b2: boolean;
    b3: boolean;
    b4: boolean;
    b5: boolean;
  };
  items: number[];
}

export function buildMediumForm() {
  const initialValues: any = {
    groupA: {
      a1: "a1",
      a2: "a2",
      a3: "a3",
      a4: "a4",
      a5: "a5",
      nestedGroup: {
        n1: 1,
        n2: 2,
        n3: 3,
        n4: 4,
        n5: 5,
      },
    },
    groupB: {
      b1: true,
      b2: false,
      b3: true,
      b4: false,
      b5: true,
    },
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  };

  for (let i = 0; i < 50; i++) {
    initialValues[`field_${i}`] = `val_${i}`;
  }
  for (let i = 0; i < 20; i++) {
    initialValues[`num_${i}`] = i;
  }

  const form = createForm<MediumFormModel>({
    initialValues,
    rules: [
      (vals: MediumFormModel) =>
        vals.items.length >= 5
          ? null
          : { code: "min_items", message: "Needs at least 5 items", path: ["items"] },
    ],
  });

  return form;
}

const form = buildMediumForm();
export type MediumFormValues = typeof form.values;
export type MediumFormOutput = ReturnType<typeof form.getOutput>;
