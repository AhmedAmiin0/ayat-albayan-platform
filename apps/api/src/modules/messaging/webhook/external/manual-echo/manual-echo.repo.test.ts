import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { ManualEchoRepo } from './manual-echo.repo';

const W = { id: 'm1', waMessageId: 'wamid.APP1', at: new Date('2026-11-06T10:20:00Z') };

describe('ManualEchoRepo', () => {
  it('candidates: the phone, outbound sent_manually, no wamid, marked within the span', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [] }] });
    const span = { since: new Date('2026-11-06T09:50:00Z'), until: new Date('2026-11-06T10:22:00Z') };
    await new ManualEchoRepo(db).candidates('+966500000001', span);
    const filters = calls.filter((c) => c.method !== 'select').map((c) => [c.method, ...c.args]);
    expect(filters).toEqual(
      expect.arrayContaining([
        ['eq', 'phone_e164', '+966500000001'],
        ['eq', 'direction', 'outbound'],
        ['eq', 'status', 'sent_manually'],
        ['is', 'wa_message_id', null],
        ['gte', 'sent_manually_at', '2026-11-06T09:50:00.000Z'],
        ['lte', 'sent_manually_at', '2026-11-06T10:22:00.000Z'],
      ]),
    );
  });

  it('attach: compare-and-set on still sent_manually with no wamid', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [{ id: 'm1' }] }] });
    await expect(new ManualEchoRepo(db).attach(W)).resolves.toBe(true);
    const sets = calls.map((c) => [c.method, ...c.args]);
    expect(sets).toContainEqual(['update', { wa_message_id: 'wamid.APP1', sent_at: '2026-11-06T10:20:00.000Z' }]);
    expect(sets).toContainEqual(['eq', 'status', 'sent_manually']);
    expect(sets).toContainEqual(['is', 'wa_message_id', null]);
  });

  it('attach: lost the race (no row) or the wamid is already stored: false', async () => {
    const lost = fakeDb({ messages: [{ data: [] }] });
    await expect(new ManualEchoRepo(lost.db).attach(W)).resolves.toBe(false);
    const dup = fakeDb({ messages: [{ error: { code: '23505', message: 'duplicate key' } }] });
    await expect(new ManualEchoRepo(dup.db).attach(W)).resolves.toBe(false);
  });

  it('attach: any other database error throws', async () => {
    const { db } = fakeDb({ messages: [{ error: { message: 'boom' } }] });
    await expect(new ManualEchoRepo(db).attach(W)).rejects.toThrow('boom');
  });
});
