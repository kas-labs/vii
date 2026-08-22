import {
  boolean,
  literal,
  nullSchema,
  number,
  string,
  undefinedSchema,
  unknown,
} from "./primitives.js";
import { array, object, union } from "./structures.js";

export * from "./codec.js";
export * from "./issues.js";
export * from "./primitives.js";
export * from "./security.js";
export * from "./standard-schema.js";
export * from "./structures.js";
export * from "./types.js";

export const v = {
  string,
  number,
  boolean,
  literal,
  null: nullSchema,
  undefined: undefinedSchema,
  unknown,
  object,
  array,
  union,
};
