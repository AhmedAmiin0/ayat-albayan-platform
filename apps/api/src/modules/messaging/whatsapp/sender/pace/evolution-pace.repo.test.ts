import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { deferFilter, EvolutionPaceRepo } from './evolution-pace.repo';

// Review fix 7 and final review 1: the paced row and its siblings leaving from THIS Evolution
// number move together; a template row (Kapso / Meta / CRM renewal or reminder) or a row of
// another number to the same phone is never moved.

const AT = new Date('2026-11-06T10:00:03.000Z');
const ISO = AT.toISOString();
const BEFORE = `or(next_attempt_at.is.null,next_attempt_at.lt.${ISO})`;
const input = { id: 'm1', numberId: 'evo-1', phone: '+966500000001', at: AT, defaultLine: null };

describe('EvolutionPaceRepo.deferRecipient', () => {
  it('a number that is no default moves only the row and rows stamped with it', () => {
    expect(deferFilter(input, ISO)).toBe(`id.eq.m1,and(number_id.eq.evo-1,${BEFORE})`);
    expect(deferFilter(input, ISO)).not.toContain('number_id.is.null');
  });

  it('a default number also moves its line\'s unstamped session texts, never a template row', () => {
    const chat = deferFilter({ ...input, defaultLine: 'chat' }, ISO);
    const unstamped = `and(number_id.is.null,template_key.is.null,line.eq.chat,${BEFORE})`;
    expect(chat).toBe(`id.eq.m1,and(number_id.eq.evo-1,${BEFORE}),${unstamped}`);
    const notif = deferFilter({ ...input, defaultLine: 'notifications' }, ISO);
    expect(notif).toContain('template_key.is.null,or(line.is.null,line.eq.notifications)');
  });

  it('one write, for the recipient\'s queued outbound rows only', async () => {
    const { db, calls } = fakeDb({ messages: [{}] });
    await new EvolutionPaceRepo(db).deferRecipient(input);
    expect(calls.find((c) => c.method === 'update')?.args[0]).toEqual({ next_attempt_at: ISO });
    const eq = calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eq).toEqual([['phone_e164', input.phone], ['direction', 'outbound'], ['status', 'queued']]);
  });
});

describe('EvolutionPaceRepo.heldUntil', () => {
  const held = { numberId: 'evo-1', phone: '+966500000001', defaultLine: null };
  const now = new Date('2026-11-06T10:00:00.000Z');

  it('reads the latest later time of an OLDER queued row on this number', async () => {
    const later = '2026-11-06T10:05:00.000Z';
    const { db, argsOf } = fakeDb({ messages: [{ data: [{ next_attempt_at: later }] }] });
    const repo = new EvolutionPaceRepo(db);
    const at = await repo.heldUntil({ ...held, createdAt: '2026-11-06T09:00:00Z', now });
    expect(at).toEqual(new Date(later));
    expect(argsOf('messages', 'gt')).toEqual(['next_attempt_at', now.toISOString()]);
    expect(argsOf('messages', 'lt')).toEqual(['created_at', '2026-11-06T09:00:00Z']);
    expect(argsOf('messages', 'or')).toEqual(['and(number_id.eq.evo-1)']);
  });

  it('none held: null', async () => {
    const { db } = fakeDb({ messages: [{ data: [] }] });
    const repo = new EvolutionPaceRepo(db);
    expect(await repo.heldUntil({ ...held, createdAt: null, now })).toBeNull();
  });
});
