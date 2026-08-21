import { Observable, Subject } from "rxjs";
import { distinctUntilChanged, filter, map } from "rxjs/operators";

type Event = { readonly kind: "value"; readonly value: number } | { readonly kind: "clear" };

export function createSmallPipeline(): Observable<number> {
  return new Subject<Event>().pipe(
    filter(
      (event): event is { readonly kind: "value"; readonly value: number } =>
        event.kind === "value",
    ),
    map((event) => event.value),
    filter((value) => value % 2 === 0),
    distinctUntilChanged(),
  );
}

export function createDeepPipeline(): Observable<number> {
  return new Subject<Event>().pipe(
    filter(
      (event): event is { readonly kind: "value"; readonly value: number } =>
        event.kind === "value",
    ),
    map((event) => event.value + 1),
    map((value) => value * 2),
    filter((value) => value > 0),
    map((value) => value - 1),
    map((value) => value / 2),
    filter((value): value is number => Number.isFinite(value)),
    map((value) => Math.trunc(value)),
    distinctUntilChanged(),
  );
}
