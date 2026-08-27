import { createForm } from "../../form-core.js";

// Large Form: 300+ fields with deep hierarchy
export interface LargeAddress {
  street: string;
  city: string;
}

export interface LargeFormModel {
  [key: `f_${number}`]: string;
  [key: `n_${number}`]: number;
  sectionA: {
    [key: `sg1_${number}`]: string;
    deepChild: {
      [key: `sg2_${number}`]: number;
    };
  };
  addresses: LargeAddress[];
}

export function buildLargeForm() {
  const initialValues: any = {
    sectionA: {
      deepChild: {},
    },
    addresses: Array.from({ length: 25 }, (_, i) => ({
      street: `Street ${i}`,
      city: `City ${i}`,
    })),
  };

  for (let i = 0; i < 150; i++) {
    initialValues[`f_${i}`] = `str_${i}`;
  }
  for (let i = 0; i < 50; i++) {
    initialValues[`n_${i}`] = i * 10;
  }
  for (let i = 0; i < 25; i++) {
    initialValues.sectionA[`sg1_${i}`] = `v1_${i}`;
    initialValues.sectionA.deepChild[`sg2_${i}`] = i;
  }

  const form = createForm<LargeFormModel>({
    initialValues,
    rules: [
      (vals: LargeFormModel) =>
        vals.addresses.length >= 1
          ? null
          : { code: "min_addr", message: "At least one address required", path: ["addresses"] },
    ],
  });

  return form;
}

const form = buildLargeForm();
export type LargeFormValues = typeof form.values;
export type LargeFormOutput = ReturnType<typeof form.getOutput>;
