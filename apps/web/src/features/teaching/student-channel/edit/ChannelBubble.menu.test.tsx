import type { ChannelAudience } from '@ab/client-core';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { msg, showBubble } from './bubble.testing';

const a = t.studentChannel.actions;

/** The menu's picks for this bubble and viewer ([] when there is no ⋯ at all). */
function offered(m: ReturnType<typeof msg>, audience: ChannelAudience): string[] {
  showBubble(m, audience);
  const menu = screen.queryByRole('button', { name: a.menu });
  if (!menu) return [];
  fireEvent.click(menu);
  return [a.edit, a.deleteForAll].filter((name) => screen.queryByRole('button', { name }));
}

describe('channel bubble menu: what it offers now', () => {
  it('my message: edit and delete within 15 minutes', () => {
    expect(offered(msg(10), 'teacher')).toEqual([a.edit, a.deleteForAll]);
  });

  it('after 15 minutes delete only; after 48 hours nothing', () => {
    expect(offered(msg(16), 'portal')).toEqual([a.deleteForAll]);
  });

  it('after 48 hours: no menu', () => {
    expect(offered(msg(48 * 60 + 1), 'portal')).toEqual([]);
  });

  it("someone else's message: no menu for a participant", () => {
    expect(offered(msg(1, { mine: false }), 'teacher')).toEqual([]);
  });

  it('the admin (moderation) deletes any message, any age; never edits', () => {
    expect(offered(msg(9999, { mine: false }), 'admin')).toEqual([a.deleteForAll]);
  });

  it('the owning assistant (sales) gets nothing', () => {
    expect(offered(msg(1), 'sales')).toEqual([]);
  });
});
