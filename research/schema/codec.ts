import { BaseSchema, type InferOutput, type Schema, type ValidationResult } from "./types.js";

export interface Codec<TEncoded, TDecoded> extends Schema<TEncoded, TDecoded> {
  readonly kind: "codec";
  decode(input: unknown, path?: readonly (string | number)[]): ValidationResult<TDecoded>;
  encode(value: TDecoded): TEncoded;
}

export class CustomCodec<TEncoded, TDecoded>
  extends BaseSchema<TEncoded, TDecoded>
  implements Codec<TEncoded, TDecoded>
{
  readonly kind = "codec";

  constructor(
    private readonly decodeFn: (
      input: unknown,
      path: readonly (string | number)[],
    ) => ValidationResult<TDecoded>,
    private readonly encodeFn: (value: TDecoded) => TEncoded,
  ) {
    super();
  }

  check(input: unknown, path: readonly (string | number)[] = []): ValidationResult<TDecoded> {
    return this.decode(input, path);
  }

  decode(input: unknown, path: readonly (string | number)[] = []): ValidationResult<TDecoded> {
    return this.decodeFn(input, path);
  }

  encode(value: TDecoded): TEncoded {
    return this.encodeFn(value);
  }
}

// Date-only or date-time with optional seconds, fractional seconds, and offset.
// Date.parse alone falls back to implementation-defined parsing ("Jan 1, 2020"
// parses on V8 but not everywhere), so the grammar is pinned before parsing.
const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

export function dateFromISOString(): Codec<string, Date> {
  return new CustomCodec<string, Date>(
    (input, path) => {
      if (typeof input !== "string") {
        return { ok: false, issues: [{ code: "invalid_type", expected: "string", path }] };
      }
      if (!ISO_8601_PATTERN.test(input)) {
        return {
          ok: false,
          issues: [{ code: "invalid_date_format", expected: "ISO-8601 date string", path }],
        };
      }
      const parsedTime = Date.parse(input);
      if (Number.isNaN(parsedTime)) {
        return {
          ok: false,
          issues: [{ code: "invalid_date_format", expected: "ISO-8601 date string", path }],
        };
      }
      return { ok: true, value: new Date(parsedTime) };
    },
    (date) => date.toISOString(),
  );
}

export function bigIntFromString(): Codec<string, bigint> {
  return new CustomCodec<string, bigint>(
    (input, path) => {
      if (typeof input !== "string") {
        return { ok: false, issues: [{ code: "invalid_type", expected: "string", path }] };
      }
      // BigInt() alone accepts ""/whitespace (as 0n) and 0x/0o/0b radix
      // prefixes; the codec contract is a decimal integer string.
      if (!/^[+-]?\d+$/.test(input)) {
        return {
          ok: false,
          issues: [{ code: "invalid_bigint_format", expected: "integer string", path }],
        };
      }
      try {
        const parsed = BigInt(input);
        return { ok: true, value: parsed };
      } catch {
        return {
          ok: false,
          issues: [{ code: "invalid_bigint_format", expected: "integer string", path }],
        };
      }
    },
    (val) => val.toString(),
  );
}

export function jsonCodec<T>(schema: Schema<any, T>): Codec<string, T> {
  return new CustomCodec<string, T>(
    (input, path) => {
      if (typeof input !== "string") {
        return { ok: false, issues: [{ code: "invalid_type", expected: "string", path }] };
      }
      let parsedRaw: unknown;
      try {
        parsedRaw = JSON.parse(input);
      } catch {
        return {
          ok: false,
          issues: [{ code: "invalid_json_syntax", expected: "valid JSON string", path }],
        };
      }
      return schema.check(parsedRaw, path);
    },
    (val) => JSON.stringify(val),
  );
}

export function mapFromEntries<K, V>(
  keySchema: Schema<any, K>,
  valueSchema: Schema<any, V>,
): Codec<Array<[K, V]>, Map<K, V>> {
  return new CustomCodec<Array<[K, V]>, Map<K, V>>(
    (input, path) => {
      if (!Array.isArray(input)) {
        return { ok: false, issues: [{ code: "invalid_type", expected: "array", path }] };
      }
      const map = new Map<K, V>();
      for (let i = 0; i < input.length; i++) {
        const entry = input[i];
        if (!Array.isArray(entry) || entry.length !== 2) {
          return {
            ok: false,
            issues: [{ code: "invalid_entry", expected: "tuple [key, value]", path: [...path, i] }],
          };
        }
        const keyRes = keySchema.check(entry[0], [...path, i, 0]);
        if (!keyRes.ok) return keyRes;
        const valRes = valueSchema.check(entry[1], [...path, i, 1]);
        if (!valRes.ok) return valRes;
        map.set(keyRes.value, valRes.value);
      }
      return { ok: true, value: map };
    },
    (map) => Array.from(map.entries()),
  );
}

export function setFromArray<T>(elementSchema: Schema<any, T>): Codec<Array<T>, Set<T>> {
  return new CustomCodec<Array<T>, Set<T>>(
    (input, path) => {
      if (!Array.isArray(input)) {
        return { ok: false, issues: [{ code: "invalid_type", expected: "array", path }] };
      }
      const set = new Set<T>();
      for (let i = 0; i < input.length; i++) {
        const res = elementSchema.check(input[i], [...path, i]);
        if (!res.ok) return res;
        set.add(res.value);
      }
      return { ok: true, value: set };
    },
    (set) => Array.from(set.values()),
  );
}

export function urlSearchParamsCodec<TShape extends Record<string, Schema<any, any>>>(
  shape: TShape,
): Codec<string, { [K in keyof TShape]: InferOutput<TShape[K]> }> {
  return new CustomCodec<string, { [K in keyof TShape]: InferOutput<TShape[K]> }>(
    (input, path) => {
      let params: URLSearchParams;
      if (typeof input === "string") {
        params = new URLSearchParams(input.startsWith("?") ? input.slice(1) : input);
      } else if (input instanceof URLSearchParams) {
        params = input;
      } else {
        return {
          ok: false,
          issues: [{ code: "invalid_type", expected: "string or URLSearchParams", path }],
        };
      }

      const rawRecord: Record<string, unknown> = {};
      for (const [key, schema] of Object.entries(shape)) {
        const allVals = params.getAll(key);
        const effectiveKind = getEffectiveKind(schema);
        if (allVals.length === 0) {
          rawRecord[key] = undefined;
        } else if (effectiveKind === "array") {
          rawRecord[key] = allVals;
        } else if (effectiveKind === "number") {
          // Number("") and Number("   ") are 0, which would make a
          // present-but-empty param ("?count=") indistinguishable from an
          // explicit "?count=0". Keep it as the raw string so the number
          // schema rejects it.
          const raw = allVals[0]!;
          const num = raw.trim() === "" ? Number.NaN : Number(raw);
          rawRecord[key] = Number.isNaN(num) ? raw : num;
        } else if (effectiveKind === "boolean") {
          rawRecord[key] =
            allVals[0] === "true" ? true : allVals[0] === "false" ? false : allVals[0];
        } else {
          rawRecord[key] = allVals[0];
        }
      }

      const issues: any[] = [];
      const output: Record<string, unknown> = {};
      for (const [key, schema] of Object.entries(shape)) {
        const res = schema.check(rawRecord[key], [...path, key]);
        if (!res.ok) {
          issues.push(...res.issues);
        } else if (res.value !== undefined) {
          output[key] = res.value;
        }
      }

      if (issues.length > 0) return { ok: false, issues };
      return { ok: true, value: output as any };
    },
    (obj: Record<string, any>) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null) continue;
        if (Array.isArray(v)) {
          for (const item of v) {
            params.append(k, String(item));
          }
        } else {
          params.set(k, String(v));
        }
      }
      return params.toString();
    },
  );
}

function getEffectiveKind(schema: Schema<any, any>): string {
  let cur: any = schema;
  while (cur && (cur.kind === "optional" || cur.kind === "nullable" || cur.kind === "refined")) {
    cur = cur.inner;
  }
  return cur?.kind ?? schema.kind;
}
