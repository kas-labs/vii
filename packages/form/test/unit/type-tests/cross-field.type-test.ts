import { describe, expectTypeOf, test } from "vitest";
import {
  createField,
  type FieldDependenciesDeclaration,
  type FieldState,
  type ValidationRuleContext,
} from "../../../src/index.js";

describe("P2c: Cross-Field Dependencies Type Tests", () => {
  test("ctx.get(field) infers domain value TValue | undefined", () => {
    const numField = createField<number>({ initialValue: 42 });
    const strField = createField<string>({ initialValue: "vii" });
    const parsedField = createField<Date, string>({
      initialValue: new Date(),
      initialRawValue: "2026-01-01",
      parser: (raw: string) => ({ ok: true, value: new Date(raw) }),
    });

    createField<string>({
      initialValue: "test",
      dependencies: [numField, strField, parsedField],
      rules: [
        (_val: string, ctx: ValidationRuleContext) => {
          const numVal = ctx.get(numField);
          const strVal = ctx.get(strField);
          const dateVal = ctx.get(parsedField);

          expectTypeOf(numVal).toEqualTypeOf<number | undefined>();
          expectTypeOf(strVal).toEqualTypeOf<string | undefined>();
          expectTypeOf(dateVal).toEqualTypeOf<Date | undefined>();

          return null;
        },
      ],
    });
  });

  test("FieldDependenciesDeclaration matches array of FieldStates or self-referential factory", () => {
    const a = createField<number>({ initialValue: 1 });
    const b = createField<string>({ initialValue: "b" });

    const depArray: FieldDependenciesDeclaration<boolean, boolean> = [a, b];
    const depFactory: FieldDependenciesDeclaration<boolean, boolean> = (self) => {
      expectTypeOf(self).toEqualTypeOf<FieldState<boolean, boolean>>();
      return [a, b];
    };

    expectTypeOf(depArray).toMatchTypeOf<FieldDependenciesDeclaration<boolean, boolean>>();
    expectTypeOf(depFactory).toMatchTypeOf<FieldDependenciesDeclaration<boolean, boolean>>();
  });
});
