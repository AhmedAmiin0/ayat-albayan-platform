import { describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import type { AppSendAdopt, HeldRow } from './app-send-adopt';
import { AppSendExpiry } from './app-send-expiry';
import { AppSendExpiryRepo, UNCONFIRMED_TEXT } from './app-send-expiry.repo';

// «أرسل عبر واتساب» with no echo attached (docs/19): after the window and its 15 min grace the
// row first adopts the app's message if it was stored as its own row; else it is failed
// app_send_unconfirmed, never sent by the platform, and staff answer «هل أرسلتها؟».

const NOW = new Date('2026-11-06T10:30:00Z');
const filters = (calls: { method: string; args: unknown[] }[]) =>
  calls.map((c) => [c.method, ...c.args]);
const OPEN = 'error_code.is.null,error_code.not.in.(sending,app_send_unconfirmed)';

describe('AppSendExpiryRepo', () => {
  it('settled: window + grace passed, no wamid, held or failed, not claimed', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [{ id: 'm1' }] }] });
    await expect(new AppSendExpiryRepo(db).settled(NOW)).resolves.toEqual([{ id: 'm1' }]);
    const f = filters(calls);
    expect(f).toContainEqual(['in', 'status', ['queued', 'failed']]);
    expect(f).toContainEqual(['is', 'wa_message_id', null]);
    expect(f).toContainEqual(['not', 'app_send_until', 'is', null]);
    expect(f).toContainEqual(['lte', 'app_send_until', '2026-11-06T10:15:00.000Z']);
    expect(f).toContainEqual(['or', OPEN]);
  });

  it('expire: the same compare-and-set on those ids; app_send_until kept', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [{ id: 'm1' }] }] });
    await expect(new AppSendExpiryRepo(db).expire(['m1'], NOW)).resolves.toEqual(['m1']);
    const f = filters(calls);
    const update = {
      status: 'failed',
      error_code: 'app_send_unconfirmed',
      error_text: UNCONFIRMED_TEXT,
      next_attempt_at: null,
    };
    expect(f).toContainEqual(['update', update]);
    expect(f).toContainEqual(['in', 'id', ['m1']]);
    expect(f).toContainEqual(['lte', 'app_send_until', '2026-11-06T10:15:00.000Z']);
    expect(f).toContainEqual(['or', OPEN]);
  });

  it('expire with no ids reads nothing; a write error throws', async () => {
    const { db, trips } = fakeDb({ messages: [{ error: { message: 'boom' } }] });
    await expect(new AppSendExpiryRepo(db).expire([], NOW)).resolves.toEqual([]);
    expect(trips).toEqual([]);
    await expect(new AppSendExpiryRepo(db).expire(['m1'], NOW)).rejects.toThrow('boom');
  });
});

const row = (id: string) => ({ id }) as HeldRow;

function setup(adopt: (r: HeldRow) => Promise<boolean>) {
  const repo = {
    settled: vi.fn(async () => [row('a'), row('b'), row('c')]),
    expire: vi.fn(async (ids: readonly string[]) => [...ids]),
  };
  const adopts = { adopt: vi.fn(adopt) };
  const svc = new AppSendExpiry(
    repo as unknown as AppSendExpiryRepo,
    adopts as unknown as AppSendAdopt,
  );
  return { svc, repo, adopts };
}

describe('AppSendExpiry.run', () => {
  it('adopted rows are not asked about; the rest become unconfirmed', async () => {
    const { svc, repo } = setup(async (r) => r.id === 'b');
    await expect(svc.run(NOW)).resolves.toBe(2);
    expect(repo.expire).toHaveBeenCalledWith(['a', 'c'], NOW);
  });

  it('an adopt error leaves that row for the next pass (still blocked)', async () => {
    const { svc, repo } = setup(async (r) => {
      if (r.id === 'a') throw new Error('rpc down');
      return false;
    });
    await svc.run(NOW);
    expect(repo.expire).toHaveBeenCalledWith(['b', 'c'], NOW);
  });
});
