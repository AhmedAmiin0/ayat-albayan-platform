import { describe, expect, it } from 'vitest';
import {
  canReact,
  isReactionEmoji,
  isReactionPayload,
  nextReaction,
  reactionRef,
  reactionTooOld,
  REACTION_EMOJIS,
  threadReactionSchema,
} from './reactions.js';

const NOW = new Date('2026-10-27T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();
const OPEN = { reactable: true, session_open: true };

describe('isReactionEmoji', () => {
  it('takes every quick-row emoji, a ZWJ sequence, a skin tone and a flag', () => {
    for (const e of [...REACTION_EMOJIS, '👨‍👩‍👧', '👍🏽', '🇸🇦']) expect(isReactionEmoji(e)).toBe(true);
  });

  it('refuses text, spaces, empty and too long', () => {
    for (const e of ['', 'ok', 'تمام', '👍 ', ' 👍', 'a👍', '👍'.repeat(17)]) expect(isReactionEmoji(e)).toBe(false);
  });
});

describe('threadReactionSchema', () => {
  const id = '6f1c5b8e-6a52-4c3e-9a3a-1d2b3c4d5e6f';
  it('takes an emoji or null with a request id', () => {
    expect(threadReactionSchema.safeParse({ emoji: '❤️', clientRequestId: id }).success).toBe(true);
    expect(threadReactionSchema.safeParse({ emoji: null, clientRequestId: id }).success).toBe(true);
  });
  it('refuses text and a missing request id', () => {
    expect(threadReactionSchema.safeParse({ emoji: 'hi', clientRequestId: id }).success).toBe(false);
    expect(threadReactionSchema.safeParse({ emoji: '👍' }).success).toBe(false);
  });
});

describe('reactionRef / isReactionPayload', () => {
  it('reads the target wamid and the emoji; an empty emoji is a removal', () => {
    expect(reactionRef({ type: 'reaction', reaction: { message_id: 'wamid.A', emoji: '👍' } })).toEqual({ messageId: 'wamid.A', emoji: '👍' });
    expect(reactionRef({ type: 'reaction', reaction: { message_id: 'wamid.A', emoji: '' } })).toEqual({ messageId: 'wamid.A', emoji: null });
    expect(reactionRef({ type: 'reaction', reaction: { message_id: 'wamid.A' } })).toEqual({ messageId: 'wamid.A', emoji: null });
  });

  it('is null without a target or for another type', () => {
    expect(reactionRef({ type: 'reaction', reaction: { emoji: '👍' } })).toBeNull();
    expect(reactionRef({ type: 'reaction' })).toBeNull();
    expect(reactionRef({ type: 'image', image: {} })).toBeNull();
    expect(reactionRef(null)).toBeNull();
    expect(isReactionPayload({ type: 'reaction' })).toBe(true);
    expect(isReactionPayload({ type: 'call_permission_request' })).toBe(false);
  });
});

describe('nextReaction', () => {
  it('taps our current emoji off, any other on', () => {
    expect(nextReaction('👍', '👍')).toBeNull();
    expect(nextReaction('👍', '❤️')).toBe('❤️');
    expect(nextReaction(null, '🙏')).toBe('🙏');
  });
});

describe('canReact', () => {
  const m = { replyable: true, created_at: daysAgo(1) };
  it('is true for a WhatsApp message within 30 days in an open, reactable chat', () => {
    expect(canReact(m, OPEN, NOW)).toBe(true);
    expect(canReact({ ...m, created_at: daysAgo(30) }, OPEN, NOW)).toBe(true);
  });

  it('is false when not reactable, closed, without a wamid, too old or without a thread', () => {
    expect(canReact(m, { ...OPEN, reactable: false }, NOW)).toBe(false);
    expect(canReact(m, { session_open: true }, NOW)).toBe(false);
    expect(canReact(m, { ...OPEN, session_open: false }, NOW)).toBe(false);
    expect(canReact({ ...m, replyable: false }, OPEN, NOW)).toBe(false);
    expect(canReact({ ...m, created_at: daysAgo(31) }, OPEN, NOW)).toBe(false);
    expect(canReact(m, null, NOW)).toBe(false);
    expect(reactionTooOld(daysAgo(31), NOW)).toBe(true);
  });
});
