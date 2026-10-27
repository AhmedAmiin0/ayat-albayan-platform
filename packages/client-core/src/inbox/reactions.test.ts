import type { MessageView } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { patchMessage, reactionPath, reactionPill, reactorLines, tappedReaction, withOurs } from './reactions.js';

const R = { theirs: '❤️', ours: '👍', ours_by: 'هبة' };
const msg = (id: string) => ({ id, body: id }) as unknown as MessageView;

describe('reactions (client-core)', () => {
  it('the path escapes the phone', () => {
    expect(reactionPath('+966501234567', 'm1')).toBe('/threads/%2B966501234567/messages/m1/reaction');
  });

  it('a tap on ours removes it, any other replaces it', () => {
    expect(tappedReaction(R, '👍')).toBeNull();
    expect(tappedReaction(R, '😂')).toBe('😂');
    expect(tappedReaction(undefined, '🙏')).toBe('🙏');
  });

  it('withOurs keeps theirs and names who reacted; a removal drops the name', () => {
    expect(withOurs(R, { emoji: '😂', by: 'سارة' })).toEqual({ theirs: '❤️', ours: '😂', ours_by: 'سارة' });
    expect(withOurs(R, { emoji: null, by: 'سارة' })).toEqual({ theirs: '❤️', ours: null, ours_by: null });
    expect(withOurs(undefined, { emoji: '👍', by: null })).toEqual({ theirs: null, ours: '👍', ours_by: null });
  });

  it('the pill: theirs then ours, the same emoji counted twice, none = no pill', () => {
    expect(reactionPill(R)).toEqual([{ emoji: '❤️', count: 1 }, { emoji: '👍', count: 1 }]);
    expect(reactionPill({ theirs: '👍', ours: '👍', ours_by: null })).toEqual([{ emoji: '👍', count: 2 }]);
    expect(reactionPill({ theirs: null, ours: null, ours_by: null })).toEqual([]);
    expect(reactionPill(undefined)).toEqual([]);
  });

  it('who reacted: the contact first, then ours (removable)', () => {
    expect(reactorLines(R, 'أم ياسمين')).toEqual([
      { emoji: '❤️', name: 'أم ياسمين', mine: false },
      { emoji: '👍', name: 'هبة', mine: true },
    ]);
    expect(reactorLines({ theirs: null, ours: '👍', ours_by: null }, null)).toEqual([{ emoji: '👍', name: null, mine: true }]);
  });

  it('patchMessage replaces one message in its page only', () => {
    const pages = [{ messages: [msg('a'), msg('b')] }, { messages: [msg('c')] }];
    const out = patchMessage(pages, 'b', { reactions: R });
    expect(out[0]?.messages[1]).toMatchObject({ id: 'b', reactions: R });
    expect(out[1]).toBe(pages[1]);
  });
});
