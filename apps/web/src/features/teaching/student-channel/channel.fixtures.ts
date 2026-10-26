// Test fixtures for the student channel (test-only).
import type { ChannelPage } from '@ab/shared';

export const channelPage = (over: Partial<ChannelPage> = {}): ChannelPage => ({
  messages: [
    { id: 'm1', body: 'متى الحلقة؟ https://example.org/plan', sender_role: 'guardian', sender_name: 'أم سلمى', mine: false, created_at: '2026-10-27T10:00:00.000Z' },
    { id: 'm2', body: 'غدًا إن شاء الله', sender_role: 'teacher', sender_name: 'أبرار', mine: true, created_at: '2026-10-27T10:05:00.000Z' },
  ],
  has_more: false,
  read_only: false,
  ...over,
});
