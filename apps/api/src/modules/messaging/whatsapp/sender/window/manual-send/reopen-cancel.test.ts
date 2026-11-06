import { describe, expect, it, vi } from 'vitest';
import { ReopenCancel, type SentRow } from './reopen-cancel';
import type { ReopenCancelRepo } from './reopen-cancel.repo';

const PHONE = '+966500000001';
const sent: SentRow = { id: 'm1', phone_e164: PHONE };
const KEY = `reopen:${PHONE}:2026-11-06`;

function setup(others = false) {
  const repo = {
    othersPending: vi.fn().mockResolvedValue(others),
    cancelQueued: vi.fn().mockResolvedValue(['r1']),
    restore: vi.fn().mockResolvedValue(1),
  };
  return { repo, svc: new ReopenCancel(repo as unknown as ReopenCancelRepo) };
}

describe('ReopenCancel.afterAttach (the app echo confirmed a held text)', () => {
  it('no other queued text for the family: every queued reopen of the phone is cancelled', async () => {
    const { repo, svc } = setup();
    await expect(svc.afterAttach(sent)).resolves.toEqual({ cancelled: 1 });
    expect(repo.othersPending).toHaveBeenCalledWith(PHONE, 'm1');
    expect(repo.cancelQueued).toHaveBeenCalledWith(PHONE, null);
  });

  it('race: a text queued between the read and the cancel gets the reopen back', async () => {
    const { repo, svc } = setup();
    repo.othersPending.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(svc.afterAttach(sent)).resolves.toBe('kept');
    expect(repo.restore).toHaveBeenCalledWith(['r1']);
  });

  it('nothing was queued to cancel (claimed or sent): no second read, no restore', async () => {
    const { repo, svc } = setup();
    repo.cancelQueued.mockResolvedValue([]);
    await expect(svc.afterAttach(sent)).resolves.toEqual({ cancelled: 0 });
    expect(repo.othersPending).toHaveBeenCalledOnce();
    expect(repo.restore).not.toHaveBeenCalled();
  });

  it('another message to the family is still queued: the reopen is kept', async () => {
    const { repo, svc } = setup(true);
    await expect(svc.afterAttach(sent)).resolves.toBe('kept');
    expect(repo.cancelQueued).not.toHaveBeenCalled();
  });

  it('never throws: the attach already stands', async () => {
    const { repo, svc } = setup();
    repo.cancelQueued.mockRejectedValue(new Error('db down'));
    await expect(svc.afterAttach(sent)).resolves.toBe('kept');
  });
});

describe('ReopenCancel.dropLost (a hold that missed after its reopen was queued)', () => {
  it('no queued text of the family at all: only that key is cancelled', async () => {
    const { repo, svc } = setup();
    await expect(svc.dropLost(PHONE, KEY)).resolves.toEqual({ cancelled: 1 });
    expect(repo.othersPending).toHaveBeenCalledWith(PHONE, null);
    expect(repo.cancelQueued).toHaveBeenCalledWith(PHONE, KEY);
  });

  it('a queued text remains (even the same row, held by another pass): kept', async () => {
    const { repo, svc } = setup(true);
    await expect(svc.dropLost(PHONE, KEY)).resolves.toBe('kept');
    expect(repo.cancelQueued).not.toHaveBeenCalled();
  });

  it('never throws', async () => {
    const { repo, svc } = setup();
    repo.othersPending.mockRejectedValue(new Error('db down'));
    await expect(svc.dropLost(PHONE, KEY)).resolves.toBe('kept');
  });
});
