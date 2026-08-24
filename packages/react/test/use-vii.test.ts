import { batch, state, type ReadableState } from "@vii-labs/core";
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

test("useVii with inline selector returning new object does not infinite loop and bounds render count", () => {
  const source = state({ count: 0 });
  let renderCount = 0;
  let subscribeCount = 0;
  let unsubscribeCount = 0;

  const wrappedStore: ReadableState<{ count: number }> = {
    get: () => source.get(),
    subscribe: (listener) => {
      subscribeCount += 1;
      const unsubscribe = source.subscribe(listener);
      return () => {
        unsubscribeCount += 1;
        unsubscribe();
      };
    },
  };

  function InlineObjectView() {
    renderCount += 1;
    const selected = useVii(wrappedStore, (s) => ({ count: s.count }));
    return createElement("span", { "data-value": selected.count }, selected.count);
  }

  const renderer = render(createElement(InlineObjectView));

  expect(renderCount).toBe(1);
  expect(subscribeCount).toBe(1);

  act(() => source.set({ count: 1 }));
  expect(renderCount).toBe(2);

  act(() => source.set({ count: 2 }));
  expect(renderCount).toBe(3);
  expect(subscribeCount).toBe(1);

  act(() => {
    renderer.unmount();
  });
  expect(unsubscribeCount).toBe(1);
});

test("useVii with inline selector renders new selected values on store updates", () => {
  const source = state({ user: { name: "Alice" } });
  const rendered: string[] = [];

  function UserView() {
    const name = useVii(source, (s) => s.user.name);
    useEffect(() => {
      rendered.push(name);
    }, [name]);
    return createElement("span", null, name);
  }

  const renderer = render(createElement(UserView));

  act(() => source.set({ user: { name: "Bob" } }));
  act(() => source.set({ user: { name: "Charlie" } }));

  expect(rendered).toEqual(["Alice", "Bob", "Charlie"]);
  act(() => {
    renderer.unmount();
  });
});

test("useVii recomputes and renders new selected value when selector changes with props", () => {
  const source = state({ items: ["first", "second", "third"] });
  const rendered: string[] = [];

  function ItemView({ index }: { index: number }) {
    const item = useVii(source, (s) => s.items[index] ?? "");
    useEffect(() => {
      rendered.push(item);
    }, [item]);
    return createElement("span", null, item);
  }

  const renderer = render(createElement(ItemView, { index: 0 }));
  expect(rendered).toEqual(["first"]);

  act(() => {
    renderer.update(createElement(ItemView, { index: 1 }));
  });
  expect(rendered).toEqual(["first", "second"]);

  act(() => {
    renderer.update(createElement(ItemView, { index: 2 }));
  });
  expect(rendered).toEqual(["first", "second", "third"]);

  act(() => {
    renderer.unmount();
  });
});

test("useVii with inline equality function suppresses re-renders for unchanged selections", () => {
  const source = state({ count: 0, text: "initial" });
  let renderCount = 0;

  function StaticSelectionView() {
    renderCount += 1;
    const count = useVii(
      source,
      (s) => s.count,
      (prev, next) => prev === next,
    );
    return createElement("span", null, count);
  }

  const renderer = render(createElement(StaticSelectionView));
  expect(renderCount).toBe(1);

  act(() => source.set({ count: 0, text: "updated" }));
  expect(renderCount).toBe(1);

  act(() => source.set({ count: 1, text: "updated again" }));
  expect(renderCount).toBe(2);

  act(() => {
    renderer.unmount();
  });
});

test("unrelated parent re-renders do not resubscribe to store", () => {
  const source = state(0);
  let subscribeCount = 0;

  const wrappedStore: ReadableState<number> = {
    get: () => source.get(),
    subscribe: (listener) => {
      subscribeCount += 1;
      return source.subscribe(listener);
    },
  };

  function Child() {
    const value = useVii(wrappedStore, (v) => v);
    return createElement("span", null, value);
  }

  function Parent({ tick }: { tick: number }) {
    return createElement("div", { "data-tick": tick }, createElement(Child));
  }

  const renderer = render(createElement(Parent, { tick: 1 }));
  expect(subscribeCount).toBe(1);

  act(() => {
    renderer.update(createElement(Parent, { tick: 2 }));
  });
  expect(subscribeCount).toBe(1);

  act(() => {
    renderer.update(createElement(Parent, { tick: 3 }));
  });
  expect(subscribeCount).toBe(1);

  act(() => {
    renderer.unmount();
  });
});

test("unmount unsubscribes exactly once", () => {
  const source = state(0);
  let subscribeCount = 0;
  let unsubscribeCount = 0;

  const wrappedStore: ReadableState<number> = {
    get: () => source.get(),
    subscribe: (listener) => {
      subscribeCount += 1;
      const unsubscribe = source.subscribe(listener);
      return () => {
        unsubscribeCount += 1;
        unsubscribe();
      };
    },
  };

  function View() {
    const value = useVii<number, { v: number }>(wrappedStore, (v) => ({ v }));
    return createElement("span", null, value.v);
  }

  const renderer = render(createElement(View));
  expect(subscribeCount).toBe(1);
  expect(unsubscribeCount).toBe(0);

  act(() => {
    renderer.unmount();
  });
  expect(unsubscribeCount).toBe(1);
});

test("StrictMode double-invocation does not produce duplicate live subscriptions", () => {
  const source = state(0);
  let liveSubscriptions = 0;

  const wrappedStore: ReadableState<number> = {
    get: () => source.get(),
    subscribe: (listener) => {
      liveSubscriptions += 1;
      const unsubscribe = source.subscribe(listener);
      return () => {
        liveSubscriptions -= 1;
        unsubscribe();
      };
    },
  };

  function View() {
    const value = useVii(wrappedStore, (v) => v * 2);
    return createElement("span", null, value);
  }

  const renderer = render(createElement(StrictMode, null, createElement(View)));
  expect(liveSubscriptions).toBe(1);

  act(() => {
    renderer.unmount();
  });
  expect(liveSubscriptions).toBe(0);
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
