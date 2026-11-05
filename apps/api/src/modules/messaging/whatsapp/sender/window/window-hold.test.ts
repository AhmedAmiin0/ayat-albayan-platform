import { beforeEach, describe, expect, it } from 'vitest';
import { NOW, PHONE, reopenOf, STAFF, staffText, windowFakes } from './window.fakes';

// Owner 2026-11-03: after the window a staff text is never sent as free text. ONE reopen template
// per phone per 24 h, the text held until the family replies, failed after 7 days. Fakes only.

let f = windowFakes();
const at = (row = staffText()) => ({ row, now: NOW, line: 'chat' as const });
const until = new Date(Date.parse('2026-11-03T07:59:00Z') + 7 * 24 * 3_600_000);

describe('WindowHold.due — a text queued after the window', () => {
  beforeEach(() => {
    f = windowFakes();
  });

  it('ONE reopen template (the setting, as the staff member, deduped per day), then the text held', async () => {
    await expect(f.hold.due(at())).resolves.toBe('waiting');
    expect(f.repo.queueReopen).toHaveBeenCalledExactlyOnceWith({
      direction: 'outbound',
      status: 'queued',
      phone_e164: PHONE,
      lead_id: null,
      guardian_id: null,
      created_by: STAFF,
      template_key: 'welcome_greeting',
      template_params: {},
      dedup_key: `reopen:${PHONE}:2026-11-03`,
      // A day to go out: a template paused meanwhile never goes late, never blocks the next one.
      expires_at: '2026-11-04T08:00:00.000Z',
    });
    // Compare-and-set on the marker: a row another worker released meanwhile is not held again.
    expect(f.repo.hold).toHaveBeenCalledExactlyOnceWith({
      id: staffText().id,
      from: 'awaiting_reply',
      since: expect.any(Date),
      until,
    });
    const [queued] = f.repo.queueReopen.mock.invocationCallOrder;
    const [held] = f.repo.hold.mock.invocationCallOrder;
    expect(queued).toBeLessThan(held ?? 0);
  });

  it('a second text while one reopen is pending or sent: held too, no second template', async () => {
    f.repo.reopens.mockResolvedValue([reopenOf({ status: 'queued' })]);
    await expect(f.hold.due(at(staffText({ id: 'm2' })))).resolves.toBe('waiting');
    expect(f.repo.reopens).toHaveBeenCalledWith([PHONE], new Date(NOW.getTime() - 24 * 3_600_000));
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
    expect(f.repo.hold).toHaveBeenCalledOnce();
  });

  it('gates off (line not configured / phone off the allow-list): nothing queued, nothing held', async () => {
    f.dispatch.ready.mockReturnValue(false);
    await expect(f.hold.due(at())).resolves.toBe('skipped');
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
    expect(f.repo.hold).not.toHaveBeenCalled();
    expect(f.repo.fail).not.toHaveBeenCalled();
  });

  it('module mode, no number can send now: waits untouched', async () => {
    await expect(f.hold.due({ ...at(), route: null })).resolves.toBe('skipped');
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', ''],
    ['not approved / unknown', 'inquiry_followup_ar_v2'],
  ])('setting %s: no template, the text fails with reopen_unavailable', async (_name, key) => {
    f.settings.read.mockResolvedValue({ chat_reopen_template: key });
    await expect(f.hold.due(at())).resolves.toBe('failed');
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
    expect(f.repo.hold).not.toHaveBeenCalled();
    expect(f.repo.fail).toHaveBeenCalledWith(
      [staffText().id],
      expect.objectContaining({ code: 'reopen_unavailable' }),
    );
  });

  it('another worker moved the row first: not ours (the template is deduped by its key)', async () => {
    f.repo.hold.mockResolvedValue(false);
    await expect(f.hold.due(at())).resolves.toBe('skipped');
  });

  it('a row already 7 days old: expired with its reason, never held, never sent', async () => {
    const old = staffText({ created_at: '2026-10-27T07:00:00Z' });
    await expect(f.hold.due(at(old))).resolves.toBe('expired');
    expect(f.repo.fail).toHaveBeenCalledWith(
      [old.id],
      expect.objectContaining({ code: 'hold_expired' }),
    );
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
  });

  it('a held text at its deadline (no reply in 7 days): expired «hold_expired»', async () => {
    const held = staffText({ expires_at: until.toISOString() });
    await expect(f.hold.due({ ...at(held), now: until })).resolves.toBe('expired');
    expect(f.repo.fail).toHaveBeenCalledWith(
      [held.id],
      expect.objectContaining({ code: 'hold_expired' }),
    );
  });

  it('any other row: null (the worker goes on as before)', async () => {
    await expect(f.hold.due(at(staffText({ error_code: null })))).resolves.toBeNull();
    expect(f.settings.read).not.toHaveBeenCalled();
  });
});

describe('WindowHold.closed — WhatsApp refused it for the window', () => {
  beforeEach(() => {
    f = windowFakes();
  });

  it('a staff chat text: held behind the reopen template', async () => {
    await expect(f.hold.closed(at(staffText({ error_code: 'sending' })))).resolves.toBe('waiting');
    expect(f.repo.queueReopen).toHaveBeenCalledOnce();
  });

  it("a teacher's text: null (failed window_closed as planned, no template sent by a teacher)", async () => {
    const teacher = staffText({ error_code: 'sending', sent_by_teacher_id: 't1' });
    await expect(f.hold.closed(at(teacher))).resolves.toBeNull();
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
    expect(f.repo.hold).not.toHaveBeenCalled();
  });

  it('a failed read while holding: null, so the planned failure is still written', async () => {
    f.repo.reopens.mockRejectedValue(new Error('db down'));
    await expect(f.hold.closed(at(staffText({ error_code: 'sending' })))).resolves.toBeNull();
    expect(f.repo.hold).not.toHaveBeenCalled();
  });
});
