import { describe, expect, it } from 'vitest';
import { fakeOwnNumbers, OWN_NOT_IN } from '@/modules/messaging/numbers/own/own-numbers.fakes';
import { callsOf, chainDb } from '@/modules/messaging/reminders/chain-db.fake';
import { FollowUpsRepo } from './follow-ups.repo';

describe('FollowUpsQueries — the academy’s own numbers', () => {
  it('their old lead is never a follow-up candidate', async () => {
    const { db, log } = chainDb();
    await new FollowUpsRepo(db, fakeOwnNumbers()).candidates(2);
    expect(callsOf(log, 'leads')).toContainEqual(['not', ['phone_e164', 'in', OWN_NOT_IN]]);
  });
});
