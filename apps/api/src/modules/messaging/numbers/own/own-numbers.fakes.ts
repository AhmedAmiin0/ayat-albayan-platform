// Test fakes (not shipped behaviour): OwnNumbers answering with a fixed set of example numbers.
import { OwnNumbers } from './own-numbers';
import type { Db } from '../../../../common/db/db.module';
import type { NumbersQueries } from '../numbers.queries';

const OWN_PHONE = '+966500000009';
export const OWN_NOT_IN = `("${OWN_PHONE}")`;

/** A real OwnNumbers whose set is `phones` (no env, no database). */
export function fakeOwnNumbers(phones: readonly string[] = [OWN_PHONE]): OwnNumbers {
  const own = new OwnNumbers({ all: async () => [] } as unknown as NumbersQueries, {} as Db);
  Object.assign(own, { phones: async () => new Set(phones) });
  return own;
}
