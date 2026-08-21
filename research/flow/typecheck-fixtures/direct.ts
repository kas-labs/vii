type Event = { readonly kind: "value"; readonly value: number } | { readonly kind: "clear" };

type Consumer<T> = (value: T) => void;
type Operator<Input, Output> = (consumer: Consumer<Output>) => Consumer<Input>;

function map<Input, Output>(project: (value: Input) => Output): Operator<Input, Output> {
  return (consumer) => (value) => consumer(project(value));
}

function filter<Value>(predicate: (value: Value) => boolean): Operator<Value, Value> {
  return (consumer) => (value) => {
    if (predicate(value)) {
      consumer(value);
    }
  };
}

function distinct<Value>(same: (left: Value, right: Value) => boolean): Operator<Value, Value> {
  return (consumer) => {
    let previous: Value | undefined;
    let hasPrevious = false;
    return (value) => {
      if (!hasPrevious || !same(previous as Value, value)) {
        hasPrevious = true;
        previous = value;
        consumer(value);
      }
    };
  };
}

function compose<Value>(
  operators: readonly Operator<Value, Value>[],
  consumer: Consumer<Value>,
): Consumer<Value> {
  return operators.reduceRight((next, operator) => operator(next), consumer);
}

export function createSmallPipeline(consumer: Consumer<number>): Consumer<Event> {
  const pipeline = compose<number>(
    [
      map<number, number>((value) => value),
      filter((value) => value % 2 === 0),
      distinct(Object.is),
    ],
    consumer,
  );
  return (event) => {
    if (event.kind === "value") {
      pipeline(event.value);
    }
  };
}

export function createDeepPipeline(consumer: Consumer<number>): Consumer<Event> {
  const pipeline = compose<number>(
    [
      map<number, number>((value) => value + 1),
      map((value) => value * 2),
      filter((value) => value > 0),
      map((value) => value - 1),
      map((value) => value / 2),
      filter<number>(Number.isFinite),
      map((value) => Math.trunc(value)),
      distinct(Object.is),
    ],
    consumer,
  );
  return (event) => {
    if (event.kind === "value") {
      pipeline(event.value);
    }
  };
}
