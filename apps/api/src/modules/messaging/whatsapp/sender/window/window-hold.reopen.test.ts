import { beforeEach, describe, expect, it } from 'vitest';
import { NOW, PHONE, reopenOf, staffText, windowFakes } from './window.fakes';

// Merge-gate review 2026-11-05: a held text never waits behind a reopen template that will not
// reach the family. Only a pending or sent reopen counts; a failed or expired one gets a new try
// (its own dedup key), and when none can go the text fails at once with a visible reason.

let f = windowFakes();
const at = (row = staffText()) => ({ row, now: NOW, line: 'chat' as const });
const DAY = `reopen:${PHONE}:2026-11-03`;
const queuedKey = (): unknown => f.repo.queueReopen.mock.calls.at(0)?.at(0);

describe('WindowHold — which reopen template counts', () => {
  beforeEach(() => {
    f = windowFakes();
  });

  it("today's reopen failed: a new one is queued under the next try's key, and the text held", async () => {
    f.repo.reopens.mockResolvedValue([reopenOf({ status: 'failed' })]);
    await expect(f.hold.due(at())).resolves.toBe('waiting');
    expect(queuedKey()).toMatchObject({ dedup_key: `${DAY}:2`, expires_at: '2026-11-04T08:00:00.000Z' });
    expect(f.repo.hold).toHaveBeenCalledOnce();
  });

  it("today's reopen expired unsent (queued past its expiry): same, a new try and the text held", async () => {
    f.repo.reopens.mockResolvedValue([reopenOf({ status: 'queued', expires_at: '2026-11-03T07:30:00Z' })]);
    await expect(f.hold.due(at())).resolves.toBe('waiting');
    expect(queuedKey()).toMatchObject({ dedup_key: `${DAY}:2` });
    expect(f.repo.hold).toHaveBeenCalledOnce();
  });

  it('a reopen that failed «uncertain» (may have reached them): held, no second template', async () => {
    f.repo.reopens.mockResolvedValue([reopenOf({ status: 'failed', error_code: 'uncertain' })]);
    await expect(f.hold.due(at())).resolves.toBe('waiting');
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
  });

  it('a reopen still pending: the text held, no second template', async () => {
    f.repo.reopens.mockResolvedValue([reopenOf({ status: 'queued' })]);
    await expect(f.hold.due(at())).resolves.toBe('waiting');
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
    expect(f.repo.hold).toHaveBeenCalledOnce();
  });

  it('the template unusable and no reopen live: fails reopen_unavailable at once, never held', async () => {
    f.repo.reopens.mockResolvedValue([reopenOf({ status: 'failed' })]);
    f.settings.read.mockResolvedValue({ chat_reopen_template: 'inquiry_followup_ar_v2' });
    await expect(f.hold.due(at())).resolves.toBe('failed');
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
    expect(f.repo.hold).not.toHaveBeenCalled();
    expect(f.repo.fail).toHaveBeenCalledWith(
      [staffText().id],
      expect.objectContaining({ code: 'reopen_unavailable', from: 'awaiting_reply' }),
    );
  });

  it("today's three tries all failed: fails reopen_tries_used (try tomorrow), no fourth template", async () => {
    const tries = [DAY, `${DAY}:2`, `${DAY}:3`].map((k) => reopenOf({ status: 'failed', dedup_key: k }));
    f.repo.reopens.mockResolvedValue(tries);
    await expect(f.hold.due(at())).resolves.toBe('failed');
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
    expect(f.repo.fail).toHaveBeenCalledWith(
      [staffText().id],
      expect.objectContaining({ code: 'reopen_tries_used', text: expect.stringContaining('tomorrow') }),
    );
  });

  it('the template usable but no reopen live: nothing is held before the template is queued', async () => {
    await f.hold.due(at());
    const [queued] = f.repo.queueReopen.mock.invocationCallOrder;
    const [held] = f.repo.hold.mock.invocationCallOrder;
    expect(queued).toBeLessThan(held ?? 0);
  });
});

describe('WindowHold — the hold starts when the window was seen closed (review finding 4)', () => {
  beforeEach(() => {
    f = windowFakes();
  });

  it('a row the inbox marked: from its enqueue, so a reply landing before the hold write counts', async () => {
    await f.hold.due(at());
    expect(f.repo.hold).toHaveBeenCalledWith(
      expect.objectContaining({ since: new Date('2026-11-03T07:59:00Z') }),
    );
  });

  it('a row enqueued long ago (sender down): never earlier than 24 h before now', async () => {
    await f.hold.due(at(staffText({ created_at: '2026-10-30T07:00:00Z' })));
    expect(f.repo.hold).toHaveBeenCalledWith(
      expect.objectContaining({ since: new Date(NOW.getTime() - 24 * 3_600_000) }),
    );
  });

  it('a row WhatsApp refused in this pass: from this pass', async () => {
    await f.hold.closed(at(staffText({ error_code: 'sending' })));
    expect(f.repo.hold).toHaveBeenCalledWith(expect.objectContaining({ since: NOW }));
  });
});
