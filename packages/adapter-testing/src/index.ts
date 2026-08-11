import { describe, expect, test, vi } from "vitest";

export type Equality<T> = (previous: T, next: T) => boolean;

export interface AdapterReadable<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
}

export interface AdapterComplianceFixture<TState> {
  getSnapshot(): TState;
  subscribe(listener: () => void): () => void;
  select<TSelected>(
    selector: (state: TState) => TSelected,
    equality?: Equality<TSelected>,
  ): AdapterReadable<TSelected>;
  update(updater: (current: TState) => TState): void;
  batch(work: () => void): void;
  dispose(): void;
  getServerSnapshot?(): TState;
}

export interface AdapterComplianceScenario<TState, TSelected> {
  initial: TState;
  update: (current: TState) => TState;
  sameSelectionUpdate: (current: TState) => TState;
  select: (state: TState) => TSelected;
  equality: Equality<TSelected>;
}

export function defineAdapterComplianceSuite<TState, TSelected>(
  name: string,
  scenario: AdapterComplianceScenario<TState, TSelected>,
  createFixture: (initial: TState) => AdapterComplianceFixture<TState>,
): void {
  describe(`${name} adapter compliance`, () => {
    test("reads the current snapshot", () => {
      const fixture = createFixture(scenario.initial);

      expect(fixture.getSnapshot()).toEqual(scenario.initial);
      fixture.dispose();
    });

    test("delivers updates and exposes the new snapshot", () => {
      const fixture = createFixture(scenario.initial);
      const listener = vi.fn();

      fixture.subscribe(listener);
      fixture.update(scenario.update);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(fixture.getSnapshot()).toEqual(scenario.update(scenario.initial));
      fixture.dispose();
    });

    test("suppresses notifications for equal selected values", () => {
      const fixture = createFixture(scenario.initial);
      const selected = fixture.select(scenario.select, scenario.equality);
      const listener = vi.fn();

      selected.subscribe(listener);
      fixture.update(scenario.sameSelectionUpdate);

      expect(listener).not.toHaveBeenCalled();
      fixture.dispose();
    });

    test("preserves one notification boundary for nested batches", () => {
      const fixture = createFixture(scenario.initial);
      const listener = vi.fn();

      fixture.subscribe(listener);
      fixture.batch(() => {
        fixture.update(scenario.update);
        fixture.batch(() => fixture.update(scenario.update));
        expect(listener).not.toHaveBeenCalled();
      });

      expect(listener).toHaveBeenCalledTimes(1);
      fixture.dispose();
    });

    test("stops delivery after explicit unsubscribe", () => {
      const fixture = createFixture(scenario.initial);
      const listener = vi.fn();
      const unsubscribe = fixture.subscribe(listener);

      unsubscribe();
      unsubscribe();
      fixture.update(scenario.update);

      expect(listener).not.toHaveBeenCalled();
      fixture.dispose();
    });

    test("cleans active subscriptions when disposed", () => {
      const fixture = createFixture(scenario.initial);
      const listener = vi.fn();

      fixture.subscribe(listener);
      fixture.dispose();

      expect(() => fixture.getSnapshot()).toThrow();
      expect(() => fixture.subscribe(listener)).toThrow();
      expect(listener).not.toHaveBeenCalled();
    });

    test("creates isolated instances for parallel request factories", () => {
      const first = createFixture(scenario.initial);
      const second = createFixture(scenario.initial);

      first.update(scenario.update);

      expect(first.getSnapshot()).toEqual(scenario.update(scenario.initial));
      expect(second.getSnapshot()).toEqual(scenario.initial);
      first.dispose();
      second.dispose();
    });

    test("exposes a matching server snapshot when supported", () => {
      const fixture = createFixture(scenario.initial);

      if (fixture.getServerSnapshot !== undefined) {
        expect(fixture.getServerSnapshot()).toEqual(fixture.getSnapshot());
      }
      fixture.dispose();
    });
  });
}
