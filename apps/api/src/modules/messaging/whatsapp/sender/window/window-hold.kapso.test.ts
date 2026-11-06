import { beforeEach, describe, expect, it } from 'vitest';
import { NO_TEMPLATE_NOTE } from './window-reopen';
import { NOW, PHONE, staffText, windowFakes } from './window.fakes';

// Owner 2026-11-06: each hold on the chat line asks KapsoHold once to reopen Kapso's
// conversation; its failure is noted on the row and never fails or blocks the text. KapsoHold is
// a mock here (never Kapso); kapso-hold.test.ts covers which lines call Kapso at all.

let f = windowFakes();
const at = (row = staffText()) => ({ row, now: NOW, line: 'chat' as const });

describe('WindowHold — the Kapso conversation reopen', () => {
  beforeEach(() => {
    f = windowFakes();
  });

  it('once per hold, after the hold is written, with the row\'s phone and line', async () => {
    await expect(f.hold.due(at())).resolves.toBe('waiting');
    expect(f.kapso.reopen).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ phone: PHONE, line: 'chat' }),
    );
    const [held] = f.repo.hold.mock.invocationCallOrder;
    const [patched] = f.kapso.reopen.mock.invocationCallOrder;
    expect(held).toBeLessThan(patched ?? 0);
    expect(f.repo.note).not.toHaveBeenCalled();
  });

  it('module mode: the row\'s number is passed on', async () => {
    const route = { numberId: 'n-chat', line: 'chat' as const };
    await f.hold.due({ ...at(), route });
    expect(f.kapso.reopen).toHaveBeenCalledWith(expect.objectContaining({ route }));
  });

  it('a PATCH failure: noted on the row (error_text), the text still waits', async () => {
    f.kapso.reopen.mockResolvedValue('kapso conversation reopen failed: 503');
    await expect(f.hold.due(at())).resolves.toBe('waiting');
    expect(f.repo.note).toHaveBeenCalledWith(staffText().id, 'kapso conversation reopen failed: 503');
    expect(f.repo.fail).not.toHaveBeenCalled();
  });

  it('«بدون قالب»: the failure follows the no-template note (still never orphaned)', async () => {
    f.settings.read.mockResolvedValue({ chat_reopen_template: 'none' });
    f.kapso.reopen.mockResolvedValue('kapso conversation reopen failed: 503');
    await f.hold.due(at());
    expect(f.repo.note).toHaveBeenCalledWith(
      staffText().id,
      `${NO_TEMPLATE_NOTE}; kapso conversation reopen failed: 503`,
    );
  });

  it('even a throwing Kapso step or note write never fails the held text', async () => {
    f.kapso.reopen.mockRejectedValue(new Error('boom'));
    await expect(f.hold.closed(at(staffText({ error_code: 'sending' })))).resolves.toBe('waiting');
    f.kapso.reopen.mockResolvedValue('kapso conversation reopen failed: x');
    f.repo.note.mockRejectedValue(new Error('db down'));
    await expect(f.hold.due(at())).resolves.toBe('waiting');
    expect(f.repo.fail).not.toHaveBeenCalled();
  });

  it('no hold (another worker moved it, gates off, refused, expired): no PATCH', async () => {
    f.repo.hold.mockResolvedValue(false);
    await f.hold.due(at());
    f.dispatch.ready.mockReturnValue(false);
    await f.hold.due(at());
    f.dispatch.ready.mockReturnValue(true);
    f.settings.read.mockResolvedValue({ chat_reopen_template: 'no_such_template' });
    await f.hold.due(at());
    await f.hold.due(at(staffText({ created_at: '2026-10-20T08:00:00Z' })));
    expect(f.kapso.reopen).not.toHaveBeenCalled();
  });

  it('a row the window does not hold (a teacher\'s text, the notifications line): no PATCH', async () => {
    await f.hold.closed(at(staffText({ error_code: 'sending', sent_by_teacher_id: 't1' })));
    await f.hold.closed({ ...at(staffText({ error_code: 'sending' })), line: 'notifications' });
    expect(f.kapso.reopen).not.toHaveBeenCalled();
    expect(f.repo.hold).not.toHaveBeenCalled();
  });
});

describe('WindowHold — a retried held text restarts its 7 days (owner 2026-11-06)', () => {
  it('created 10 days ago, requeued now: held until 7 days after the retry, not expired', async () => {
    f = windowFakes();
    const retried = staffText({ created_at: '2026-10-24T08:00:00Z', scheduled_for: NOW.toISOString() });
    await expect(f.hold.due(at(retried))).resolves.toBe('waiting');
    expect(f.repo.hold).toHaveBeenCalledWith(
      expect.objectContaining({ until: new Date(NOW.getTime() + 7 * 24 * 3_600_000) }),
    );
  });
});

describe('WindowHold — a released text refused again keeps its deadline (review finding 2)', () => {
  it('its expires_at (from the retry) stands, not created_at + 7 days', async () => {
    f = windowFakes();
    const kept = '2026-11-08T08:00:00.000Z';
    const row = staffText({ error_code: 'sending', created_at: '2026-10-20T08:00:00Z', expires_at: kept });
    await expect(f.hold.closed(at(row))).resolves.toBe('waiting');
    expect(f.repo.hold).toHaveBeenCalledWith(expect.objectContaining({ until: new Date(kept) }));
  });
});
