import { describe, expect, it } from 'vitest';
import { reactionRef } from '../reactions/reactions.js';
import { adWelcomeOf, chatMarkerOf, isHiddenPayload, markerPayload } from './chat-markers.js';

const ORIGINAL = 'wamid.HBgMOTY2NTAwMDAwMDAxFQIAERgSQUJDREVGMDEyMzQ1Njc4OQA=';

describe('chatMarkerOf', () => {
  it('reads an edit: the original wamid and the new text', () => {
    const edit = {
      type: 'edit',
      edit: {
        original_message_id: ORIGINAL,
        message: { type: 'text', text: { body: 'موعدنا 5' } },
      },
    };
    expect(chatMarkerOf(edit)).toEqual({
      type: 'edit',
      target: ORIGINAL,
      text: 'موعدنا 5',
      emoji: null,
    });
  });

  it('reads an edited caption, and a flat edit shape', () => {
    const caption = {
      type: 'edit',
      edit: { message_id: ORIGINAL, message: { type: 'image', image: { caption: 'الواجب' } } },
    };
    expect(chatMarkerOf(caption)?.text).toBe('الواجب');
    expect(chatMarkerOf({ type: 'edit', edit: { id: ORIGINAL, text: { body: 'تم' } } })?.text).toBe(
      'تم',
    );
  });

  it('falls back to context.id when the edit part names no message', () => {
    const edit = {
      type: 'edit',
      context: { id: ORIGINAL },
      edit: { message: { text: { body: 'x' } } },
    };
    expect(chatMarkerOf(edit)?.target).toBe(ORIGINAL);
  });

  it('reads a revoke', () => {
    const revoke = { type: 'revoke', revoke: { original_message_id: ORIGINAL } };
    expect(chatMarkerOf(revoke)).toEqual({
      type: 'revoke',
      target: ORIGINAL,
      text: null,
      emoji: null,
    });
  });

  it('reads a reaction, and an empty emoji as a removal', () => {
    const on = { type: 'reaction', reaction: { message_id: ORIGINAL, emoji: '👍' } };
    expect(chatMarkerOf(on)).toEqual({
      type: 'reaction',
      target: ORIGINAL,
      text: null,
      emoji: '👍',
    });
    const off = { type: 'reaction', reaction: { message_id: ORIGINAL, emoji: '' } };
    expect(chatMarkerOf(off)?.emoji).toBeNull();
  });

  it('keeps a marker that names no target (applied to nothing, still never a bubble)', () => {
    expect(chatMarkerOf({ type: 'revoke', revoke: {} })).toEqual({
      type: 'revoke',
      target: null,
      text: null,
      emoji: null,
    });
  });

  it('is null for an ordinary message or a non-object', () => {
    for (const m of [{ type: 'text', text: { body: 'hi' } }, { type: 'image' }, null, 'edit', {}]) {
      expect(chatMarkerOf(m)).toBeNull();
    }
  });
});

describe('markerPayload', () => {
  it('stores edits and revokes with their target', () => {
    expect(markerPayload({ type: 'edit', target: ORIGINAL, text: 'new', emoji: null })).toEqual({
      type: 'edit',
      marker: true,
      target: ORIGINAL,
      text: 'new',
    });
    expect(markerPayload({ type: 'revoke', target: ORIGINAL, text: null, emoji: null })).toEqual({
      type: 'revoke',
      marker: true,
      target: ORIGINAL,
    });
  });

  it("keeps Meta's reaction shape so reactionRef reads it", () => {
    const p = markerPayload({ type: 'reaction', target: ORIGINAL, text: null, emoji: '❤️' });
    expect(reactionRef(p)).toEqual({ messageId: ORIGINAL, emoji: '❤️' });
    const off = markerPayload({ type: 'reaction', target: ORIGINAL, text: null, emoji: null });
    expect(reactionRef(off)).toEqual({ messageId: ORIGINAL, emoji: null });
  });
});

describe('isHiddenPayload', () => {
  it('hides edits, revokes and reactions only', () => {
    for (const type of ['edit', 'revoke', 'reaction']) expect(isHiddenPayload({ type })).toBe(true);
    for (const p of [{ type: 'image' }, { type: 'errors' }, null, undefined])
      expect(isHiddenPayload(p)).toBe(false);
  });
});

describe('adWelcomeOf', () => {
  it("reads the ad's welcome text from Meta's referral, Kapso's block or a stored payload", () => {
    const welcome = { text: 'أهلًا بك في أكاديمية آيات البيان' };
    expect(adWelcomeOf({ referral: { welcome_message: welcome } })).toBe(welcome.text);
    expect(adWelcomeOf({ kapso: { referral: { welcome_message: welcome } } })).toBe(welcome.text);
    expect(adWelcomeOf({ type: 'errors', welcome: welcome.text })).toBe(welcome.text);
    expect(adWelcomeOf({ type: 'errors', welcome: null })).toBeNull();
  });
});
