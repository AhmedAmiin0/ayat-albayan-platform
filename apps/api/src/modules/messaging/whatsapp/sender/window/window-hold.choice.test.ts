import { beforeEach, describe, expect, it } from 'vitest';
import { NO_TEMPLATE_NOTE } from './window-reopen';
import { NOW, PHONE, staffText, windowFakes } from './window.fakes';

// Owner 2026-11-06 («give him a choice»): chat_reopen_template = «بدون قالب» (none) holds the
// text with no template (Kapso reopen + awaiting_reply) until the family writes; a template key
// keeps today's path. Fakes only: never a database, Kapso or Meta.

let f = windowFakes();
const at = (row = staffText()) => ({ row, now: NOW, line: 'chat' as const });

describe('WindowHold — «بدون قالب»', () => {
  beforeEach(() => {
    f = windowFakes();
    f.settings.read.mockResolvedValue({ chat_reopen_template: 'none' });
  });

  it('held with no template queued, marked as held without one', async () => {
    await expect(f.hold.due(at())).resolves.toBe('waiting');
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
    expect(f.approved).not.toHaveBeenCalled();
    expect(f.repo.fail).not.toHaveBeenCalled();
    expect(f.repo.hold).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ from: 'awaiting_reply', note: NO_TEMPLATE_NOTE }),
    );
  });

  it('a text WhatsApp refused (Kapso 422) is held the same way, never failed', async () => {
    await expect(f.hold.closed(at(staffText({ error_code: 'sending' })))).resolves.toBe('waiting');
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
    expect(f.repo.hold).toHaveBeenCalledWith(expect.objectContaining({ from: 'sending' }));
  });

  it('still fails at its 7-day deadline', async () => {
    const old = staffText({ created_at: '2026-10-20T08:00:00Z' });
    await expect(f.hold.due(at(old))).resolves.toBe('expired');
    expect(f.repo.fail).toHaveBeenCalledWith([old.id], expect.objectContaining({ code: 'hold_expired' }));
  });

  it('the composer note: the thread can reopen, by waiting', async () => {
    await expect(f.request.usable()).resolves.toBe('wait');
  });
});

describe('WindowHold — a template chosen (today\'s path)', () => {
  beforeEach(() => {
    f = windowFakes();
  });

  it('the starter template is queued and the text held with no note', async () => {
    await expect(f.hold.due(at())).resolves.toBe('waiting');
    expect(f.repo.queueReopen).toHaveBeenCalledOnce();
    expect(f.repo.hold).toHaveBeenCalledWith(expect.objectContaining({ note: null }));
    await expect(f.request.usable()).resolves.toBe('template');
  });

  it('an unusable stored template still fails reopen_unavailable at once', async () => {
    f.settings.read.mockResolvedValue({ chat_reopen_template: 'no_such_template' });
    await expect(f.hold.due(at())).resolves.toBe('failed');
    expect(f.repo.hold).not.toHaveBeenCalled();
    expect(f.repo.fail).toHaveBeenCalledWith([staffText().id], expect.objectContaining({ code: 'reopen_unavailable' }));
    await expect(f.request.usable()).resolves.toBeNull();
  });

  it('an empty stored template is not «بدون قالب»: it fails visibly as before', async () => {
    f.settings.read.mockResolvedValue({ chat_reopen_template: '' });
    await expect(f.hold.due(at())).resolves.toBe('failed');
    expect(f.repo.fail).toHaveBeenCalledWith([staffText().id], expect.objectContaining({ code: 'reopen_unavailable' }));
  });
});

describe('WindowRelease — a text held without a template', () => {
  const held = {
    id: 'w1',
    phone_e164: PHONE,
    created_at: '2026-11-03T07:59:00Z',
    scheduled_for: '2026-11-03T07:59:00Z',
    error_text: NO_TEMPLATE_NOTE,
    expires_at: '2026-11-10T07:59:00Z',
  };

  it('no reopen template exists: it is never failed as orphaned, it keeps waiting', async () => {
    f = windowFakes();
    f.repo.waiting.mockResolvedValue([held] as never);
    await f.release.run(NOW);
    expect(f.repo.fail).toHaveBeenCalledWith([], expect.anything());
    expect(f.repo.release).toHaveBeenCalledWith([]);
  });

  it("the family's next message releases it (sent through the normal sender)", async () => {
    f = windowFakes();
    f.repo.waiting.mockResolvedValue([held] as never);
    f.repo.lastChatInbound.mockResolvedValue(new Map([[PHONE, '2026-11-03T09:00:00Z']]));
    await expect(f.release.run(NOW)).resolves.toBe(1);
    expect(f.repo.release).toHaveBeenCalledWith(['w1']);
  });
});

describe('WindowRelease — a staff retry not held yet (review finding 1)', () => {
  it('queued AWAITING_REPLY with a retry time but no deadline: never failed as orphaned', async () => {
    f = windowFakes();
    const retried = { ...staffText(), scheduled_for: NOW.toISOString(), error_text: null, expires_at: null };
    f.repo.waiting.mockResolvedValue([retried] as never);
    await f.release.run(NOW);
    expect(f.repo.fail).toHaveBeenCalledWith([], expect.anything());
  });
});
