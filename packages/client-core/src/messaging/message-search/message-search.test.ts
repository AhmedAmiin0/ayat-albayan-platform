import { describe, expect, it, vi } from 'vitest';
import { messageHits, messageSearchKey, messageSearchPages, messageSearchPath } from './message-search.js';

const ID = 'b1111111-1111-4111-8111-111111111111';
const HIT = {
  id: ID,
  created_at: '2026-10-01T09:30:00.123456+00:00',
  snippet: 'درس اليوم',
  phone_e164: '+966500000001',
  display_name: 'ولي أمر',
};

describe('messageSearchPath / key', () => {
  it('encodes the words; the cursor only when given; the key sits under threads', () => {
    expect(messageSearchPath('درس 50%')).toBe(`/threads/search?q=${encodeURIComponent('درس')}+50%25`);
    expect(messageSearchPath('abc', 'c_1')).toBe('/threads/search?q=abc&cursor=c_1');
    expect(messageSearchKey('abc')).toEqual(['threads', 'message-search', 'abc']);
  });
});

describe('messageSearchPages', () => {
  it('is enabled only from 3 folded characters', () => {
    const get = vi.fn();
    expect(messageSearchPages('اَبْ', get).enabled).toBe(false);
    expect(messageSearchPages('درس', get).enabled).toBe(true);
    expect(messageSearchPages('درس', get).staleTime).toBe(30_000);
  });

  it('asks per cursor, parses the page and pages on until a null cursor', async () => {
    const get = vi.fn().mockResolvedValue({ items: [HIT], next_cursor: 'n' });
    const o = messageSearchPages('درس', get);
    const page = await o.queryFn({ pageParam: 'c_1' });
    expect(get).toHaveBeenCalledWith(messageSearchPath('درس', 'c_1'));
    expect(o.getNextPageParam(page)).toBe('n');
    expect(o.getNextPageParam({ items: [], next_cursor: null })).toBeUndefined();
    expect(messageHits([page, page])).toHaveLength(2);
    expect(messageHits(undefined)).toEqual([]);
  });

  it('a malformed answer surfaces as an error', async () => {
    const get = vi.fn().mockResolvedValue({ items: [{ id: 'x' }], next_cursor: null });
    await expect(messageSearchPages('درس', get).queryFn({ pageParam: undefined })).rejects.toThrow();
  });
});
