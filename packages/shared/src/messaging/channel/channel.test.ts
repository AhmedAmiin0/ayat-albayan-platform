import { describe, expect, it } from 'vitest';
import { CHANNEL_BODY_MAX, channelPageQuerySchema, channelPostSchema } from './channel.js';

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
});
