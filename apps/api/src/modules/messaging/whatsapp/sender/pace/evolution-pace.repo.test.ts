import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { deferFilter, EvolutionPaceRepo } from './evolution-pace.repo';

// Review fix 7 (and its review): number_id is stamped only at claim, so the paced row and its
// unclaimed siblings (number_id null) must move too, not only rows already on the number.

const AT = new Date('2026-11-06T10:00:03.000Z');
const input = { id: 'm1', numberId: 'evo-1', phone: '+966500000001', at: AT };

describe('EvolutionPaceRepo.deferRecipient', () => {
  it('moves the row itself, and siblings on this number or on none yet, due before the slot', () => {
    const iso = AT.toISOString();
    const before = `or(next_attempt_at.is.null,next_attempt_at.lt.${iso})`;
    expect(deferFilter(input, iso)).toBe(
      `id.eq.m1,and(number_id.eq.evo-1,${before}),and(number_id.is.null,${before})`,
    );
  });

  it('one write, for the recipient\'s queued outbound rows only', async () => {
    const { db, calls } = fakeDb({ messages: [{}] });
    await new EvolutionPaceRepo(db).deferRecipient(input);
    expect(calls.find((c) => c.method === 'update')?.args[0]).toEqual({ next_attempt_at: AT.toISOString() });
    const eq = calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eq).toEqual([['phone_e164', input.phone], ['direction', 'outbound'], ['status', 'queued']]);
  });
});
