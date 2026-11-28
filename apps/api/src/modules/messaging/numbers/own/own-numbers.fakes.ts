// Test fakes (not shipped behaviour): OwnNumbers answering with a fixed set of example numbers.
import { OwnNumbers } from './own-numbers';
import type { OwnTrafficRepo } from './own-traffic.repo';
import type { NumbersRepo } from '@/modules/messaging/numbers/numbers.repo';

const OWN_PHONE = '+966500000009';
export const OWN_NOT_IN = `("${OWN_PHONE}")`;

/** A real OwnNumbers whose set is `phones` (no env, no database). */
export function fakeOwnNumbers(phones: readonly string[] = [OWN_PHONE]): OwnNumbers {
  const repo = { all: async () => [] } as unknown as NumbersRepo;
  const own = new OwnNumbers(repo, {} as OwnTrafficRepo);
  Object.assign(own, { phones: async () => new Set(phones) });
  return own;
}
