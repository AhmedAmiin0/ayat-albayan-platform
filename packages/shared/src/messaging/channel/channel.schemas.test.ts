import { describe, expect, it } from 'vitest';
import type { ChannelPage } from './channel-views.js';
import { channelPageSchema, channelReadsSchema } from './channel.schemas.js';

const message = {
  ...{ id: 'm1', body: 'السلام عليكم', sender_role: 'guardian' as const, sender_name: 'أم سلمى' },
  ...{ mine: false, created_at: '2026-10-27T10:00:00.000Z', edited: false, deleted: false },
};

const page: ChannelPage = {
  student_name: 'سلمى',
  messages: [
    {
      ...message,
      kind: 'voice',
      attachment: { mime: 'audio/mp4', size: 9, name: 'v.m4a', duration_ms: 3000, url: 'https://x' },
      reply_to: {
        ...{ id: 'm0', sender_name: 'أبرار', sender_role: 'teacher', body: 'نعم' },
        ...{ kind: 'text', deleted: false },
      },
      read_by_all: false,
      client_id: 'a1000000-0000-4000-8000-000000000001',
    },
  ],
  has_more: false,
  read_only: false,
  open: true,
  closed_reason: null,
  channel_id: 'c1',
};

/** What the API answered before files, replies and read ticks. */
const oldPage = { ...page, messages: [message], closed_reason: undefined };

describe('a thread page as the apps read it (docs/31 §2)', () => {
  it('reads the API answer as it is', () => {
    expect(channelPageSchema.parse(page)).toEqual(page);
  });

  it('reads the owning assistant’s message (owner 2026-11-16 «yes it can write also»)', () => {
    const sales = { ...page.messages[0], sender_role: 'sales' };
    expect(channelPageSchema.safeParse({ ...page, messages: [sales] }).success).toBe(true);
  });

  it('an older API: every new field gets its default (text, no file, no quote, not read)', () => {
    const parsed = channelPageSchema.parse(oldPage);
    expect(parsed.closed_reason).toBeNull();
    expect(parsed.messages[0]).toEqual({
      ...message,
      ...{ kind: 'text', attachment: null, reply_to: null, read_by_all: false, client_id: null },
    });
  });

  it('a newer API: an unknown role reads as unknown, an unknown kind as text, a new reason null', () => {
    const newer = { ...page.messages[0], sender_role: 'supervisor', kind: 'video', extra: 1 };
    const parsed = channelPageSchema.parse({ ...page, messages: [newer], closed_reason: 'later' });
    expect([parsed.messages[0]?.sender_role, parsed.messages[0]?.kind]).toEqual(['unknown', 'text']);
    expect(parsed.closed_reason).toBeNull();
  });

  it('refuses an answer that is not a page (no messages, a message without an id)', () => {
    expect(channelPageSchema.safeParse({ ...page, messages: undefined }).success).toBe(false);
    const noId = { ...message, id: undefined };
    expect(channelPageSchema.safeParse({ ...page, messages: [noId] }).success).toBe(false);
  });
});

describe('a message’s reads', () => {
  it('read with the time, unread without; an unknown role reads as unknown', () => {
    const reads = {
      read: [{ name: 'أبرار', role: 'teacher', at: '2026-10-27T10:01:00.000Z' }],
      unread: [{ name: 'سلمى', role: 'parent' }],
    };
    expect(channelReadsSchema.parse(reads).unread).toEqual([{ name: 'سلمى', role: 'unknown' }]);
    expect(channelReadsSchema.safeParse({ read: [] }).success).toBe(false);
  });
});
