import type { ChannelMessageView, ChannelPage } from '@ab/shared';

// The channel tests' rows (test-only): every field the API sends, so a test names only what it
// checks. Made-up names, no real people (the repo is public).

export const channelMessage = (over: Partial<ChannelMessageView> = {}): ChannelMessageView => ({
  ...{ id: 'm1', body: '', sender_role: 'guardian', sender_name: 'أم سلمى', mine: false },
  ...{ created_at: '2026-10-27T10:00:00.000Z', edited: false, deleted: false, kind: 'text' },
  ...{ attachment: null, reply_to: null, read_by_all: false, client_id: null },
  ...over,
});

export const channelPage = (over: Partial<ChannelPage> = {}): ChannelPage => ({
  ...{ student_name: 'سلمى', messages: [], has_more: false, read_only: false, open: true },
  ...{ closed_reason: null, channel_id: '' },
  ...over,
});
