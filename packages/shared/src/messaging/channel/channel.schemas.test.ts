import { describe, expect, it } from 'vitest';
import type { ChannelPage } from './channel.js';
import { channelPageSchema } from './channel.schemas.js';

const page: ChannelPage = {
  student_name: 'سلمى',
  messages: [
    {
      ...{ id: 'm1', body: 'السلام عليكم', sender_role: 'guardian', sender_name: 'أم سلمى' },
      ...{ mine: false, created_at: '2026-10-27T10:00:00.000Z', edited: false, deleted: false },
    },
  ],
  has_more: false,
  read_only: false,
  open: true,
  channel_id: 'c1',
};

describe('a thread page as the apps read it (docs/31 §2)', () => {
  it('reads the API answer as it is', () => {
    expect(channelPageSchema.parse(page)).toEqual(page);
  });

  it('refuses an answer that is not a page (an unknown sender, no messages)', () => {
    const stranger = { ...page.messages[0], sender_role: 'admin' };
    expect(channelPageSchema.safeParse({ ...page, messages: [stranger] }).success).toBe(false);
    expect(channelPageSchema.safeParse({ ...page, messages: undefined }).success).toBe(false);
  });
});
