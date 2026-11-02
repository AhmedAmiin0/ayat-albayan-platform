import { describe, expect, it } from 'vitest';
import { isPayloadOfType, payloadOfType, payloadTypeOf } from './interactive-payload.js';

describe('payloadTypeOf', () => {
  it('the string type of an object payload', () => {
    expect(payloadTypeOf({ type: 'image', image: {} })).toBe('image');
    expect(payloadTypeOf({ type: '' })).toBe('');
  });

  it('null for anything else', () => {
    expect(payloadTypeOf(null)).toBeNull();
    expect(payloadTypeOf('image')).toBeNull();
    expect(payloadTypeOf([{ type: 'image' }])).toBeNull();
    expect(payloadTypeOf({ type: 3 })).toBeNull();
    expect(payloadTypeOf({})).toBeNull();
  });
});

describe('payloadOfType / isPayloadOfType', () => {
  it('matches exactly that type and keeps the other keys', () => {
    expect(payloadOfType('reaction').parse({ type: 'reaction', reaction: { emoji: '👍' } })).toEqual({
      type: 'reaction',
      reaction: { emoji: '👍' },
    });
    expect(isPayloadOfType({ type: 'unsupported' }, 'unsupported')).toBe(true);
    expect(isPayloadOfType({ type: 'text' }, 'unsupported')).toBe(false);
    expect(isPayloadOfType(undefined, 'unsupported')).toBe(false);
  });
});
