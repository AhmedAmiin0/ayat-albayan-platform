import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { EVOLUTION_SEND_ERROR, EvolutionNumbersRepo } from './evolution-numbers.repo';

// Review fix 4: the auto-disable guard is evolution_enabled_at (set only when the number is
// enabled), never updated_at, so a state / sync / health write between the send and its ERROR
// no longer cancels it. Review fix 3: ERRORs are counted per number since a time.

const SENT = '2026-11-06T09:59:00Z';
const NOW = new Date('2026-11-06T10:00:00Z');

describe('EvolutionNumbersRepo', () => {
  it('a state write between the send and the ERROR does not stop the switch-off', async () => {
    const { db, calls } = fakeDb({ wa_numbers: [{}, { data: [{ id: 'n1' }] }] });
    // CONNECTION_UPDATE lands after the send (EvolutionStateRepo's write): it bumps updated_at
    // (trigger), never evolution_enabled_at (set only on the enabled off → on edge, migration 700).
    await db.from('wa_numbers').update({ evolution_state: 'open', evolution_state_at: NOW.toISOString() })
      .eq('id', 'n1');
    await expect(new EvolutionNumbersRepo(db).restrict('n1', { now: NOW, sentAt: SENT })).resolves.toBe(true);
    const lte = calls.filter((c) => c.method === 'lte').map((c) => c.args);
    expect(lte).toEqual([['evolution_enabled_at', SENT]]);
    expect(calls.some((c) => c.args[0] === 'updated_at')).toBe(false);
  });

  it('the error window is an enabled Evolution row\'s trip and enable time', async () => {
    const cfg = { limits: { gap_ms: 3000, daily_cap: 60, error_trip: 5 } };
    const { db, calls } = fakeDb({
      wa_numbers: [
        { data: { evolution_config: cfg, evolution_enabled_at: '2026-11-06T08:00:00Z' } },
        { data: null },
      ],
    });
    const repo = new EvolutionNumbersRepo(db);
    await expect(repo.errorWindow('n1')).resolves.toEqual({ trip: 5, enabledAt: '2026-11-06T08:00:00Z' });
    expect(calls.filter((c) => c.method === 'eq').map((c) => c.args)).toContainEqual(['enabled', true]);
    await expect(repo.errorWindow('n1')).resolves.toBeNull();
  });

  it('counts only this number\'s ERRORed sends since the given time', async () => {
    const { db, calls } = fakeDb({ messages: [{ count: 2 }] });
    const since = new Date('2026-11-06T09:45:00Z');
    await expect(new EvolutionNumbersRepo(db).countErrors('n1', since)).resolves.toBe(2);
    const eq = calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eq).toContainEqual(['error_code', EVOLUTION_SEND_ERROR]);
    expect(calls.find((c) => c.method === 'gte')?.args).toEqual(['sent_at', since.toISOString()]);
  });
});
