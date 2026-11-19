import type { ChannelMessageView } from '@ab/shared';

// One channel message for the thread tests (test-only); made-up names (the repo is public).

const BASE: ChannelMessageView = {
  id: 'm1',
  kind: 'text',
  body: '',
  attachment: null,
  reply_to: null,
  sender_name: 'خالد',
  sender_role: 'guardian',
  mine: false,
  client_id: null,
  read_by_all: false,
  edited: false,
  deleted: false,
  created_at: '2026-10-27T10:00:00.000Z',
};

export const channelMessage = (over: Partial<ChannelMessageView> = {}): ChannelMessageView => ({
  ...BASE,
  ...over,
});
