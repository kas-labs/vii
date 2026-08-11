import { batch, state } from "@vii/core";
import { createElement, StrictMode, useEffect, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { expect, expectTypeOf, test, vi } from "vitest";
import { useVii } from "../src/index.js";

const reactTestGlobal = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

reactTestGlobal.IS_REACT_ACT_ENVIRONMENT = true;

test("useVii reads and updates a Core State value", () => {
  const source = state(0);
  const rendered: number[] = [];
  const renderer = render(
    createElement(CountView, { source, onRender: (value) => rendered.push(value) }),
  );

  act(() => source.set(1));

  expect(rendered).toEqual([0, 1]);
  renderer.unmount();
});

test("useVii applies selector equality before React rerenders", () => {
  const source = state({ count: 0 });
  const rendered: number[] = [];
  const renderer = render(
    createElement(ParityView, { source, onRender: (value) => rendered.push(value) }),
  );

  act(() => source.set({ count: 2 }));
  expect(rendered).toEqual([0]);

  act(() => source.set({ count: 3 }));
  expect(rendered).toEqual([0, 1]);
  renderer.unmount();
});

test("useVii preserves Core batch propagation", () => {
  const source = state(0);
  const rendered: number[] = [];
  const renderer = render(
    createElement(CountView, { source, onRender: (value) => rendered.push(value) }),
  );

  act(() => {
    batch(() => {
      source.set(1);
      source.set(2);
    });
  });

  expect(rendered).toEqual([0, 2]);
  renderer.unmount();
});

test("useVii cleans the external subscription on Strict Mode unmount", () => {
  const source = state(0);
  const rendered = vi.fn();
  const renderer = render(
    createElement(StrictMode, null, createElement(CountView, { source, onRender: rendered })),
  );
  const renderCountBeforeUnmount = rendered.mock.calls.length;

  renderer.unmount();
  act(() => source.set(1));

  expect(rendered).toHaveBeenCalledTimes(renderCountBeforeUnmount);
});

test("useVii supplies the Core snapshot for server rendering", () => {
  const source = state(2);
  const markup = renderToStaticMarkup(createElement(CountView, { source, onRender: () => {} }));

  expect(markup).toContain('data-value="2"');
});

test("useVii preserves public type inference", () => {
  function TypeProbe() {
    const source = state({ count: 0 });
    const snapshot = useVii(source);
    const selected = useVii(source, (value) => value.count);

    expectTypeOf(snapshot).toEqualTypeOf<{ count: number }>();
    expectTypeOf(selected).toEqualTypeOf<number>();
    return null;
  }

  expect(TypeProbe).toBeTypeOf("function");
});

function CountView({ source, onRender }: CountViewProps): ReactElement {
  const value = useVii(source);
  useEffect(() => {
    onRender(value);
  }, [onRender, value]);
  return createElement("span", { "data-value": value }, value);
}

function ParityView({ source, onRender }: ParityViewProps): ReactElement {
  const value = useVii(source, (current) => current.count % 2, Object.is);
  useEffect(() => {
    onRender(value);
  }, [onRender, value]);
  return createElement("span", { "data-value": value }, value);
}

function render(element: ReactElement): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(element);
  });
  return renderer;
}

interface CountViewProps {
  source: ReturnType<typeof state<number>>;
  onRender: (value: number) => void;
}

interface ParityViewProps {
  source: ReturnType<typeof state<{ count: number }>>;
  onRender: (value: number) => void;
}
