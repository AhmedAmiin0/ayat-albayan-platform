import { describe, expect, it, vi } from 'vitest';
import { ReopenCancel, type ManualBefore } from './reopen-cancel';
import type { ReopenCancelRepo } from './reopen-cancel.repo';

const PHONE = '+966500000001';
const held: ManualBefore = {
  id: 'm1',
  phone_e164: PHONE,
  status: 'queued',
  error_code: 'awaiting_reply',
};

function setup(others = false) {
  const repo = {
    othersHeld: vi.fn().mockResolvedValue(others),
    cancelQueued: vi.fn().mockResolvedValue(1),
  };
  return { repo, svc: new ReopenCancel(repo as unknown as ReopenCancelRepo) };
}

describe('ReopenCancel.afterManualSend', () => {
  it('a held text, no other held text for the family: the queued reopen is cancelled', async () => {
    const { repo, svc } = setup();
    await expect(svc.afterManualSend(held)).resolves.toEqual({ cancelled: 1 });
    expect(repo.othersHeld).toHaveBeenCalledWith(PHONE, 'm1');
    expect(repo.cancelQueued).toHaveBeenCalledWith(PHONE);
  });

  it('a window failure (reopen_failed, hold_expired) cancels too', async () => {
    for (const code of ['reopen_failed', 'hold_expired']) {
      const { repo, svc } = setup();
      await svc.afterManualSend({ ...held, status: 'failed', error_code: code });
      expect(repo.cancelQueued).toHaveBeenCalled();
    }
  });

  it('another text still waits for their reply: the reopen is kept', async () => {
    const { repo, svc } = setup(true);
    await expect(svc.afterManualSend(held)).resolves.toBe('kept');
    expect(repo.cancelQueued).not.toHaveBeenCalled();
  });

  it('not stopped by the window (a network failure, a plain queued row): nothing read or cancelled', async () => {
    const { repo, svc } = setup();
    await expect(svc.afterManualSend({ ...held, status: 'failed', error_code: 'network' })).resolves.toBe('none');
    await expect(svc.afterManualSend({ ...held, error_code: null })).resolves.toBe('none');
    expect(repo.othersHeld).not.toHaveBeenCalled();
  });

  it('never throws: the manual send already stands', async () => {
    const { repo, svc } = setup();
    repo.cancelQueued.mockRejectedValue(new Error('db down'));
    await expect(svc.afterManualSend(held)).resolves.toBe('kept');
  });
});
