import type { ChannelPage } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { CHANNEL_WRITES, channelMessagesPath, channelReadPath, channelTimeText, olderCursor, threadMessages } from './channels.js';

const msg = (id: string, at: string) => ({ id, body: id, sender_role: 'guardian' as const, sender_name: '', mine: false, created_at: at });

describe('student channel paths and pages (docs/31 §2)', () => {
  it('each audience reads its own route; before is encoded', () => {
    expect(channelMessagesPath({ audience: 'teacher', studentId: 's1' })).toBe('/teachers/me/channels/s1/messages');
    expect(channelMessagesPath({ audience: 'portal', studentId: 's1' })).toBe('/portal/students/s1/channel/messages');
    expect(channelMessagesPath({ audience: 'admin', studentId: 's1' })).toBe('/students/s1/channel/messages');
    expect(channelMessagesPath({ audience: 'sales', studentId: 's1', before: '2026-10-27T10:00:00+03:00' })).toBe(
      '/sales/students/s1/channel/messages?before=2026-10-27T10%3A00%3A00%2B03%3A00',
    );
    expect(channelReadPath('portal', 's1')).toBe('/portal/students/s1/channel/read');
  });

  it('only participants write', () => {
    expect(CHANNEL_WRITES).toEqual({ teacher: true, portal: true, admin: false, sales: false });
  });

  it('pages: the next cursor is the oldest shown while more exist; all pages read oldest first', () => {
    const newest: ChannelPage = { messages: [msg('c', '3'), msg('d', '4')], has_more: true, read_only: false };
    const older: ChannelPage = { messages: [msg('a', '1'), msg('b', '2')], has_more: false, read_only: false };
    expect(olderCursor(newest)).toBe('3');
    expect(olderCursor(older)).toBeUndefined();
    expect(threadMessages([newest, older]).map((m) => m.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(threadMessages(undefined)).toEqual([]);
  });
});

describe('channelTimeText', () => {
  const now = new Date('2026-10-27T12:00:00.000Z');
  it('the clock alone today on the viewer’s clock, the day before it otherwise', () => {
    expect(channelTimeText({ iso: '2026-10-27T09:05:00.000Z', tz: 'Asia/Riyadh', now, locale: 'en' })).toBe('12:05');
    expect(channelTimeText({ iso: '2026-10-25T09:05:00.000Z', tz: 'Asia/Riyadh', now, locale: 'en' })).toMatch(/25.*Oct.* 12:05$/);
    // 22:30 Cairo on the 26th is the 27th in Riyadh: the viewer's own zone decides the day.
    expect(channelTimeText({ iso: '2026-10-26T21:30:00.000Z', tz: 'Asia/Riyadh', now, locale: 'en' })).toBe('00:30');
  });
});
