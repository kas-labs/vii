import { state } from "@vii/core";
import { useVii } from "@vii/react";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const count = state(2);

function Counter(): ReactElement {
  const value = useVii(count);
  return createElement("span", { "data-value": value }, value);
}

export const renderedMarkup = renderToStaticMarkup(createElement(Counter));
