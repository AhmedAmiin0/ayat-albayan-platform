import { describe, expect, it } from 'vitest';
import type { ChannelPage } from '../channel-views.js';
import { channelPageSchema, channelReadsSchema, channelSeatSchema } from '../channel.schemas.js';

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
  participants: [
    { name: 'أبرار', role: 'teacher', me: false },
    { name: 'أم سلمى', role: 'guardian', me: true },
  ],
  my_last_read_at: '2026-10-27T10:00:00.123456+00:00',
};

/** What the API answered before files, replies and read ticks. */
const oldPage = {
  ...page,
  ...{ messages: [message], closed_reason: undefined },
  ...{ participants: undefined, my_last_read_at: undefined },
};

describe('a thread page as the apps read it (docs/31 §2)', () => {
  it('reads the API answer as it is', () => {
    expect(channelPageSchema.parse(page)).toEqual(page);
  });

  it('reads the owning assistant’s message (owner 2026-11-16 «yes it can write also»)', () => {
    const sales = { ...page.messages[0], sender_role: 'sales' };
    expect(channelPageSchema.safeParse({ ...page, messages: [sales] }).success).toBe(true);
  });

  it('one sales row and one unknown role never fail the page (review finding 1)', () => {
    const rows = [{ ...message, id: 'a', sender_role: 'sales' }, { ...message, id: 'b', sender_role: 'x' }];
    const parsed = channelPageSchema.safeParse({ ...page, messages: rows });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.messages.map((m) => m.sender_role)).toEqual(['sales', 'unknown']);
  });

  it('an older API: every new field gets its default (text, no file, no quote, not read)', () => {
    const parsed = channelPageSchema.parse(oldPage);
    expect(parsed.closed_reason).toBeNull();
    expect([parsed.participants, parsed.my_last_read_at]).toEqual([[], null]);
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

  it('participants: an unknown role reads as unknown, a malformed list as none', () => {
    const odd = [{ name: 'منى', role: 'supervisor', me: 'yes' }];
    const parsed = channelPageSchema.parse({ ...page, participants: odd, my_last_read_at: 5 });
    expect(parsed.participants).toEqual([{ name: 'منى', role: 'unknown', me: false }]);
    expect(parsed.my_last_read_at).toBeNull();
    expect(channelPageSchema.parse({ ...page, participants: 'x' }).participants).toEqual([]);
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

// Only one assistant holds the seat: the seat answer, a name only.
describe('the assistant seat as the apps read it', () => {
  const held = { holder: { id: 'p1', name: 'سارة' }, mine: false, bringer: false, canTake: false };

  it('reads a held seat and a free one', () => {
    expect(channelSeatSchema.parse(held)).toEqual(held);
    const free = { ...held, holder: null, canTake: true };
    expect(channelSeatSchema.parse(free)).toEqual(free);
  });

  it('drops anything but the name, refuses a missing flag', () => {
    const phone = { ...held, holder: { ...held.holder, phone: '+966500000000' } };
    expect(channelSeatSchema.parse(phone).holder).toEqual(held.holder);
    expect(channelSeatSchema.safeParse({ ...held, canTake: undefined }).success).toBe(false);
  });
});
