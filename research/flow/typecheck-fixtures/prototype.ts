import {
  createManualSource,
  distinct,
  filter,
  flow,
  map,
  type FlowSource,
} from "../flow-prototype.js";

type Event = { readonly kind: "value"; readonly value: number } | { readonly kind: "clear" };

export function createSmallPipeline(): FlowSource<number> {
  const source = createManualSource<Event>();
  return distinct<number>()(
    filter<number>((value) => value % 2 === 0)(
      map<Event, number>((event) => (event.kind === "value" ? event.value : 0))(source.source),
    ),
  );
}

export function createDeepPipeline(): FlowSource<number> {
  const source = createManualSource<Event>();
  return flow(source.source)
    .map((event) => (event.kind === "value" ? event.value + 1 : 0))
    .map((value) => value * 2)
    .filter((value) => value > 0)
    .map((value) => value - 1)
    .map((value) => value / 2)
    .filter(Number.isFinite)
    .map((value) => Math.trunc(value))
    .distinct().source;
}
