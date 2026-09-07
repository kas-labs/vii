import { test, expect } from "vitest";
import { createForm, createField, type FieldState } from "../../src/index.js";

type GroupShape = {
  a: FieldState<number, number>;
  b?: FieldState<number, number>;
};

test("parent disposal after unregister", () => {
  const root = createForm<GroupShape>({ fields: { a: createField({ initialValue: 1 }) } });

  const bNode = createField({ initialValue: 2 });
  root.register("b", bNode);
  root.unregister("b");

  // child should be disposed immediately
  expect(() => bNode.getValue()).toThrowError(/disposed/);

  // now dispose parent
  root.dispose();
  // should not throw and child disposal remains isolated
});

test("register fresh node under previously removed optional key result", () => {
  const root = createForm<GroupShape>({ fields: { a: createField({ initialValue: 1 }) } });

  const bNode1 = createField({ initialValue: 2 });
  root.register("b", bNode1);
  root.unregister("b");

  const bNode2 = createField({ initialValue: 3 });
  root.register("b", bNode2);

  expect(root.getValue()).toEqual({ a: 1, b: 3 });
});

test("re-register disposed node result", () => {
  const root = createForm<GroupShape>({ fields: { a: createField({ initialValue: 1 }) } });
  const bNode = createField({ initialValue: 2 });

  root.register("b", bNode);
  root.unregister("b");

  expect(() => root.register("b", bNode)).toThrowError(/disposed/);
});
