import { beforeEach, describe, expect, it } from 'vitest';
import { NOW, PHONE, reopenOf, STAFF, staffText, windowFakes } from './window.fakes';

// Owner 2026-11-07 (option 1): the starter template goes ONLY when a staff member presses send in
// a closed window; the message is held and released on the family's reply. Fakes only.

let f = windowFakes();
const at = (row = staffText()) => ({ row, now: NOW, line: 'chat' as const });
const DAY = `reopen:${PHONE}:2026-11-03`;

describe('a send in a closed window', () => {
  beforeEach(() => {
    f = windowFakes();
  });

  it('queues the starter once, holds the message, audits it under the sender', async () => {
    await expect(f.hold.due(at())).resolves.toBe('waiting');
    expect(f.repo.queueReopen).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ template_key: 'welcome_greeting', dedup_key: DAY, created_by: STAFF }),
    );
    expect(f.repo.hold).toHaveBeenCalledOnce();
    expect(f.audit.record).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ created_by: STAFF, dedup_key: DAY }),
      'reopen-1',
    );
  });

  it('a second send the same day: no second template, no second audit, held as well', async () => {
    await f.hold.due(at());
    f.repo.reopens.mockResolvedValue([reopenOf({ status: 'queued', dedup_key: DAY })]);
    await expect(f.hold.due(at(staffText({ id: 'm2', dedup_key: `admin:${PHONE}:r2` })))).resolves.toBe('waiting');
    expect(f.repo.queueReopen).toHaveBeenCalledOnce();
    expect(f.audit.record).toHaveBeenCalledOnce();
    expect(f.repo.hold).toHaveBeenCalledTimes(2);
  });

  it('a replayed dedup key (another worker queued it): nothing new to audit', async () => {
    f.repo.queueReopen.mockResolvedValue(null);
    await expect(f.hold.due(at())).resolves.toBe('waiting');
    expect(f.audit.record).not.toHaveBeenCalled();
  });

  it("the family's reply releases the held message", async () => {
    const held = { id: 'h1', phone_e164: PHONE, created_at: '2026-11-03T07:59:00Z' };
    const waiting = { ...held, scheduled_for: held.created_at, expires_at: '2026-11-10T07:59:00Z' };
    f.repo.waiting.mockResolvedValue([{ ...waiting, error_text: null }] as never);
    f.repo.reopens.mockResolvedValue([reopenOf({ created_at: '2026-11-03T07:59:30Z' })]);
    f.repo.lastChatInbound.mockResolvedValue(new Map([[PHONE, '2026-11-03T09:00:00Z']]));
    await expect(f.release.run(NOW)).resolves.toBe(1);
    expect(f.repo.release).toHaveBeenCalledExactlyOnceWith(['h1']);
  });
});
