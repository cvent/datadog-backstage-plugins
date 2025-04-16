import type { HumanDuration } from '@backstage/types';

import { promiseDelay } from './promiseDelay';

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
  for (let index = 0; index < items.length; index += count) {
    yield* method(items.slice(index, index + count));

    if (interval && index + count < items.length) {
      await promiseDelay(interval);
    }
  }
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
