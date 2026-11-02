import { describe, expect, it } from 'vitest';
import { cacheMessageSchema, parseStored } from './cache-store';

// docs/36 z9: stored entries and invalidation messages are parsed by schema; bad ones are a miss.

describe('parseStored', () => {
  it('an entry with a numeric at and any v (null included) is a hit', () => {
    expect(parseStored('{"at":5,"v":{"a":1}}')).toEqual({ at: 5, v: { a: 1 } });
    expect(parseStored('{"at":5,"v":null}')).toEqual({ at: 5, v: null });
  });

  it.each(['', 'x', 'null', '[]', '"s"', '{"v":1}', '{"at":"5","v":1}', '{"at":5}'])(
    '%j is a miss',
    (raw) => {
      expect(parseStored(raw)).toBeNull();
    },
  );
});

describe('cacheMessageSchema', () => {
  it('reads the topic and the origin', () => {
    const parsed = cacheMessageSchema.parse('{"origin":"o1","topic":"settings"}');
    expect(parsed).toMatchObject({ origin: 'o1', topic: 'settings' });
  });

  it('a message without an origin still counts (as before z9)', () => {
    expect(cacheMessageSchema.parse('{"topic":"settings"}')).toEqual({ topic: 'settings' });
    expect(cacheMessageSchema.safeParse('{"topic":""}').success).toBe(true);
  });

  it.each(['x', 'null', '5', '{"origin":"o1"}', '{"topic":7}'])('%j is ignored', (raw) => {
    expect(cacheMessageSchema.safeParse(raw).success).toBe(false);
  });
});
