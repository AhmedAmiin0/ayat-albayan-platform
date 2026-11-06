import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { reopenOf, windowFakes } from './window.fakes';
import { WindowRepo } from './window.repo';

// «أرسل عبر واتساب» (docs/19): a family reply during the tap's window does not release the text
// (the release never reads it); once the window passed it is read, held with its own deadline.

const NOW = new Date('2026-11-06T10:00:00Z');
const A = '+966500000001';

describe('WindowRepo.waiting — a pending app send is not read', () => {
  it('the page carries the app_send_until filter at the pass time', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [] }] });
    await new WindowRepo(db).waiting(null, NOW);
    const ors = calls.filter((c) => c.method === 'or').map((c) => c.args[0]);
    expect(ors).toEqual(['app_send_until.is.null,app_send_until.lte.2026-11-06T10:00:00.000Z']);
  });
});

describe('WindowRelease after the window passed', () => {
  it('read with its original deadline and released on a reply as any held text', async () => {
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
    expect(f.repo.waiting).toHaveBeenCalledWith(null, NOW);
    expect(f.repo.release).toHaveBeenCalledWith(['h1']);
  });
});
