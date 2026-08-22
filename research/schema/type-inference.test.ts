import { describe, expect, it } from "vitest";
import {
  bigIntFromString,
  dateFromISOString,
  type InferInput,
  type InferOutput,
  jsonCodec,
  urlSearchParamsCodec,
  v,
} from "./index.js";

// Type-level assertion helpers
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

describe("S5: Type Inference & Compiler Performance", () => {
  describe("Primitive & Modifier Inferences", () => {
    it("correctly infers input and output types for primitives and modifiers", () => {
      const str = v.string();
      type TStrIn = Expect<Equal<InferInput<typeof str>, string>>;
      type TStrOut = Expect<Equal<InferOutput<typeof str>, string>>;

      const optNum = v.number().optional();
      type TOptIn = Expect<Equal<InferInput<typeof optNum>, number | undefined>>;
      type TOptOut = Expect<Equal<InferOutput<typeof optNum>, number | undefined>>;

      const nullBool = v.boolean().nullable();
      type TNullIn = Expect<Equal<InferInput<typeof nullBool>, boolean | null>>;
      type TNullOut = Expect<Equal<InferOutput<typeof nullBool>, boolean | null>>;

      const lit = v.literal("active");
      type TLit = Expect<Equal<InferOutput<typeof lit>, "active">>;

      expect(true).toBe(true);
    });
  });

  describe("Codec Asymmetric Type Inference", () => {
    it("differentiates Input vs Output types for transformation codecs", () => {
      const dateCodec = dateFromISOString();
      type TDateIn = Expect<Equal<InferInput<typeof dateCodec>, string>>;
      type TDateOut = Expect<Equal<InferOutput<typeof dateCodec>, Date>>;

      const bigIntCodec = bigIntFromString();
      type TBigIn = Expect<Equal<InferInput<typeof bigIntCodec>, string>>;
      type TBigOut = Expect<Equal<InferOutput<typeof bigIntCodec>, bigint>>;

      const userSchema = v.object({ id: v.string(), count: v.number() });
      const userJsonCodec = jsonCodec(userSchema);
      type TJsonIn = Expect<Equal<InferInput<typeof userJsonCodec>, string>>;
      type TJsonOut = Expect<
        Equal<InferOutput<typeof userJsonCodec>, { id: string; count: number }>
      >;

      const searchCodec = urlSearchParamsCodec({
        page: v.number(),
        query: v.string(),
      });
      type TSearchIn = Expect<Equal<InferInput<typeof searchCodec>, string>>;
      type TSearchOut = Expect<
        Equal<InferOutput<typeof searchCodec>, { page: number; query: string }>
      >;

      expect(true).toBe(true);
    });
  });

  describe("Deeply Nested Structure Composition", () => {
    it("infers deep object types (10 levels) without recursion limit errors", () => {
      const deepSchema = v.object({
        l1: v.object({
          l2: v.object({
            l3: v.object({
              l4: v.object({
                l5: v.object({
                  l6: v.object({
                    l7: v.object({
                      l8: v.object({
                        l9: v.object({
                          value: v.string(),
                          count: v.number(),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      type TDeep = InferOutput<typeof deepSchema>;
      type TTarget = TDeep["l1"]["l2"]["l3"]["l4"]["l5"]["l6"]["l7"]["l8"]["l9"]["value"];
      type TCheck = Expect<Equal<TTarget, string>>;

      const sample: TDeep = {
        l1: {
          l2: {
            l3: {
              l4: {
                l5: {
                  l6: {
                    l7: {
                      l8: {
                        l9: {
                          value: "deep",
                          count: 42,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = deepSchema.check(sample);
      expect(result.ok).toBe(true);
    });
  });

  describe("Wide Object Schema Type Inference Stress", () => {
    it("handles wide object shapes with 25+ fields smoothly", () => {
      const wideSchema = v.object({
        f1: v.string(),
        f2: v.number(),
        f3: v.boolean(),
        f4: v.string(),
        f5: v.number(),
        f6: v.string().optional(),
        f7: v.number().nullable(),
        f8: v.array(v.string()),
        f9: v.string(),
        f10: v.number(),
        f11: v.string(),
        f12: v.number(),
        f13: v.boolean(),
        f14: v.string(),
        f15: v.number(),
        f16: v.string().optional(),
        f17: v.number().nullable(),
        f18: v.array(v.number()),
        f19: v.string(),
        f20: v.number(),
        f21: v.string(),
        f22: v.number(),
        f23: v.boolean(),
        f24: v.string(),
        f25: v.number(),
      });

      type TWide = InferOutput<typeof wideSchema>;
      type TF8 = Expect<Equal<TWide["f8"], string[]>>;
      type TF16 = Expect<Equal<TWide["f16"], string | undefined>>;
      type TF17 = Expect<Equal<TWide["f17"], number | null>>;

      expect(typeof wideSchema.check).toBe("function");
    });
  });

  describe("Union Type Inference", () => {
    it("infers union branches correctly", () => {
      const u = v.union(v.string(), v.number(), v.boolean());
      type TUnion = Expect<Equal<InferOutput<typeof u>, string | number | boolean>>;

      expect(u.check("hello").ok).toBe(true);
      expect(u.check(123).ok).toBe(true);
      expect(u.check(true).ok).toBe(true);
    });
  });
});
