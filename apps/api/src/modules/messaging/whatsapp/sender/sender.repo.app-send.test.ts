import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { notAppSending } from './sender.due';
import { SenderRepo } from './sender.repo';

// «أرسل عبر واتساب» (docs/19): while app_send_until is ahead the sender never reads nor claims
// the row; once it passed (no echo came back) the row is due again exactly as before the tap.

const M = 'messages';
const NOW = new Date('2026-11-06T10:00:00Z');
const PENDING = 'app_send_until.is.null,app_send_until.lte.2026-11-06T10:00:00.000Z';
const ors = (calls: { method: string; args: unknown[] }[]) =>
  calls.filter((c) => c.method === 'or').map((c) => c.args[0]);

/** The filter as Postgres applies it to one row's app_send_until. */
const passes = (until: string | null): boolean =>
  until === null || Date.parse(until) <= NOW.getTime();

describe('the sender and a pending «أرسل عبر واتساب»', () => {
  it('the filter: no window, or one that ended by now', () => {
    expect(notAppSending(NOW)).toBe(PENDING);
    expect(passes(null)).toBe(true);
    expect(passes('2026-11-06T10:09:59Z')).toBe(false);
    expect(passes('2026-11-06T09:59:00Z')).toBe(true);
  });

  it('due() never reads a row inside the window', async () => {
    const { db, calls } = fakeDb({ [M]: [{ data: [] }] });
    await new SenderRepo(db).due({ keys: [], now: NOW, limit: 50 });
    expect(ors(calls)).toContain(PENDING);
  });

  it('claim() is compare-and-set on it too: a tap between the read and the claim wins', async () => {
    const { db, calls } = fakeDb({ [M]: [{ data: [] }] });
    await expect(new SenderRepo(db).claim({ id: 'm1', attempts: 0, now: NOW })).resolves.toBeNull();
    expect(ors(calls)).toEqual([PENDING]);
  });

  it('after the window: read and claimed as before the tap', async () => {
    const later = new Date('2026-11-06T10:11:00Z');
    const { db, calls } = fakeDb({ [M]: [{ data: [{ id: 'm1' }] }] });
    await expect(new SenderRepo(db).claim({ id: 'm1', attempts: 0, now: later })).resolves.toBe(1);
    expect(ors(calls)).toEqual([notAppSending(later)]);
  });
});
