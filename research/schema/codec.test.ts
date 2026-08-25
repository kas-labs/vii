import { describe, expect, it } from "vitest";
import {
  bigIntFromString,
  dateFromISOString,
  jsonCodec,
  mapFromEntries,
  setFromArray,
  urlSearchParamsCodec,
  v,
} from "./index.js";

describe("S3: Codec & Serialization Semantics", () => {
  describe("DateFromISOString Codec", () => {
    const codec = dateFromISOString();

    it("losslessly decodes and encodes ISO date strings", () => {
      const iso = "2026-08-22T17:00:00.000Z";
      const decodeResult = codec.decode(iso);
      expect(decodeResult.ok).toBe(true);
      if (decodeResult.ok) {
        expect(decodeResult.value).toBeInstanceOf(Date);
        expect(decodeResult.value.toISOString()).toBe(iso);
        expect(codec.encode(decodeResult.value)).toBe(iso);
      }
    });

    it("rejects invalid date strings fail-closed", () => {
      const result = codec.decode("not-a-date");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues[0]!.code).toBe("invalid_date_format");
      }
    });
  });

  describe("BigIntFromString Codec", () => {
    const codec = bigIntFromString();

    it("losslessly decodes and encodes bigint strings", () => {
      const str = "9007199254740993"; // > MAX_SAFE_INTEGER
      const result = codec.decode(str);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(9007199254740993n);
        expect(codec.encode(result.value)).toBe(str);
      }
    });

    it("rejects non-bigint strings", () => {
      const result = codec.decode("3.1415");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues[0]!.code).toBe("invalid_bigint_format");
      }
    });
  });

  describe("JSONCodec", () => {
    const userSchema = v.object({
      id: v.string(),
      score: v.number().min(0),
    });
    const codec = jsonCodec(userSchema);

    it("decodes and encodes JSON payloads with schema verification", () => {
      const rawJson = '{"id":"usr_100","score":95}';
      const result = codec.decode(rawJson);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({ id: "usr_100", score: 95 });
        expect(codec.encode(result.value)).toBe(rawJson);
      }
    });

    it("rejects malformed JSON syntax", () => {
      const result = codec.decode("{ id: invalid }");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues[0]!.code).toBe("invalid_json_syntax");
      }
    });

    it("rejects valid JSON that fails schema validation", () => {
      const rawJson = '{"id":"usr_100","score":-5}';
      const result = codec.decode(rawJson);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues[0]!.code).toBe("number_too_small");
      }
    });
  });

  describe("Collection Codecs: Map and Set", () => {
    it("round-trips Map from entries array", () => {
      const codec = mapFromEntries(v.string(), v.number());
      const entries: Array<[string, number]> = [
        ["alpha", 1],
        ["beta", 2],
      ];

      const result = codec.decode(entries);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.get("alpha")).toBe(1);
        expect(result.value.get("beta")).toBe(2);
        expect(codec.encode(result.value)).toEqual(entries);
      }
    });

    it("round-trips Set from array", () => {
      const codec = setFromArray(v.string());
      const items = ["react", "vue", "angular"];

      const result = codec.decode(items);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.has("vue")).toBe(true);
        expect(codec.encode(result.value)).toEqual(items);
      }
    });
  });

  describe("URLSearchParamsCodec", () => {
    const searchCodec = urlSearchParamsCodec({
      page: v.number().min(1),
      query: v.string(),
      tags: v.array(v.string()),
      isActive: v.boolean().optional(),
    });

    it("decodes and encodes query parameters with typed coercion", () => {
      const queryString = "page=3&query=typescript&tags=frontend&tags=state&isActive=true";
      const result = searchCodec.decode(queryString);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({
          page: 3,
          query: "typescript",
          tags: ["frontend", "state"],
          isActive: true,
        });

        const encoded = searchCodec.encode(result.value);
        expect(encoded.includes("page=3")).toBe(true);
        expect(encoded.includes("query=typescript")).toBe(true);
        expect(encoded.includes("tags=frontend")).toBe(true);
        expect(encoded.includes("tags=state")).toBe(true);
        expect(encoded.includes("isActive=true")).toBe(true);
      }
    });

    it("rejects invalid query parameter values", () => {
      const invalidQuery = "page=0&query=test"; // page < 1
      const result = searchCodec.decode(invalidQuery);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues[0]!.code).toBe("number_too_small");
      }
    });
  });
});

describe("Codec input-grammar hardening (audit regressions)", () => {
  it("bigIntFromString rejects empty and whitespace-only strings", () => {
    const codec = bigIntFromString();
    expect(codec.decode("").ok).toBe(false);
    expect(codec.decode("  \n ").ok).toBe(false);
  });

  it("bigIntFromString rejects hex, octal, and binary radix prefixes", () => {
    const codec = bigIntFromString();
    expect(codec.decode("0x1f").ok).toBe(false);
    expect(codec.decode("0o17").ok).toBe(false);
    expect(codec.decode("0b101").ok).toBe(false);
  });

  it("bigIntFromString still accepts signed decimal integers", () => {
    const codec = bigIntFromString();
    const res = codec.decode("-9007199254740993");
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value).toBe(-9007199254740993n);
  });

  it("dateFromISOString rejects non-ISO formats that Date.parse would accept", () => {
    const codec = dateFromISOString();
    expect(codec.decode("Jan 1, 2020").ok).toBe(false);
    expect(codec.decode("Thu Jan 01 1970").ok).toBe(false);
    expect(codec.decode("12/31/2020").ok).toBe(false);
  });

  it("dateFromISOString accepts date-only and full ISO timestamps", () => {
    const codec = dateFromISOString();
    expect(codec.decode("2020-06-15").ok).toBe(true);
    expect(codec.decode("2020-06-15T10:30:00.123Z").ok).toBe(true);
    expect(codec.decode("2020-06-15T10:30:00+02:00").ok).toBe(true);
  });

  it("urlSearchParamsCodec rejects present-but-empty numeric params instead of coercing to 0", () => {
    const codec = urlSearchParamsCodec({ limit: v.number() });
    expect(codec.decode("limit=").ok).toBe(false);
    const explicit = codec.decode("limit=0");
    expect(explicit.ok).toBe(true);
    if (explicit.ok) expect(explicit.value.limit).toBe(0);
  });
});
