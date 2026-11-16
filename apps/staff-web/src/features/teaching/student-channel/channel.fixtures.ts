// Test fixtures for the student channel (test-only).
import type { ChannelMessageView, ChannelPage } from '@ab/shared';

/** A plain text message from the guardian; `over` changes any field. */
export const channelMessage = (over: Partial<ChannelMessageView> = {}): ChannelMessageView => ({
  id: 'm1',
  body: 'متى الحلقة؟ https://example.org/plan',
  sender_role: 'guardian',
  sender_name: 'أم سلمى',
  mine: false,
  created_at: '2026-10-27T10:00:00.000Z',
  edited: false,
  deleted: false,
  kind: 'text',
  attachment: null,
  reply_to: null,
  read_by_all: false,
  client_id: null,
  ...over,
});

export const channelPage = (over: Partial<ChannelPage> = {}): ChannelPage => ({
  student_name: 'سلمى',
  messages: [
    channelMessage(),
    channelMessage({
      id: 'm2',
      body: 'غدًا إن شاء الله',
      sender_role: 'teacher',
      sender_name: 'أبرار',
      mine: true,
      created_at: '2026-10-27T10:05:00.000Z',
    }),
  ],
  has_more: false,
  read_only: false,
  open: true,
  closed_reason: null,
  channel_id: '',
  ...over,
});
