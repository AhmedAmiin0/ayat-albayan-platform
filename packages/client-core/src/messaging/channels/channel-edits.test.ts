import type { ChannelMessageView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import {
  channelBubbleActions,
  channelEditError,
  channelMessagePath,
  threadHidePath,
} from './channel-edits.js';

const at = '2026-10-30T10:00:00.000Z';
const msg = (over: Partial<ChannelMessageView> = {}): ChannelMessageView => ({
  id: 'm1',
  body: 'x',
  sender_role: 'teacher',
  sender_name: 'أبرار',
  mine: true,
  created_at: at,
  edited: false,
  deleted: false,
  ...over,
});
const now = (min: number) => new Date(Date.parse(at) + min * 60_000);

describe('channel edit / delete for the clients', () => {
  it('paths per audience; the owning assistant has none', () => {
    expect(channelMessagePath({ audience: 'teacher', studentId: 's', messageId: 'm' })).toBe(
      '/teachers/me/channels/s/messages/m',
    );
    expect(channelMessagePath({ audience: 'portal', studentId: 's', messageId: 'm' })).toBe(
      '/portal/students/s/channel/messages/m',
    );
    expect(channelMessagePath({ audience: 'admin', studentId: 's', messageId: 'm' })).toBe(
      '/students/s/channel/messages/m',
    );
    expect(channelMessagePath({ audience: 'sales', studentId: 's', messageId: 'm' })).toBeNull();
    expect(threadHidePath('+966501234567', 'm')).toBe('/threads/%2B966501234567/messages/m/hide');
  });

  it("the sender's windows; the admin deletes any; sales nothing; a deleted bubble nothing", () => {
    expect(channelBubbleActions({ audience: 'portal', message: msg(), now: now(10) })).toEqual({
      edit: true,
      delete: true,
    });
    expect(channelBubbleActions({ audience: 'teacher', message: msg(), now: now(20) })).toEqual({
      edit: false,
      delete: true,
    });
    expect(
      channelBubbleActions({ audience: 'teacher', message: msg({ mine: false }), now: now(1) }),
    ).toEqual({ edit: false, delete: false });
    expect(
      channelBubbleActions({ audience: 'admin', message: msg({ mine: false }), now: now(9999) }),
    ).toEqual({ edit: false, delete: true });
    expect(channelBubbleActions({ audience: 'sales', message: msg(), now: now(1) })).toEqual({
      edit: false,
      delete: false,
    });
    expect(
      channelBubbleActions({ audience: 'admin', message: msg({ deleted: true }), now: now(1) }),
    ).toEqual({ edit: false, delete: false });
  });

  it('known refusal codes only', () => {
    expect(channelEditError('edit_window_closed')).toBe('edit_window_closed');
    expect(channelEditError('boom')).toBeNull();
    expect(channelEditError(undefined)).toBeNull();
  });
});
