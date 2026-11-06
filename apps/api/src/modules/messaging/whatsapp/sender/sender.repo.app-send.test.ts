import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { NOT_APP_SENT } from './sender.due';
import { SenderRepo } from './sender.repo';

// «أرسل عبر واتساب» (docs/19): a row with app_send_until set is never read nor claimed by the
// sender, during the window or after it: staff may have sent it from the app (edited, late,
// personal WhatsApp). The sweep fails it app_send_unconfirmed; only staff's answer moves it.

const M = 'messages';
const NOW = new Date('2026-11-06T10:00:00Z');
const ors = (calls: { method: string; args: unknown[] }[]) =>
  calls.filter((c) => c.method === 'or').map((c) => c.args[0]);

describe('the sender and a «أرسل عبر واتساب» row', () => {
  it('the filter: app_send_until unset only, whatever the time', () => {
    expect(NOT_APP_SENT).toBe('app_send_until.is.null');
  });

  it('due() never reads a row that had a tap', async () => {
    const { db, calls } = fakeDb({ [M]: [{ data: [] }] });
    await new SenderRepo(db).due({ keys: [], now: NOW, limit: 50 });
    expect(ors(calls)).toContain(NOT_APP_SENT);
  });

  it('claim() is compare-and-set on it too: a tap between the read and the claim wins', async () => {
    const { db, calls } = fakeDb({ [M]: [{ data: [] }] });
    await expect(new SenderRepo(db).claim({ id: 'm1', attempts: 0, now: NOW })).resolves.toBeNull();
    expect(ors(calls)).toEqual([NOT_APP_SENT]);
  });

  it('hours after the window: still the same filter (never auto-sent)', async () => {
    const later = new Date('2026-11-06T18:00:00Z');
    const { db, calls } = fakeDb({ [M]: [{ data: [{ id: 'm1' }] }] });
    await expect(new SenderRepo(db).claim({ id: 'm1', attempts: 0, now: later })).resolves.toBe(1);
    expect(ors(calls)).toEqual([NOT_APP_SENT]);
  });
});
