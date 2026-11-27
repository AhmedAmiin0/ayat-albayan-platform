import type { ChannelMessageView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import {
  channelBubbleActions,
  channelEditError,
  channelMessagePath,
  channelReadsPath,
} from '../channel-edits';

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
  ...{ kind: 'text', attachment: null, reply_to: null, read_by_all: false, client_id: null },
  ...over,
});
const now = (min: number) => new Date(Date.parse(at) + min * 60_000);

describe('channel edit / delete for the clients', () => {
  it('paths per audience, the owning assistant’s too (owner 2026-11-16)', () => {
    expect(channelMessagePath({ audience: 'teacher', studentId: 's', messageId: 'm' })).toBe(
      '/teachers/me/channels/s/messages/m',
    );
    expect(channelMessagePath({ audience: 'portal', studentId: 's', messageId: 'm' })).toBe(
      '/portal/students/s/channel/messages/m',
    );
    expect(channelMessagePath({ audience: 'admin', studentId: 's', messageId: 'm' })).toBe(
      '/students/s/channel/messages/m',
    );
    expect(channelMessagePath({ audience: 'sales', studentId: 's', messageId: 'm' })).toBe(
      '/sales/students/s/channel/messages/m',
    );
    expect(channelReadsPath({ audience: 'portal', studentId: 's', messageId: 'm' })).toBe(
      '/portal/students/s/channel/messages/m/reads',
    );
    expect(channelReadsPath({ audience: 'admin', studentId: 's', messageId: 'm' })).toBe(
      '/students/s/channel/messages/m/reads',
    );
  });

  it("the sender's windows (sales too); the admin deletes any; a deleted bubble nothing", () => {
    expect(
      channelBubbleActions({ audience: 'portal', mode: 'write', message: msg(), now: now(10) }),
    ).toEqual({
      edit: true,
      delete: true,
    });
    expect(
      channelBubbleActions({ audience: 'teacher', mode: 'write', message: msg(), now: now(20) }),
    ).toEqual({
      edit: false,
      delete: true,
    });
    expect(
      channelBubbleActions({
        audience: 'teacher',
        mode: 'write',
        message: msg({ mine: false }),
        now: now(1),
      }),
    ).toEqual({ edit: false, delete: false });
    expect(
      channelBubbleActions({
        audience: 'admin',
        mode: 'read',
        message: msg({ mine: false }),
        now: now(9999),
      }),
    ).toEqual({ edit: false, delete: true });
    expect(
      channelBubbleActions({ audience: 'sales', mode: 'write', message: msg(), now: now(1) }),
    ).toEqual({
      edit: true,
      delete: true,
    });
    expect(
      channelBubbleActions({
        audience: 'sales',
        mode: 'write',
        message: msg({ mine: false }),
        now: now(1),
      }),
    ).toEqual({ edit: false, delete: false });
    expect(
      channelBubbleActions({
        audience: 'admin',
        mode: 'read',
        message: msg({ deleted: true }),
        now: now(1),
      }),
    ).toEqual({ edit: false, delete: false });
  });

  it('only a writer or the admin changes: a monitor or a closed chat gets nothing', () => {
    const mine = msg();
    for (const mode of ['read', 'closed'] as const) {
      expect(channelBubbleActions({ audience: 'sales', mode, message: mine, now: now(1) })).toEqual(
        { edit: false, delete: false },
      );
    }
    expect(
      channelBubbleActions({ audience: 'admin', mode: 'read', message: mine, now: now(1) }),
    ).toEqual({ edit: false, delete: true });
  });

  it('a file is deleted, never edited', () => {
    const voice = msg({ kind: 'voice', body: '' });
    expect(
      channelBubbleActions({ audience: 'portal', mode: 'write', message: voice, now: now(1) }),
    ).toEqual({
      edit: false,
      delete: true,
    });
  });

  it('known refusal codes only', () => {
    expect(channelEditError('edit_window_closed')).toBe('edit_window_closed');
    expect(channelEditError('channel_not_open')).toBe('channel_not_open');
    expect(channelEditError('channel_read_only')).toBe('channel_read_only');
    expect(channelEditError('boom')).toBeNull();
    expect(channelEditError(undefined)).toBeNull();
  });
});
