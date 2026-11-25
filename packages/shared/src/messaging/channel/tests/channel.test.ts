import { describe, expect, it } from 'vitest';
import {
  CHANNEL_BODY_MAX,
  channelClosedReason,
  channelEditSchema,
  channelPageQuerySchema,
  channelPostSchema,
} from '../channel';

const ID = 'a1000000-0000-4000-8000-000000000001';
const photo = { path: 'c1/x.jpg', mime: 'image/jpeg', size: 1000, name: 'صورة.jpg' };

describe('student channel schemas (docs/31 §2)', () => {
  it('a body is trimmed text of 1..2000 characters', () => {
    expect(channelPostSchema.parse({ body: '  السلام عليكم  ' })).toEqual({ body: 'السلام عليكم' });
    expect(channelPostSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(channelPostSchema.safeParse({ body: 'x'.repeat(CHANNEL_BODY_MAX) }).success).toBe(true);
    expect(channelPostSchema.safeParse({ body: 'x'.repeat(CHANNEL_BODY_MAX + 1) }).success).toBe(false);
    expect(channelPostSchema.safeParse({}).success).toBe(false);
  });

  it('a page goes back by an ISO instant, or starts at the newest', () => {
    expect(channelPageQuerySchema.parse({})).toEqual({});
    expect(channelPageQuerySchema.parse({ before: '2026-10-27T10:00:00.000Z' }).before).toBe('2026-10-27T10:00:00.000Z');
    expect(channelPageQuerySchema.safeParse({ before: 'yesterday' }).success).toBe(false);
  });

  it('a file alone posts with an empty caption; a reply and the client id are uuids', () => {
    expect(channelPostSchema.parse({ attachment: photo, client_id: ID })).toEqual({
      body: '',
      attachment: photo,
      client_id: ID,
    });
    expect(channelPostSchema.safeParse({ body: 'نعم', reply_to_id: ID }).success).toBe(true);
    expect(channelPostSchema.safeParse({ body: 'نعم', reply_to_id: 'm1' }).success).toBe(false);
    expect(channelPostSchema.safeParse({ body: 'نعم', client_id: 'x' }).success).toBe(false);
    expect(channelPostSchema.safeParse({ body: '  ', attachment: undefined }).success).toBe(false);
  });

  it('an edit is text only, 1..2000 after trimming', () => {
    expect(channelEditSchema.parse({ body: ' نص ' })).toEqual({ body: 'نص' });
    expect(channelEditSchema.safeParse({ body: '  ' }).success).toBe(false);
  });
});

describe('channelClosedReason', () => {
  const staff = { family: false, familyChatOn: false };
  it('before the subscription first, then no teacher; open → null', () => {
    expect(channelClosedReason({ status: 'trial', teacher_id: null }, staff)).toBe('not_subscribed');
    expect(channelClosedReason({ status: 'active', teacher_id: null }, staff)).toBe('no_teacher');
    expect(channelClosedReason({ status: 'active', teacher_id: 't1' }, staff)).toBeNull();
  });

  it('a family viewer with family chat off: family_chat_off before anything else', () => {
    const family = { family: true, familyChatOn: false };
    expect(channelClosedReason({ status: 'active', teacher_id: 't1' }, family)).toBe(
      'family_chat_off',
    );
    const on = { family: true, familyChatOn: true };
    expect(channelClosedReason({ status: 'new', teacher_id: 't1' }, on)).toBe('not_subscribed');
  });
});
