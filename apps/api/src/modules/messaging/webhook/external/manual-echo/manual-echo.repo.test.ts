import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { ManualEchoRepo } from './manual-echo.repo';
import { row } from './manual-echo.fixtures.test-util';

const W = {
  row: row({ lead_id: 'lead-1' }),
  waMessageId: 'wamid.APP1',
  patch: { status: 'sent' as const, sent_at: '2026-11-06T10:05:00.000Z' },
};
const recorded = (calls: { method: string; args: unknown[] }[]) =>
  calls.map((c) => [c.method, ...c.args]);

describe('ManualEchoRepo', () => {
  it('candidates: the phone, staff outbound, no wamid, a window in the span', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [] }] });
    const span = { since: new Date('2026-11-06T10:00:00Z'), until: new Date('2026-11-06T10:20:00Z') };
    await new ManualEchoRepo(db).candidates('+966500000001', span);
    expect(recorded(calls)).toEqual(
      expect.arrayContaining([
        ['eq', 'phone_e164', '+966500000001'],
        ['eq', 'direction', 'outbound'],
        ['not', 'created_by', 'is', null],
        ['is', 'wa_message_id', null],
        ['gte', 'app_send_until', '2026-11-06T10:00:00.000Z'],
        ['lte', 'app_send_until', '2026-11-06T10:20:00.000Z'],
      ]),
    );
  });

  it('attach: wamid and status set, window and hold cleared, compare-and-set', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [{ id: 'm1' }] }], leads: [{}] });
    await expect(new ManualEchoRepo(db).attach(W)).resolves.toBe(true);
    const sets = recorded(calls);
    expect(sets).toContainEqual([
      'update',
      expect.objectContaining({
        wa_message_id: 'wamid.APP1',
        status: 'sent',
        sent_at: '2026-11-06T10:05:00.000Z',
        app_send_until: null,
        error_code: null,
        expires_at: null,
        next_attempt_at: null,
        sent_manually_at: expect.any(String),
      }),
    ]);
    expect(sets).toContainEqual(['is', 'wa_message_id', null]);
    expect(sets).toContainEqual(['not', 'app_send_until', 'is', null]);
    expect(sets).toContainEqual(['in', 'status', ['queued', 'failed', 'sent_manually']]);
    expect(sets).toContainEqual(['or', 'error_code.is.null,error_code.neq.sending']);
    expect(sets.some((s) => s[0] === 'eq' && s[1] === 'wa_message_id')).toBe(false);
    expect(sets).toContainEqual(['update', { last_outbound_at: '2026-11-06T10:05:00.000Z' }]);
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
