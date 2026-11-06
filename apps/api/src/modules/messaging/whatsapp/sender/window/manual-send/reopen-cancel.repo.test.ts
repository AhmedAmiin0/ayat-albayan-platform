import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { ReopenCancelRepo } from './reopen-cancel.repo';

const PHONE = '+966500000001';
const filters = (calls: { method: string; args: unknown[] }[]) =>
  calls.map((c) => [c.method, ...c.args]);

/** The compare-and-set as Postgres applies it: only queued, unclaimed reopen rows of the phone. */
interface Row {
  phone: string;
  dedup: string | null;
  status: string;
  code: string | null;
}
const cancels = (r: Row): boolean =>
  r.phone === PHONE &&
  (r.dedup?.startsWith(`reopen:${PHONE}:`) ?? false) &&
  r.status === 'queued' &&
  r.code !== 'sending';

describe('ReopenCancelRepo.cancelQueued', () => {
  it('one compare-and-set: queued, not claimed, the phone’s reopen keys → failed reopen_not_needed', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [{ id: 'r1' }] }] });
    await expect(new ReopenCancelRepo(db).cancelQueued(PHONE, null)).resolves.toEqual(['r1']);
    const f = filters(calls);
    expect(f).toContainEqual(['update', expect.objectContaining({ status: 'failed', error_code: 'reopen_not_needed' })]);
    expect(f).toContainEqual(['eq', 'status', 'queued']);
    expect(f).toContainEqual(['or', 'error_code.is.null,error_code.neq.sending']);
    expect(f).toContainEqual(['like', 'dedup_key', `reopen:${PHONE}:%`]);
    expect(f).toContainEqual(['eq', 'phone_e164', PHONE]);
  });

  it('race: a template the sender claimed (sending), sent or failed is never touched', () => {
    const rows: Row[] = [
      { phone: PHONE, dedup: `reopen:${PHONE}:2026-11-06`, status: 'queued', code: 'sending' },
      { phone: PHONE, dedup: `reopen:${PHONE}:2026-11-06:2`, status: 'sent', code: null },
      { phone: PHONE, dedup: `reopen:${PHONE}:2026-11-05`, status: 'failed', code: 'network' },
      { phone: '+966500000002', dedup: 'reopen:+966500000002:2026-11-06', status: 'queued', code: null },
      { phone: PHONE, dedup: null, status: 'queued', code: null },
    ];
    expect(rows.filter(cancels)).toEqual([]);
    expect(cancels({ phone: PHONE, dedup: `reopen:${PHONE}:2026-11-06`, status: 'queued', code: null })).toBe(true);
  });

  it('nothing left to cancel (claimed meanwhile): none, no error', async () => {
    const { db } = fakeDb({ messages: [{ data: [] }] });
    await expect(new ReopenCancelRepo(db).cancelQueued(PHONE, null)).resolves.toEqual([]);
  });
});

describe('ReopenCancelRepo.othersPending', () => {
  it('another queued TEXT of the phone held for the reply or claimed (never a template)', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [{ id: 'm2' }] }] });
    await expect(new ReopenCancelRepo(db).othersPending(PHONE, 'm1')).resolves.toBe(true);
    const f = filters(calls);
    expect(f).toContainEqual(['eq', 'status', 'queued']);
    expect(f).toContainEqual(['is', 'template_key', null]);
    expect(f).toContainEqual(['in', 'error_code', ['awaiting_reply', 'sending']]);
    expect(f).toContainEqual(['neq', 'id', 'm1']);
  });

  it('none: false', async () => {
    const { db } = fakeDb({ messages: [{ data: [] }] });
    await expect(new ReopenCancelRepo(db).othersPending(PHONE, 'm1')).resolves.toBe(false);
  });
});

describe('ReopenCancelRepo — a missed hold drops only its own reopen', () => {
  it('cancelQueued with a key: that dedup key only, still queued and not claimed', async () => {
    const key = `reopen:${PHONE}:2026-11-06:2`;
    const { db, calls } = fakeDb({ messages: [{ data: [{ id: 'r2' }] }] });
    await expect(new ReopenCancelRepo(db).cancelQueued(PHONE, key)).resolves.toEqual(['r2']);
    const f = filters(calls);
    expect(f).toContainEqual(['eq', 'dedup_key', key]);
    expect(f).toContainEqual(['eq', 'status', 'queued']);
  });

  it('othersPending with no row to skip: any held text of the phone counts', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [{ id: 'm1' }] }] });
    await expect(new ReopenCancelRepo(db).othersPending(PHONE, null)).resolves.toBe(true);
    expect(filters(calls).some((c) => c[0] === 'neq')).toBe(false);
  });
});

describe('ReopenCancelRepo.restore', () => {
  it('only rows still failed reopen_not_needed go back to queued', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [{ id: 'r1' }] }] });
    await expect(new ReopenCancelRepo(db).restore(['r1'])).resolves.toBe(1);
    const f = filters(calls);
    expect(f).toContainEqual(['eq', 'error_code', 'reopen_not_needed']);
    expect(f).toContainEqual(['update', { status: 'queued', error_code: null, error_text: null }]);
  });
});
