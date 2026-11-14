import type { ThreadView } from '@ab/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NOW,
  PHONE,
  reopenOf,
  staffText,
  windowFakes,
} from '@/modules/messaging/whatsapp/sender/window/window.fakes';
import type { WindowSettings } from '@/modules/messaging/whatsapp/sender/window/window.settings';
import { ReopenPick } from './reopen-pick';
import type { ReopenBubble, ReopenPickRepo } from './reopen-pick.repo';

// «إعادة فتح المحادثة» (owner 2026-11-14): a staff-picked template is THE reopen of its window.
// Fakes only: no database, nothing sent.

const DAY = `reopen:${PHONE}:2026-11-03`;
const bubble = (over: Partial<ReopenBubble> = {}): ReopenBubble => ({
  ...reopenOf(over),
  id: 'm-reopen',
  template_key: 'free_trial_invite',
  ...over,
});

const rows = vi.fn(async (): Promise<ReopenBubble[]> => []);
const setting = vi.fn(async () => ({ chat_reopen_template: 'welcome_greeting' }));
const pick = () =>
  new ReopenPick(
    { since: rows } as unknown as ReopenPickRepo,
    { read: setting } as unknown as WindowSettings,
  );
const at = { phone: PHONE, line: 'chat' as const, now: NOW };

beforeEach(() => {
  rows.mockReset().mockResolvedValue([]);
  setting.mockReset().mockResolvedValue({ chat_reopen_template: 'welcome_greeting' });
});

describe('ReopenPick.stamp: the picked template takes the reopen key', () => {
  it('none today: the day key, living 24 h', async () => {
    await expect(pick().stamp(at)).resolves.toEqual({
      dedup: DAY,
      expiresAt: '2026-11-04T08:00:00.000Z',
    });
  });

  it('a failed try today: the next try key', async () => {
    rows.mockResolvedValue([bubble({ status: 'failed', error_code: 'x' })]);
    await expect(pick().stamp(at)).resolves.toMatchObject({ dedup: `${DAY}:2` });
  });

  it('one live already (picked, or the automatic one): 409 reopen_live, no second', async () => {
    rows.mockResolvedValue([bubble({ status: 'queued', expires_at: '2026-11-04T07:00:00Z' })]);
    await expect(pick().stamp(at)).rejects.toMatchObject({
      response: { code: 'reopen_live' },
    });
  });

  it("today's tries all used: 409 reopen_tries_used", async () => {
    const dead = { status: 'failed' as const, error_code: 'x' };
    rows.mockResolvedValue([
      bubble({ ...dead }),
      bubble({ ...dead, dedup_key: `${DAY}:2` }),
      bubble({ ...dead, dedup_key: `${DAY}:3` }),
    ]);
    await expect(pick().stamp(at)).rejects.toMatchObject({
      response: { code: 'reopen_tries_used' },
    });
  });

  it('a notifications-line template cannot reopen the chat line: 400', async () => {
    await expect(pick().stamp({ ...at, line: 'notifications' })).rejects.toMatchObject({
      response: { code: 'reopen_not_chat_line' },
    });
    expect(rows).not.toHaveBeenCalled();
  });
});

describe('the window hold reads the picked row as its reopen (no double template)', () => {
  it('a text sent after the picked template is held behind it, nothing new queued', async () => {
    const { dedup, expiresAt } = await pick().stamp(at);
    const f = windowFakes();
    const picked = reopenOf({ status: 'queued', dedup_key: dedup, expires_at: expiresAt });
    f.repo.reopens.mockResolvedValue([picked]);
    await expect(f.request.ensure(staffText(), NOW)).resolves.toEqual({ note: null });
    expect(f.repo.queueReopen).not.toHaveBeenCalled();
  });
});

const closed = { phone_e164: PHONE, session_open: false } as ThreadView;

describe('ReopenPick.thread: the bar fields of a closed chat', () => {
  it('an open window: unchanged, nothing read', async () => {
    const open = { ...closed, session_open: true };
    await expect(pick().thread(open, NOW)).resolves.toBe(open);
    expect(rows).not.toHaveBeenCalled();
  });

  it('the newest live reopen, and the academy template to preselect', async () => {
    rows.mockResolvedValue([bubble({ status: 'delivered' }), bubble({ id: 'older' })]);
    await expect(pick().thread(closed, NOW)).resolves.toMatchObject({
      reopen_sent: { id: 'm-reopen', template_key: 'free_trial_invite', status: 'delivered' },
      reopen_template: 'welcome_greeting',
    });
  });

  it('only a failed one: none live; «بدون قالب»: nothing preselected', async () => {
    rows.mockResolvedValue([bubble({ status: 'failed', error_code: 'x' })]);
    setting.mockResolvedValue({ chat_reopen_template: 'none' });
    const out = await pick().thread(closed, NOW);
    expect(out.reopen_sent).toBeNull();
    expect(out).not.toHaveProperty('reopen_template');
  });

  it('a failed read leaves the thread as it was', async () => {
    rows.mockRejectedValue(new Error('down'));
    await expect(pick().thread(closed, NOW)).resolves.toBe(closed);
  });
});
