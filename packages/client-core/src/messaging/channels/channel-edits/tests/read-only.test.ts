import type { ChannelMessageView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { channelBubbleActions, channelEditError } from '../channel-edits';
import { channelMode } from '../../channel-live';

// Review finding 5: the assistant's page says read_only (a closed chat, or the family chat off),
// so her own bubble offers no edit and no delete-for-all; the API's 403 channel_read_only reads as
// its own line, never a generic failure.

const at = '2026-11-21T10:00:00.000Z';
const mine: ChannelMessageView = {
  ...{ id: 'm1', body: 'x', sender_role: 'sales', sender_name: 'سارة', mine: true, created_at: at },
  ...{ edited: false, deleted: false, kind: 'text', attachment: null, reply_to: null },
  ...{ read_by_all: false, client_id: null },
};
const now = new Date(Date.parse(at) + 60_000);

describe('the assistant on a read-only page', () => {
  it('read-only (closed or family chat off): no actions on her own fresh message', () => {
    for (const open of [false, true]) {
      const mode = channelMode('sales', { open, read_only: true });
      expect(mode).toBe('read');
      const offers = channelBubbleActions({ audience: 'sales', mode, message: mine, now });
      expect(offers).toEqual({ edit: false, delete: false });
    }
  });

  it('writable: her own fresh message offers edit and delete', () => {
    const mode = channelMode('sales', { open: true, read_only: false });
    const offers = channelBubbleActions({ audience: 'sales', mode, message: mine, now });
    expect(offers).toEqual({ edit: true, delete: true });
  });

  it('403 channel_read_only and 409 channel_not_open are mapped', () => {
    expect(channelEditError('channel_read_only')).toBe('channel_read_only');
    expect(channelEditError('channel_not_open')).toBe('channel_not_open');
  });
});
