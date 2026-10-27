import { describe, expect, it } from 'vitest';
import { isUnavailableMessage, isUnsupportedMessage, reactionText } from './unavailable.js';

const unsupported = (errors: unknown) => ({ type: 'unsupported', errors, unsupported: { type: 'unknown' } });

describe('isUnavailableMessage', () => {
  it('is Meta’s 131060 on an unsupported message (the code as a number or as text)', () => {
    expect(isUnavailableMessage(unsupported([{ code: 131060, title: 'This message is unavailable' }]))).toBe(true);
    expect(isUnavailableMessage(unsupported([{ code: '131060' }]))).toBe(true);
  });

  it('is false for another error, no errors, another type or no payload', () => {
    expect(isUnavailableMessage(unsupported([{ code: 131051 }]))).toBe(false);
    expect(isUnavailableMessage(unsupported([]))).toBe(false);
    expect(isUnavailableMessage(unsupported(undefined))).toBe(false);
    expect(isUnavailableMessage({ type: 'reaction', errors: [{ code: 131060 }] })).toBe(false);
    expect(isUnavailableMessage(null)).toBe(false);
    expect(isUnavailableMessage('unsupported')).toBe(false);
  });
});

describe('isUnsupportedMessage', () => {
  it('is Meta’s unsupported only, never a location, contact card or reaction that did arrive', () => {
    expect(isUnsupportedMessage(unsupported([{ code: 131051 }]))).toBe(true);
    expect(isUnsupportedMessage({ type: 'location', location: { latitude: 1, longitude: 2 } })).toBe(false);
    expect(isUnsupportedMessage({ type: 'contacts' })).toBe(false);
    expect(isUnsupportedMessage(null)).toBe(false);
  });
});

describe('reactionText', () => {
  const words = { reacted: 'تفاعل: {emoji}', removed: 'أُزيل التفاعل' };
  const reaction = (emoji?: string) => ({ type: 'reaction', reaction: { message_id: 'wamid.x', ...(emoji === undefined ? {} : { emoji }) } });

  it('names the emoji of a reaction row, and its removal (empty or missing emoji)', () => {
    expect(reactionText(reaction('👍🏻'), words)).toBe('تفاعل: 👍🏻');
    expect(reactionText(reaction(''), words)).toBe('أُزيل التفاعل');
    expect(reactionText(reaction(), words)).toBe('أُزيل التفاعل');
  });

  it('is null for anything that is not a reaction', () => {
    expect(reactionText(unsupported([{ code: 131051 }]), words)).toBeNull();
    expect(reactionText({ type: 'location' }, words)).toBeNull();
    expect(reactionText(null, words)).toBeNull();
  });
});
