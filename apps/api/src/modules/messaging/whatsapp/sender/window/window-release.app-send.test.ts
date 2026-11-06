import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { reopenOf, windowFakes } from './window.fakes';
import { WindowRepo } from './window.repo';

// «أرسل عبر واتساب» (docs/19): a family reply never releases a text that had a tap (the release
// never reads it, even after the window: AppSendExpiry fails it app_send_unconfirmed first).

const NOW = new Date('2026-11-06T10:00:00Z');
const A = '+966500000001';

describe('WindowRepo.waiting — an app-sent row is never read', () => {
  it('the page carries the app_send_until filter', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [] }] });
    await new WindowRepo(db).waiting(null);
    const ors = calls.filter((c) => c.method === 'or').map((c) => c.args[0]);
    expect(ors).toEqual(['app_send_until.is.null']);
  });
});

describe('WindowRelease and the app-send expiry', () => {
  it('the expiry runs first, then the release reads (a held text with no tap)', async () => {
    const f = windowFakes();
    const held = {
      id: 'h1',
      phone_e164: A,
      created_at: '2026-11-05T09:00:00Z',
      scheduled_for: '2026-11-05T09:00:00Z',
      expires_at: '2026-11-12T09:00:00Z',
    };
    f.repo.waiting.mockResolvedValue([held] as never);
    f.repo.reopens.mockResolvedValue([reopenOf({ phone_e164: A, status: 'sent' })]);
    f.repo.lastChatInbound.mockResolvedValue(new Map([[A, '2026-11-06T09:55:00Z']]));
    await expect(f.release.run(NOW)).resolves.toBe(1);
    expect(f.expiry.run).toHaveBeenCalledWith(NOW);
    expect(f.repo.waiting).toHaveBeenCalledWith(null);
    expect(f.repo.release).toHaveBeenCalledWith(['h1']);
  });

  it('the expiry failed: nothing is released this pass, never throws', async () => {
    const f = windowFakes();
    f.expiry.run.mockRejectedValue(new Error('db down'));
    await expect(f.release.run(NOW)).resolves.toBe(0);
    expect(f.repo.waiting).not.toHaveBeenCalled();
    expect(f.repo.release).not.toHaveBeenCalled();
  });
});

describe('WindowRepo writes: a tap racing them keeps the row held (docs/19)', () => {
  const orsOf = (calls: { method: string; args: unknown[] }[]) =>
    calls.filter((c) => c.method === 'or').map((c) => c.args[0]);

  it('release is compare-and-set on no app_send_until, as SenderRepo.claim', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [] }] });
    await new WindowRepo(db).release(['h1']);
    expect(orsOf(calls)).toEqual(['app_send_until.is.null']);
  });

  it('fail never fails a row tapped meanwhile', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: null }] });
    const why = { code: 'reopen_failed', text: 'x', from: 'awaiting_reply' };
    await new WindowRepo(db).fail(['h1'], why);
    expect(orsOf(calls)).toEqual(['app_send_until.is.null']);
  });
});
