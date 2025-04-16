import type { HumanDuration } from '@backstage/types';
import { durationToMilliseconds } from '@backstage/types';

export function promiseDelay(interval: HumanDuration) {
  return new Promise(resolve =>
    setTimeout(resolve, durationToMilliseconds(interval)),
  );
}
