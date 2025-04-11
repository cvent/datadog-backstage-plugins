import { durationToMilliseconds } from '@backstage/types';
import type { HumanDuration } from '@backstage/types';

export interface RateLimit {
  count: number;
  interval?: HumanDuration;
}

export function byChunkAsync<Items, ReturnType>(
  items: Items[],
  rate: RateLimit,
  method: (chunk: Items[]) => AsyncGenerator<ReturnType>,
) {
  return Array.fromAsync(byChunk(items, rate, method));
}

export async function* byChunk<Items, ReturnType>(
  items: Items[],
  { count, interval }: RateLimit,
  method: (chunk: Items[]) => AsyncGenerator<ReturnType>,
) {
  for (const [index] of items.entries()) {
    if (index % count === 0) {
      yield* method(items.slice(index, index + count));

      if (interval) {
        await promiseDelay(durationToMilliseconds(interval));
      }
    }
  }
}

function promiseDelay(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

type ValueType<Value> = Value extends boolean | null | undefined
  ? never
  : Value;

export function valueGuard<IncludeType, ItemReturn>(
  include: IncludeType,
  item: (inc: ValueType<IncludeType>) => ItemReturn,
  defaultValue: Partial<ItemReturn> = {},
) {
  return Boolean(include)
    ? item(include as ValueType<IncludeType>)
    : defaultValue;
}
